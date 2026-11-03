import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector3,
  type PerspectiveCamera,
} from "three";
import { WEAK_DEFLECTION_SERIES } from "@/lib/astro/photonGeodesic";
import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { spectralColor, type SpectralClass } from "@/lib/astro/starMap";
import type { Uniform } from "./materials";
import { clamp } from "./math";
import { OUTPUT } from "./shaders";

/*
 * Fond étoilé de l'onglet « Tailles » : un triangle plein écran, dessiné avant tout le reste, qui calcule le ciel dans la
 * direction de chaque pixel. Les trous noirs dessinés la dévient (lentille faible) ; le rectangle de chacun reprend la
 * même fonction de ciel et les mêmes uniformes (STARFIELD_GLSL), lentilles comprises, si bien que son ciel se raccorde
 * sans couture à son bord. L'orientation de la caméra des tailles ne change jamais : sans trou noir, le ciel reste fixe
 * à l'écran, comme des étoiles à l'infini.
 *
 * Les étoiles sont semées sur les six faces d'un cube : chaque face est une grille de cellules, chaque cellule porte au
 * plus une étoile, placée et colorée par un hachage entier (PCG, sans perte de précision des flottants). Un pixel ne
 * regarde que les quatre cellules les plus proches : une étoile peut tomber n'importe où dans la sienne, sans grille
 * visible. La probabilité d'une étoile suit l'angle solide de sa cellule (la densité est uniforme sur le ciel) ; une
 * marge aux arêtes du cube évite qu'une étoile y soit coupée. Chaque étoile est un point gaussien de 0,6 px CSS d'écart
 * type ; quand la lentille l'étire (empreinte du pixel plus grande), elle s'étale et pâlit d'autant : son flux est
 * conservé, les images serrées contre l'ombre s'estompent.
 */

/** Ordre de dessin du fond étoilé : avant tout le reste. */
export const STARFIELD_RENDER_ORDER = -1000;

/** Ciel de nuit du site (--nuit), tel qu'il doit sortir à l'écran. */
const NIGHT = "#060b18";

/** Coude de la compression de PBR Neutral (`StartCompression`), en linéaire : en deçà, la courbe retranche un décalage. */
const NEUTRAL_START_COMPRESSION = 0.8 - 0.04;

/** Trous noirs qui tordent le fond, au plus. */
export const MAX_STARFIELD_LENSES = 4;

/**
 * Uniformes du ciel, partagés (mêmes objets) par le fond et par chaque trou noir : même ciel, mêmes lentilles, sans
 * couture. Les lentilles sont écrites par `setLenses` ; chaque trou noir applique à son ciel celles des autres.
 */
export interface StarfieldUniforms {
  /** Angle sous-tendu par un px CSS au centre de l'image, en radians : rayon des points d'étoile. */
  uPixelAngle: Uniform<number>;
  /** Éclat d'ensemble des étoiles (linéaire) ; 0 : nuit unie. */
  uStarfieldGain: Uniform<number>;
  /** Nuit avant tone mapping : sa sortie à l'écran vaut exactement --nuit (#060B18). */
  uNight: Uniform<Color>;
  /** Caméra dans le repère de chaque trou noir qui dévie le ciel, en r_s (MAX_STARFIELD_LENSES au plus). */
  uLensCamera: Uniform<Vector3[]>;
  /** Force de chaque lentille, de 0 à 1 : l'opacité de son trou noir. */
  uLensStrength: Uniform<Float32Array>;
  /** Lentilles en service. */
  uLensCount: Uniform<number>;
}

/**
 * Part de chaque classe spectrale parmi les étoiles du ciel, ordre de grandeur des étoiles visibles à l'œil nu : les
 * géantes K et les étoiles A dominent, les O sont rares. Couleurs : celles du design system (spectralColor).
 */
export const STAR_CLASS_SHARES: Readonly<Record<SpectralClass, number>> = {
  O: 0.01,
  B: 0.1,
  A: 0.22,
  F: 0.19,
  G: 0.14,
  K: 0.27,
  M: 0.07,
};

