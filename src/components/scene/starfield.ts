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
import type { Uniform } from "./materials";
import { clamp } from "./math";
import { OUTPUT } from "./shaders";

/*
 * Fond étoilé de l'onglet « Tailles » : un triangle plein écran, dessiné avant tout le reste, qui calcule le ciel dans la
 * direction de chaque pixel. Les trous noirs dessinés la dévient (lentille faible) ; le rectangle de chacun reprend la
 * même fonction de ciel et les mêmes uniformes (STARFIELD_GLSL), si bien que la lentille se raccorde sans couture à son
 * bord. L'orientation de la caméra des tailles ne change jamais : sans trou noir, le ciel reste fixe à l'écran, comme
 * des étoiles à l'infini. Tant que le ciel procédural n'est pas écrit, `starfield()` rend la nuit seule et rien ne
 * dévie : le fond ne se voit pas, il sort exactement en --nuit.
 */

/** Ordre de dessin du fond étoilé : avant tout le reste. */
export const STARFIELD_RENDER_ORDER = -1000;

/** Ciel de nuit du site (--nuit), tel qu'il doit sortir à l'écran. */
const NIGHT = "#060b18";

/** Coude de la compression de PBR Neutral (`StartCompression`), en linéaire : en deçà, la courbe retranche un décalage. */
const NEUTRAL_START_COMPRESSION = 0.8 - 0.04;

/** Uniformes du ciel, partagés (mêmes objets) par le fond et par chaque trou noir : même ciel, sans couture. */
export interface StarfieldUniforms {
  /** Angle sous-tendu par un px CSS au centre de l'image, en radians : rayon des points d'étoile. */
  uPixelAngle: Uniform<number>;
  /** Éclat d'ensemble des étoiles (linéaire) ; 0 : nuit unie. */
  uStarfieldGain: Uniform<number>;
  /** Nuit avant tone mapping : sa sortie à l'écran vaut exactement --nuit (#060B18). */
  uNight: Uniform<Color>;
}

/**
 * Chunk GLSL, à inclure une fois par programme : déclare uPixelAngle, uStarfieldGain, uNight et
 * - `vec3 starfield(vec3 dir, float footprint)` : lumière linéaire du ciel, nuit comprise, dans la direction unitaire `dir`
 *   du repère du monde, pour une empreinte de pixel `footprint` en radians ;
 * - `float weakDeflection(float b, float s)` : déviation de champ faible (rad) d'un rayon de paramètre d'impact b, la
 *   caméra en s le long du rayon, r_s = 1 : α = α∞(b)/2 × (1 − s/√(s² + b²)) ;
 * - `vec3 weakLens(vec3 dir, vec3 cameraLocal, float strength)` : `dir` tournée vers le centre du trou noir de
 *   strength × α, la caméra en `cameraLocal` dans son repère, en r_s.
 * Pour l'heure, la nuit seule et aucune déviation.
 */
export const STARFIELD_GLSL = /* glsl */ `
uniform float uPixelAngle;
uniform float uStarfieldGain;
uniform vec3 uNight;
vec3 starfield(vec3 dir, float footprint) {
  return uNight;
}
float weakDeflection(float b, float s) {
  return 0.0;
}
vec3 weakLens(vec3 dir, vec3 cameraLocal, float strength) {
  return dir;
}
`;

/** Trous noirs qui tordent le fond, au plus. */
export const MAX_STARFIELD_LENSES = 4;

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

/** Uniformes propres au fond : direction des pixels et trous noirs qui la dévient. */
interface BackgroundUniforms {
  uProjectionInverse: Uniform<Matrix4>;
  /** Rotation de la caméra (partie 3 × 3 de sa matrice du monde) : de l'espace vue au monde. */
  uCameraRotation: Uniform<Matrix3>;
  uLensCamera: Uniform<Vector3[]>;
  uLensStrength: Uniform<Float32Array>;
  uLensCount: Uniform<number>;
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

const STARFIELD_FRAGMENT = /* glsl */ `
precision highp float;
${STARFIELD_GLSL}
uniform vec3 uLensCamera[${MAX_STARFIELD_LENSES}];
uniform float uLensStrength[${MAX_STARFIELD_LENSES}];
uniform int uLensCount;
varying vec3 vDirection;
void main() {
  vec3 dir = normalize(vDirection);
  for (int i = 0; i < ${MAX_STARFIELD_LENSES}; i++) {
    if (i >= uLensCount) break;
    dir = weakLens(dir, uLensCamera[i], uLensStrength[i]);
  }
  gl_FragColor = vec4(starfield(dir, uPixelAngle), 1.0);
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
  };
  const own: BackgroundUniforms = {
    uProjectionInverse: { value: new Matrix4() },
    uCameraRotation: { value: new Matrix3() },
    uLensCamera: { value: Array.from({ length: MAX_STARFIELD_LENSES }, () => new Vector3()) },
    uLensStrength: { value: new Float32Array(MAX_STARFIELD_LENSES) },
    uLensCount: { value: 0 },
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
        own.uLensCamera.value[i].copy(lenses[i].cameraLocal);
        own.uLensStrength.value[i] = clamp(lenses[i].strength, 0, 1);
      }
      own.uLensCount.value = count;
    },
  };
}
