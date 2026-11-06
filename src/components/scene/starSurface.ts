import { Color, ShaderMaterial, Vector3 } from "three";
import type { Uniform } from "./materials";
import { TAU, clamp, smoothstep } from "./math";
import { STAR_SURFACE_FRAGMENT, STAR_SURFACE_VERTEX } from "./shaders";

/**
 * Surface d'étoile procédurale, commune au Soleil et aux étoiles qu'on lui compare (naine rouge, géantes,
 * supergéantes) : granulation, supergranulation et réseau, taches, facules, assombrissement centre-bord, le tout
 * calculé en température (voir STAR_SURFACE_FRAGMENT). Le maillage est une sphère dont l'axe y local est le pôle
 * de rotation. Une étoile se décrit par quelques grandeurs physiques ; le Soleil en est le préréglage SUN_SURFACE.
 */

/** Deuxième constante de rayonnement c₂ = hc/k, en m·K. */
const C2 = 1.438777e-2;
/** Longueurs d'onde effectives des canaux rouge, vert et bleu, en mètres. */
const CHANNEL_WAVELENGTHS = [610e-9, 550e-9, 465e-9] as const;
/**
 * Écarts de couleur accentués sur le vert et le bleu : à 5 800 K, une zone plus froide de quelques pour cent change
 * à peine de teinte ; on accentue son rougissement, comme sur les images colorisées des observatoires solaires.
 */
const WIEN_STYLE = [1, 1.25, 1.6] as const;

/**
 * Coefficients de Wien des trois canaux, c₂ / (λ T) (accentués par WIEN_STYLE) : une zone à la température relative
 * t (1 au centre du disque) brille de exp(−c (1/t − 1)) par canal. Plus l'étoile est chaude, moins ses zones froides
 * rougissent (la courbe du corps noir s'aplatit dans le visible).
 */
export function wienCoefficients(temperature: number, out: Vector3 = new Vector3()): Vector3 {
  const [red, green, blue] = CHANNEL_WAVELENGTHS.map((wavelength, i) => (WIEN_STYLE[i] * C2) / (wavelength * temperature));
  return out.set(red, green, blue);
}

export interface StarSurfaceOptions {
  /** Température effective de la photosphère, en kelvins (Soleil : 5 772 K). */
  temperature: number;
  /** Couleur moyenne du centre du disque, linéaire, éclat compris (au-delà de 1 : HDR, adouci par le tone mapping). */
  color: Color;
  /**
   * Cellules de convection par rayon d'étoile, sur la sphère unité. Soleil : 60 (granules agrandis pour rester
   * visibles de près) ; une supergéante n'a que quelques cellules géantes (3 à 5). Réseau de supergranulation
   * au-delà de 26, complet à partir de 52.
   */
  granulation: number;
  /** Écart relatif de température entre le cœur des cellules et leurs couloirs (Soleil : 0,11). */
  granulationContrast?: number;
  /** Assombrissement centre-bord k, loi T⁴(μ) ∝ 1 − k + kμ (atmosphère grise d'Eddington : 0,6). */
  limbDarkening: number;
  /**
   * Assombrissement centre-bord en intensité, loi linéaire I(μ)/I(1) = 1 − u(1 − μ), sur les trois canaux à la fois
   * (le bord s'assombrit sans virer au gris) : celui des étoiles chaudes dans le visible. 0 par défaut : rien ne change.
   */
  limbIntensity?: number;
  /** Groupes de taches au plus, deux taches chacun ; 0 : aucune tache. */
  spotGroups?: number;
  /** Activité de départ, de 0 à 1 (facules du réseau) ; `uActivity` se règle ensuite en place. */
  activity?: number;
  /** Vitesse de rotation affichée à l'équateur, en rad/s, sens direct autour de l'axe y local. */
  spin?: number;
  /** Temps affiché, en secondes, partagé avec le reste de l'étoile : il fait tourner et bouillonner la surface. */
  time: Uniform<number>;
  /** Variante allégée (écrans tactiles) : cellules figées, ni détail fin ni réseau. */
  lite?: boolean;
}

