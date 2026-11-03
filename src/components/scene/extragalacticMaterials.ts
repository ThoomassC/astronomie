import { AdditiveBlending, Color, DoubleSide, SRGBColorSpace, ShaderMaterial, Vector3 } from "three";
import type { Uniform } from "./materials";

/**
 * Coquilles lumineuses du ciel extragalactique : le fond diffus cosmologique, peau de notre bulle d'univers, et
 * les autres bulles du multivers. Shaders séparés de shaders.ts et materials.ts, propres à ces deux escales.
 *
 * Une coquille est une sphère unité (géométrie partagée, mise à l'échelle par son maillage) vue des deux côtés :
 * de l'extérieur, la face avant et la face arrière s'ajoutent ; de l'intérieur (la caméra traverse le fond diffus
 * en arrivant à l'Univers observable), seule la face intérieure se voit. Lumière ajoutée, sans écriture de
 * profondeur ni tone mapping, encodée en sRGB à la sortie : comme les nuages de points, elle se cumule.
 */

/** Sphère unité : la position du sommet est aussi la direction depuis le centre, domaine du motif. */
const SHELL_VERTEX = /* glsl */ `
varying vec3 vDirection;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
void main() {
  vDirection = position;
  vViewNormal = normalMatrix * normal;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

/**
 * Bruit de valeur 3D (hachage d'Inigo Quilez) et motif à trois octaves, ramené dans [0, 1]. Copie volontaire du
 * bruit de shaders.ts : les deux fichiers évoluent séparément.
 */
const SHELL_NOISE = /* glsl */ `
float shellHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float shellNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(shellHash(i), shellHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(shellHash(i + vec3(0.0, 1.0, 0.0)), shellHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(shellHash(i + vec3(0.0, 0.0, 1.0)), shellHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(shellHash(i + vec3(0.0, 1.0, 1.0)), shellHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float shellPattern(vec3 p) {
  return shellNoise(p) * 0.5714 + shellNoise(p * 2.03) * 0.2857 + shellNoise(p * 4.07) * 0.1429;
}
// Cosinus de l'angle entre la normale et la direction de la caméra, quelle que soit la face : 1 de face, 0 au bord.
float shellFacing(vec3 viewNormal, vec3 viewPosition) {
  return abs(dot(normalize(viewNormal), normalize(-viewPosition)));
}
`;

/**
 * Fond diffus cosmologique : taches chaudes et froides dessinées (pas la carte de Planck), sur une coquille mince.
 * De face, on la traverse vite et elle reste discrète (la toile se voit au travers) ; de biais, la ligne de visée
 * y parcourt plus de matière : le bord de la sphère s'éclaire.
 */
const CMB_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform vec3 uCold;
uniform vec3 uWarm;
varying vec3 vDirection;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
${SHELL_NOISE}
void main() {
  float facing = shellFacing(vViewNormal, vViewPosition);
  float spots = shellPattern(normalize(vDirection) * 9.0);
  vec3 tint = mix(uCold, uWarm, smoothstep(0.32, 0.68, spots));
  float sheet = 0.03 + 0.97 * pow(1.0 - facing, 3.0);
  gl_FragColor = vec4(tint * sheet * uOpacity, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * Autre univers-bulle : liseré de sa teinte au bord, irisation vers une teinte voisine de face (comme une bulle de
 * savon), grain léger décalé pour chaque bulle (chacune aurait son propre fond diffus). Rendu artistique d'une
 * hypothèse : rien de ce dessin n'est observé.
 */
const BUBBLE_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform vec3 uRim;
uniform vec3 uSheen;
uniform vec3 uPattern;
varying vec3 vDirection;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
${SHELL_NOISE}
void main() {
  float edge = 1.0 - shellFacing(vViewNormal, vViewPosition);
  vec3 tint = mix(uSheen, uRim, smoothstep(0.0, 0.8, edge));
  float grain = 0.75 + 0.5 * shellPattern(normalize(vDirection) * 4.0 + uPattern);
  float glow = 0.015 + 0.985 * pow(edge, 2.5);
  gl_FragColor = vec4(tint * glow * grain * uOpacity, 1.0);
  #include <colorspace_fragment>
}
`;

export interface CmbUniforms {
  /** Poids de la couche `cmb`, de 0 à 1. */
  uOpacity: Uniform<number>;
  /** Teintes des taches froides et chaudes (linéaires, éclat compris). */
  uCold: Uniform<Color>;
  uWarm: Uniform<Color>;
}

export interface BubbleUniforms {
  /** Poids de la couche `multiverse`, de 0 à 1 : partagé par toutes les bulles. */
  uOpacity: Uniform<number>;
  /** Teinte du liseré (linéaire, éclat compris) et teinte voisine de l'irisation, vue de face. */
  uRim: Uniform<Color>;
  uSheen: Uniform<Color>;
  /** Décalage du motif : chaque bulle a son grain. */
  uPattern: Uniform<Vector3>;
}

/** Teintes affichées (sRGB) du fond diffus : bleu froid et orange chaud, comme les cartes usuelles, assourdis. */
const CMB_COLD_SRGB = 0x3d63c9;
const CMB_WARM_SRGB = 0xe08a4f;
/** Éclat des taches, sur les valeurs linéaires : de face, la coquille n'est qu'un voile et la toile domine. */
const CMB_INTENSITY = 0.14;
/**
 * Liseré et irisation des bulles : saturation et luminosité (TSL, en sRGB), décalage de teinte de l'irisation ;
 * éclat sur les valeurs linéaires. Réglés pour que notre bulle, avec sa toile, reste le centre de l'image.
 */
const BUBBLE_RIM = { saturation: 0.55, lightness: 0.62 } as const;
const BUBBLE_SHEEN = { saturation: 0.44, lightness: 0.5, shift: 0.12 } as const;
const BUBBLE_INTENSITY = 0.55;

function shellMaterial(fragmentShader: string, uniforms: object): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...uniforms },
    vertexShader: SHELL_VERTEX,
    fragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
  });
}