/**
 * Couches d'étoiles (réglage) : cellules par côté de face, part des cellules qui portent une étoile (au centre d'une face ;
 * moins vers les coins, en proportion de l'angle solide), éclat de crête linéaire de la plus pâle à la plus vive
 * (jamais au-delà de 0,6 : aucun blanc saturé), exposant de la loi d'éclat (grand : surtout des pâles), et part d'un
 * halo large (quatre fois le point), qui fait luire les plus vives comme sur une photographie. En 1 440 × 900,
 * environ 450 étoiles faibles et une vingtaine de vives.
 */
export const STAR_LAYERS = [
  { cells: 52, presence: 1, peak: [0.05, 0.3], power: 2.2, halo: 0 },
  { cells: 14, presence: 0.6, peak: [0.3, 0.6], power: 1.5, halo: 0.05 },
] as const;

/** Écart type d'un point d'étoile, en empreintes de pixel (au moins un px CSS). */
const SKY_POINT_SIGMA = 0.7;
/** Écart type du halo, en écarts types du point. */
const SKY_HALO_SCALE = 4;

/** Marge aux arêtes du cube, en coordonnées de face : aucune étoile n'y est coupée. */
const SKY_EDGE = 0.03;

/** Nombre GLSL flottant, neuf chiffres significatifs (« 2.00000000 », « 0.0420481691 »). */
const glslNumber = (value: number) => value.toPrecision(9);

/** Couleur linéaire GLSL d'une couleur sRGB « #rrggbb » du design system. */
function glslColor(srgb: string): string {
  const linear = new Color(srgb);
  return `vec3(${[linear.r, linear.g, linear.b].map(glslNumber).join(", ")})`;
}

/** Choix d'une classe par tirage uniforme : seuils cumulés des parts, de O à M. */
function starColorGlsl(): string {
  const classes = Object.keys(STAR_CLASS_SHARES) as SpectralClass[];
  let cumulated = 0;
  const lines = classes.slice(0, -1).map((spectral) => {
    cumulated += STAR_CLASS_SHARES[spectral];
    return `  if (pick < ${glslNumber(cumulated)}) return ${glslColor(spectralColor(spectral))};`;
  });
  const last = classes[classes.length - 1];
  return [...lines, `  return ${glslColor(spectralColor(last))};`].join("\n");
}

/** Appel GLSL de la couche `index` de STAR_LAYERS. */
function skyLayerCall(index: number): string {
  const layer = STAR_LAYERS[index];
  return (
    `skyLayer(dir, face, uv, ${glslNumber(layer.cells)}, ${index}u, ${glslNumber(layer.presence)}, ` +
    `vec2(${glslNumber(layer.peak[0])}, ${glslNumber(layer.peak[1])}), ${glslNumber(layer.power)}, ` +
    `${glslNumber(layer.halo)}, sigma, energy)`
  );
}

/**
 * Chunk GLSL, à inclure une fois par programme : déclare uPixelAngle, uStarfieldGain, uNight, les lentilles
 * (uLensCamera, uLensStrength, uLensCount) et
 * - `vec3 starfield(vec3 dir, float footprint)` : lumière linéaire du ciel, nuit comprise, dans la direction unitaire `dir`
 *   du repère du monde, pour une empreinte de pixel `footprint` en radians (au moins uPixelAngle) ;
 * - `float weakDeflection(float b, float s)` : déviation de champ faible (rad) d'un rayon de paramètre d'impact b, la
 *   caméra en s le long du rayon, r_s = 1 : α = α∞(b)/2 × (1 − s/√(s² + b²)), série α∞ de photonGeodesic.ts ;
 * - `vec3 weakLens(vec3 dir, vec3 cameraLocal, float strength)` : `dir` tournée vers le centre du trou noir de
 *   strength × α, la caméra en `cameraLocal` dans son repère, en r_s, paramètre d'impact de l'observateur immobile
 *   (b = |c × d| / √(1 − 1/D), borné à l'ombre : sous elle, le rectangle recouvre) ;
 * - `vec3 lensSky(vec3 dir, vec3 exclude)` : `dir` déviée par les lentilles en service, dans l'ordre, sauf celle dont la
 *   caméra vaut `exclude` (le trou noir qui trace la sienne) ; vec3(0.0) : toutes.
 * Aucune dérivée : les fonctions servent aussi dans les boucles du tracé.
 */