/** Uniformes de la surface, modifiés en place (activité, taches). */
export interface StarSurfaceUniforms {
  uTime: Uniform<number>;
  uColor: Uniform<Color>;
  /** Coefficients de Wien des canaux rouge, vert et bleu (wienCoefficients). */
  uWien: Uniform<Vector3>;
  uGranulation: Uniform<number>;
  uContrast: Uniform<number>;
  uLimbDarkening: Uniform<number>;
  /** Coefficient u de `limbIntensity`. */
  uLimbIntensity: Uniform<number>;
  /** Alpha de la surface, 1 par défaut ; n'agit que si le matériau est `transparent` (Tailles : effacement près de la règle). */
  uOpacity: Uniform<number>;
  /** Activité, de 0 à 1 : éclat des facules du réseau. */
  uActivity: Uniform<number>;
  /** Vitesse de rotation affichée à l'équateur, en rad/s. */
  uSpinRate: Uniform<number>;
  /** Par tache, quatre flottants : centre (unitaire, repère de l'étoile) et rayon angulaire (rad). */
  uSpotA: Uniform<Float32Array>;
  /** Par tache : part de l'ombre dans la tache, rayon et éclat de sa plage de facules, cosinus de la calotte englobante. */
  uSpotB: Uniform<Float32Array>;
}

/** Tache éteinte : cosinus de calotte hors de [−1, 1], le shader ne la visite jamais. */
const SPOT_OFF = 2;

export function createStarSurfaceMaterial(options: StarSurfaceOptions): {
  material: ShaderMaterial;
  uniforms: StarSurfaceUniforms;
} {
  const spots = 2 * Math.max(0, Math.floor(options.spotGroups ?? 0));
  const spotB = new Float32Array(spots * 4);
  for (let i = 3; i < spotB.length; i += 4) spotB[i] = SPOT_OFF;
  const uniforms: StarSurfaceUniforms = {
    uTime: options.time,
    uColor: { value: options.color.clone() },
    uWien: { value: wienCoefficients(options.temperature) },
    uGranulation: { value: options.granulation },
    uContrast: { value: options.granulationContrast ?? 0.11 },
    uLimbDarkening: { value: options.limbDarkening },
    uLimbIntensity: { value: options.limbIntensity ?? 0 },
    // Le matériau reste opaque : l'appelant qui veut effacer l'étoile le rend transparent (Tailles).
    uOpacity: { value: 1 },
    uActivity: { value: options.activity ?? 0 },
    uSpinRate: { value: options.spin ?? 0 },
    uSpotA: { value: new Float32Array(spots * 4) },
    uSpotB: { value: spotB },
  };
  const defines: Record<string, string | number> = { STARSPOTS: spots };
  if (options.lite) defines.STAR_LITE = "";
  const material = new ShaderMaterial({
    uniforms: { ...uniforms },
    defines,
    vertexShader: STAR_SURFACE_VERTEX,
    fragmentShader: STAR_SURFACE_FRAGMENT,
  });
  return { material, uniforms };
}

/**
 * Le Soleil : naine jaune G2 V à 5 772 K (UAI 2015), doré comme sur le reste du site. Ses taches suivent le cycle
 * solaire (bodies.ts, solarCycle.ts) ; il tourne, à l'équateur, à 0,03 rad/s, la vitesse affichée des planètes les
 * plus lentes (Mercure, Vénus).
 */
export const SUN_SURFACE = {
  temperature: 5772,
  color: new Color(1.6, 0.66, 0.1),
  granulation: 60,
  granulationContrast: 0.11,
  limbDarkening: 0.6,
  spotGroups: 12,
  spin: 0.03,
} satisfies Omit<StarSurfaceOptions, "time">;

// ---------- Taches ----------

export interface StarspotField {
  /** Temps affiché, en secondes : celui de la surface. */
  time: number;
  /** Activité, de 0 à 1 : part des groupes allumés. */
  activity: number;
  /** Latitude moyenne où naissent les groupes, en radians (valeur absolue ; Soleil : loi de Spörer). */
  latitude: number;
  /** Vitesse angulaire affichée à une latitude (rad), en rad/s : rotation différentielle. */
  spin: (latitude: number) => number;
}