/** Couleur linéaire d'une teinte affichée (sRGB), multipliée par `intensity`. */
const linearFromSrgb = (hex: number, intensity: number) => new Color().setHex(hex, SRGBColorSpace).multiplyScalar(intensity);

/** Matériau du fond diffus cosmologique, d'opacité 1 jusqu'à la première pesée. */
export function createCmbMaterial(): { material: ShaderMaterial; uniforms: CmbUniforms } {
  const uniforms: CmbUniforms = {
    uOpacity: { value: 1 },
    uCold: { value: linearFromSrgb(CMB_COLD_SRGB, CMB_INTENSITY) },
    uWarm: { value: linearFromSrgb(CMB_WARM_SRGB, CMB_INTENSITY) },
  };
  return { material: shellMaterial(CMB_FRAGMENT, uniforms), uniforms };
}

/**
 * Matériau d'une bulle de teinte `hue` (fraction de tour) : liseré à cette teinte, irisation décalée de 0,12 tour,
 * motif décalé selon la teinte. `opacity` est partagée par toutes les bulles (un seul poids, un seul programme GPU).
 */
export function createBubbleMaterial(hue: number, opacity: Uniform<number>): { material: ShaderMaterial; uniforms: BubbleUniforms } {
  const uniforms: BubbleUniforms = {
    uOpacity: opacity,
    uRim: {
      value: new Color().setHSL(hue, BUBBLE_RIM.saturation, BUBBLE_RIM.lightness, SRGBColorSpace).multiplyScalar(BUBBLE_INTENSITY),
    },
    uSheen: {
      value: new Color()
        .setHSL((hue + BUBBLE_SHEEN.shift) % 1, BUBBLE_SHEEN.saturation, BUBBLE_SHEEN.lightness, SRGBColorSpace)
        .multiplyScalar(BUBBLE_INTENSITY),
    },
    uPattern: { value: new Vector3(hue * 37.1, hue * 11.7, hue * 23.3) },
  };
  return { material: shellMaterial(BUBBLE_FRAGMENT, uniforms), uniforms };
}