export const STARFIELD_GLSL = /* glsl */ `
uniform float uPixelAngle;
uniform float uStarfieldGain;
uniform vec3 uNight;
uniform vec3 uLensCamera[${MAX_STARFIELD_LENSES}];
uniform float uLensStrength[${MAX_STARFIELD_LENSES}];
uniform int uLensCount;
const float SKY_INV_2_32 = 2.32830644e-10;
const float SKY_EDGE = ${glslNumber(SKY_EDGE)};
const float SKY_POINT_SIGMA = ${glslNumber(SKY_POINT_SIGMA)};
const float SKY_HALO_SCALE = ${glslNumber(SKY_HALO_SCALE)};
const float LENS_MIN_IMPACT = ${glslNumber(SHADOW_RADIUS_RS)};
// Hachage entier PCG 3D (Jarzynski et Olano 2020) : trois entiers indépendants par cellule.
uvec3 skyHash(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}
// Couleur linéaire d'une étoile tirée au hasard (pick dans [0, 1[), parts des classes de O à M.
vec3 skyStarColor(float pick) {
${starColorGlsl()}
}
// Direction unitaire du point uv (−1..1) de la face « face » du cube, réciproque du choix de face de starfield().
vec3 skyFaceDirection(int face, vec2 uv) {
  vec3 d;
  if (face == 0) d = vec3(1.0, uv);
  else if (face == 1) d = vec3(-1.0, uv);
  else if (face == 2) d = vec3(uv.x, 1.0, uv.y);
  else if (face == 3) d = vec3(uv.x, -1.0, uv.y);
  else if (face == 4) d = vec3(uv, 1.0);
  else d = vec3(uv, -1.0);
  return normalize(d);
}
// Une couche d’étoiles : les quatre cellules les plus proches du point uv de la face ; halo : part du halo large.
vec3 skyLayer(vec3 dir, int face, vec2 uv, float cells, uint layer, float presence, vec2 peak, float power, float halo, float sigma, float energy) {
  vec2 base = floor((uv * 0.5 + 0.5) * cells - 0.5);
  vec3 light = vec3(0.0);
  for (int k = 0; k < 4; k++) {
    vec2 cell = base + vec2(float(k & 1), float(k >> 1));
    if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= cells || cell.y >= cells) continue;
    uvec3 h = skyHash(uvec3(uint(cell.x), uint(cell.y), uint(face) * 2u + layer));
    vec3 r = vec3(h) * SKY_INV_2_32;
    vec2 star = (cell + r.xy) / cells * 2.0 - 1.0;
    float spread = 1.0 + dot(star, star);
    // Angle solide de la cellule : densité uniforme sur le ciel ; marge aux arêtes du cube.
    if (r.z * spread * sqrt(spread) >= presence || max(abs(star.x), abs(star.y)) > 1.0 - SKY_EDGE) continue;
    vec3 offset = dir - skyFaceDirection(face, star);
    float theta2 = dot(offset, offset);
    float reach = halo > 0.0 ? SKY_HALO_SCALE * sigma : sigma;
    if (theta2 > 25.0 * reach * reach) continue;
    vec3 q = vec3(skyHash(h)) * SKY_INV_2_32;
    float brightness = mix(peak.x, peak.y, pow(q.x, power));
    float profile = exp(-0.5 * theta2 / (sigma * sigma)) + halo * exp(-0.5 * theta2 / (reach * reach));
    light += skyStarColor(q.y) * (brightness * energy * profile);
  }
  return light;
}
vec3 starfield(vec3 dir, float footprint) {
  if (uStarfieldGain <= 0.0) return uNight;
  vec3 a = abs(dir);
  int face;
  vec2 uv;
  if (a.x >= a.y && a.x >= a.z) {
    face = dir.x > 0.0 ? 0 : 1;
    uv = dir.yz / a.x;
  } else if (a.y >= a.z) {
    face = dir.y > 0.0 ? 2 : 3;
    uv = dir.xz / a.y;
  } else {
    face = dir.z > 0.0 ? 4 : 5;
    uv = dir.xy / a.z;
  }
  float sigma = SKY_POINT_SIGMA * footprint;
  // Flux conservé : un point étiré par la lentille s'étale et pâlit d'autant.
  float energy = uPixelAngle * uPixelAngle / (footprint * footprint);
  vec3 light = ${skyLayerCall(0)} + ${skyLayerCall(1)};
  return uNight + uStarfieldGain * light;
}
float weakDeflection(float b, float s) {
  float u = 1.0 / b;
  float total = u * (${glslNumber(WEAK_DEFLECTION_SERIES[0])} + u * (${glslNumber(WEAK_DEFLECTION_SERIES[1])} + u * (${glslNumber(WEAK_DEFLECTION_SERIES[2])} + u * ${glslNumber(WEAK_DEFLECTION_SERIES[3])})));
  float q = sqrt(s * s + b * b);
  float share = s <= 0.0 ? 1.0 - s / q : b * b / (q * (q + s));
  return 0.5 * total * share;
}
vec3 weakLens(vec3 dir, vec3 cameraLocal, float strength) {
  // Du rayon vers le centre du trou noir, perpendiculairement : longueur b sur la droite.
  vec3 toward = dot(cameraLocal, dir) * dir - cameraLocal;
  float line = length(toward);
  if (strength <= 0.0 || line < 1e-6) return dir;
  float dist = length(cameraLocal);
  float b = max(line / sqrt(max(1.0 - 1.0 / dist, 1e-6)), LENS_MIN_IMPACT);
  float alpha = strength * weakDeflection(b, dot(cameraLocal, dir));
  return cos(alpha) * dir + sin(alpha) * (toward / line);
}
vec3 lensSky(vec3 dir, vec3 exclude) {
  for (int i = 0; i < ${MAX_STARFIELD_LENSES}; i++) {
    if (i >= uLensCount) break;
    vec3 gap = uLensCamera[i] - exclude;
    if (dot(gap, gap) <= 1e-8 * dot(exclude, exclude)) continue;
    dir = weakLens(dir, uLensCamera[i], uLensStrength[i]);
  }
  return dir;
}
`;