/** Hachage entier « lowbias32 » (Chris Wellons) : tirages reproductibles, sans état. */
function hash32(x: number): number {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Tirage dans [0, 1[ propre à un groupe, à l'une de ses vies et au rang du tirage. */
function draw(group: number, life: number, rank: number): number {
  const seed = hash32(Math.imul(group + 1, 0x9e3779b1) + Math.imul(rank + 1, 0x85ebca77));
  return hash32(seed ^ Math.imul(life | 0, 0xc2b2ae35)) / 4294967296;
}

/**
 * Écrit la tache `index` : centre à `latitude`, longitude de départ `longitude` plus la rotation depuis l'instant 0,
 * rayon `size` réduit par l'âge (aire ∝ `strength`), plage de facules d'éclat `faculae` sur 3,2 fois sa taille.
 * Arguments scalaires : appelée à chaque image, elle n'alloue rien.
 */
function writeSpot(
  uniforms: StarSurfaceUniforms,
  field: StarspotField,
  index: number,
  latitude: number,
  longitude: number,
  size: number,
  umbra: number,
  strength: number,
  faculae: number,
): void {
  const a = uniforms.uSpotA.value;
  const b = uniforms.uSpotB.value;
  const o = index * 4;
  const turned = longitude + field.spin(latitude) * field.time;
  const cosLatitude = Math.cos(latitude);
  const radius = size * Math.sqrt(strength);
  const plage = size > 0 ? faculae * (0.6 + (0.4 * size) / 0.032) : 0;
  const plageRadius = 3.2 * Math.max(size, 0.004);
  // Longitude comptée dans le sens direct : x vers z négatif, comme une rotation positive autour de y.
  a[o] = cosLatitude * Math.cos(turned);
  a[o + 1] = Math.sin(latitude);
  a[o + 2] = -cosLatitude * Math.sin(turned);
  a[o + 3] = radius;
  // Une tache minuscule n'est qu'un pore : presque toute en ombre.
  b[o] = size < 0.007 ? 0.85 : umbra;
  b[o + 1] = plageRadius;
  b[o + 2] = plage;
  b[o + 3] = radius > 0 || plage > 0 ? Math.cos(Math.min(Math.PI, 2.2 * plageRadius)) : SPOT_OFF;
}

/**
 * Place les taches à l'instant `field.time` (secondes affichées), sans état : le même instant donne toujours le
 * même ciel. Chaque groupe vit de 70 à 180 s, naît vite, s'éteint lentement, puis renaît ailleurs ; il ne s'allume
 * que si l'activité dépasse son seuil (de 0,07 à 0,95 selon son rang). Groupe bipolaire : la tache de tête, plus
 * grosse, précède dans le sens de rotation et penche vers l'équateur (loi de Joy, sin γ ≈ 0,5 sin φ) ; la suiveuse
 * manque parfois. Latitude tirée autour de `field.latitude` (écart-type ≈ 5°), longitude au hasard, puis chaque tache
 * tourne à la vitesse de sa latitude.
 */
export function placeStarspots(uniforms: StarSurfaceUniforms, field: StarspotField): void {
  const groups = uniforms.uSpotA.value.length / 8;
  for (let group = 0; group < groups; group++) {
    const lifetime = 70 + 110 * draw(group, 0, 1);
    const cycle = field.time / lifetime + draw(group, 0, 2);
    const life = Math.floor(cycle);
    const age = cycle - life;
    const threshold = 0.07 + (0.88 * group) / groups;
    const lit = smoothstep(threshold, threshold + 0.06, field.activity);
    const strength = lit * smoothstep(0, 0.12, age) * (1 - age) ** 0.7;
    // Les facules naissent avec le groupe et lui survivent un peu.
    const faculae = lit * smoothstep(0, 0.08, age) * (1 - age) ** 0.35;
    const hemisphere = draw(group, life, 3) < 0.5 ? -1 : 1;
    // Somme de trois tirages uniformes : à peu près gaussienne, d'écart-type 1.
    const spread = (draw(group, life, 4) + draw(group, life, 5) + draw(group, life, 6) - 1.5) * 2;
    const latitude = hemisphere * clamp(field.latitude + 0.085 * spread, 0.07, 0.72);
    const longitude = TAU * draw(group, life, 7);
    const size = 0.013 + 0.04 * draw(group, life, 8) ** 1.8;
    const half = 1.6 * size + 0.006;
    const towardEquator = hemisphere * half * Math.sin(0.5 * Math.abs(latitude));
    const lead = latitude - towardEquator;
    const follow = latitude + towardEquator;
    writeSpot(
      uniforms,
      field,
      2 * group,
      lead,
      longitude + half / Math.max(Math.cos(lead), 0.2),
      size,
      0.36 + 0.1 * draw(group, life, 9),
      strength,
      faculae,
    );
    writeSpot(
      uniforms,
      field,
      2 * group + 1,
      follow,
      longitude - half / Math.max(Math.cos(follow), 0.2),
      draw(group, life, 10) < 0.3 ? 0 : size * (0.45 + 0.35 * draw(group, life, 11)),
      0.28 + 0.16 * draw(group, life, 12),
      strength,
      faculae,
    );
  }
}