/** Un trou noir vu par le fond : caméra dans son repère, en r_s (`BlackHoleMesh.cameraLocal`), et force de 0 à 1 (son opacité). */
export interface StarfieldLens {
  cameraLocal: Vector3;
  strength: number;
}

/**
 * Couleur linéaire qui sort en `srgbHex` après PBR Neutral (exposition 1). Sous le coude de la compression (canal le
 * plus fort sous 0,76 en linéaire), Neutral ne fait que retrancher aux trois canaux un même décalage, x − 6,25 x² si le
 * canal minimal x de l'entrée est sous 0,08, 0,04 au-delà : on le rajoute. #060b18 → (0,017070 ; 0,018595 ; 0,024383).
 * Lève une RangeError pour une couleur qui n'est pas « #rrggbb » ou qui dépasse le coude.
 */
export function nightBeforeToneMapping(srgbHex: string): Color {
  if (!/^#[0-9a-f]{6}$/i.test(srgbHex)) throw new RangeError(`Couleur sRGB invalide : ${srgbHex}`);
  // Décodée en linéaire par la gestion des couleurs de three.
  const target = new Color(srgbHex);
  const low = Math.min(target.r, target.g, target.b);
  if (Math.max(target.r, target.g, target.b) >= NEUTRAL_START_COMPRESSION) {
    throw new RangeError(`Couleur au-delà du coude du tone mapping : ${srgbHex}`);
  }
  // Sortie minimale 6,25 x² < 0,04 quand x < 0,08 : x = 0,4 √(sortie).
  const offset = low < 0.04 ? 0.4 * Math.sqrt(low) - low : 0.04;
  return new Color(target.r + offset, target.g + offset, target.b + offset);
}

export interface StarfieldBackground {
  /** Triangle plein écran ; renderOrder STARFIELD_RENDER_ORDER, ni test ni écriture de profondeur, jamais écarté. */
  mesh: Mesh<BufferGeometry, ShaderMaterial>;
  uniforms: StarfieldUniforms;
  /**
   * Avant chaque rendu, matrices de la caméra à jour : directions des pixels (projection inverse, décalage de vue compris,
   * orientation de la caméra) et taille d'un px CSS (`viewHeightCss` : hauteur de la vue en px CSS).
   */
  update(camera: PerspectiveCamera, viewHeightCss: number): void;
  /** Trous noirs dessinés à cette image, les plus grands à l'écran d'abord ; au-delà de MAX_STARFIELD_LENSES, ignorés. */
  setLenses(lenses: readonly StarfieldLens[]): void;
}

/** Uniformes propres au fond : direction des pixels. */
interface BackgroundUniforms {
  uProjectionInverse: Uniform<Matrix4>;
  /** Rotation de la caméra (partie 3 × 3 de sa matrice du monde) : de l'espace vue au monde. */
  uCameraRotation: Uniform<Matrix3>;
}

/**
 * Sommets du triangle déjà en coordonnées de découpe. La projection inverse ramène chacun au plan lointain, en espace
 * vue ; la direction qui en sort varie linéairement à l'écran, l'interpolation la donne donc exacte en chaque pixel.
 * Profondeur au milieu du volume de découpe : rien ne rogne le triangle.
 */
const STARFIELD_VERTEX = /* glsl */ `
uniform mat4 uProjectionInverse;
uniform mat3 uCameraRotation;
varying vec3 vDirection;
void main() {
  vec4 view = uProjectionInverse * vec4(position.xy, 1.0, 1.0);
  vDirection = uCameraRotation * (view.xyz / view.w);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Ciel dévié par toutes les lentilles. L'empreinte des points d'étoile se mesure sur la direction déviée, hors de toute
 * boucle : là où la lentille étire le ciel, les étoiles s'étalent en arcs et pâlissent (de 1 à 4 px CSS).
 */
const STARFIELD_FRAGMENT = /* glsl */ `
precision highp float;
${STARFIELD_GLSL}
varying vec3 vDirection;
void main() {
  vec3 dir = normalize(vDirection);
  vec3 sky = lensSky(dir, vec3(0.0));
  float footprint = clamp(length(fwidth(sky)), uPixelAngle, 4.0 * uPixelAngle);
  gl_FragColor = vec4(starfield(sky, footprint), 1.0);
  ${OUTPUT}
}
`;

/** Angle d'un px CSS avant le premier `update` : environ 1 px à 36° de champ sur 650 px. */
const DEFAULT_PIXEL_ANGLE = 1e-3;

/** Fond étoilé ; `gain` : éclat des étoiles (1 par défaut). La scène l'ajoute et appelle `update` avant chaque rendu. */
export function createStarfieldBackground(options: { gain?: number } = {}): StarfieldBackground {
  const uniforms: StarfieldUniforms = {
    uPixelAngle: { value: DEFAULT_PIXEL_ANGLE },
    uStarfieldGain: { value: options.gain ?? 1 },
    uNight: { value: nightBeforeToneMapping(NIGHT) },
    uLensCamera: { value: Array.from({ length: MAX_STARFIELD_LENSES }, () => new Vector3()) },
    uLensStrength: { value: new Float32Array(MAX_STARFIELD_LENSES) },
    uLensCount: { value: 0 },
  };
  const own: BackgroundUniforms = {
    uProjectionInverse: { value: new Matrix4() },
    uCameraRotation: { value: new Matrix3() },
  };
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const material = new ShaderMaterial({
    uniforms: { ...uniforms, ...own },
    vertexShader: STARFIELD_VERTEX,
    fragmentShader: STARFIELD_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = STARFIELD_RENDER_ORDER;
  mesh.frustumCulled = false;

  return {
    mesh,
    uniforms,
    update(camera, viewHeightCss) {
      own.uProjectionInverse.value.copy(camera.projectionMatrixInverse);
      own.uCameraRotation.value.setFromMatrix4(camera.matrixWorld);
      // Au centre de l'image, la hauteur de la vue couvre 2 / P₁₁ en tangente (zoom et décalage de vue compris).
      uniforms.uPixelAngle.value = 2 / (camera.projectionMatrix.elements[5] * Math.max(1, viewHeightCss));
    },
    setLenses(lenses) {
      const count = Math.min(lenses.length, MAX_STARFIELD_LENSES);
      for (let i = 0; i < count; i++) {
        uniforms.uLensCamera.value[i].copy(lenses[i].cameraLocal);
        uniforms.uLensStrength.value[i] = clamp(lenses[i].strength, 0, 1);
      }
      uniforms.uLensCount.value = count;
    },
  };
}
