import type { Vec3 } from "./constants";
import { SHADOW_RADIUS_RS } from "./schwarzschild";

/*
 * Lumière autour d'un trou noir sans rotation, en r_s (r_s = 1), dans le repère du trou noir. Modèle exécutable du
 * shader des trous noirs (BLACK_HOLE_FRAGMENT, src/components/scene/blackHoleShaders.ts), qui le suit pas à pas sous
 * les mêmes noms : toute modification se fait des deux côtés, et les constantes passent d'ici au GLSL (pas du tracé,
 * série de champ faible, ajustement du corps noir).
 *
 * Équation du tracé : x″ = −1,5 h² x / |x|⁵, h = |x × x′| constant. Avec le paramètre affine normalisé à l'infini
 * (E = 1), elle donne exactement les géodésiques nulles de Schwarzschild : (dr/dλ)² = 1 − (b²/r²)(1 − 1/r),
 * r² dφ/dλ = b et |x′|² = 1 + b²/r³, où h est le paramètre d'impact b = L/E. Le schéma de Verlet (« kick-drift-kick »)
 * conserve h exactement : la poussée est radiale, le glissement suit la vitesse.
 *
 * Une caméra au repos à la distance D mesure les directions dans son repère local : la composante transverse de la
 * vitesse affine y vaut celle de la direction divisée par √(1 − 1/D). C'est ce qui place le bord de l'ombre au rayon
 * angulaire de Synge, sin α = (√27/2) √(1 − 1/D) / D, et non à √27/2 / D.
 */

/** Pas du tracé, en r_s ; les mêmes valeurs deviennent les defines du shader (BH_STEPS…). */
export interface RayStepOptions {
  /** Pas dλ = clamp(stepFactor × r, minStep, maxStep) dans la sphère tracée (r ≤ R_q) : proportionnel à r, sans estimation d'erreur. */
  stepFactor: number;
  minStep: number;
  maxStep: number;
  /** Au-delà de la sphère tracée, pas de farStepFactor × r (au moins minStep) : la lumière y file presque droit. */
  farStepFactor: number;
  /** Pas au plus (define BH_STEPS) ; au-delà, le rayon est « inachevé ». */
  maxSteps: number;
  /** Traversées lumineuses du disque prises en compte au plus. */
  maxCrossings: number;
}

/**
 * Souris : bord de l'ombre à 0,3 % de la formule de Synge, directions à moins de 2 mrad d'une intégration fine dès
 * b = 4 r_s. Un pas plus grossier (0,16 r) laisse filer des rayons qui devraient être capturés.
 */
export const DESKTOP_RAY_STEPS: RayStepOptions = {
  stepFactor: 0.08,
  minStep: 0.02,
  maxStep: 1,
  farStepFactor: 0.15,
  maxSteps: 160,
  maxCrossings: 3,
};

/** Écran tactile (define BH_LITE) : 72 pas, bord de l'ombre à 0,1 %, directions à moins de 3 mrad dès b = 4 r_s. */
export const LITE_RAY_STEPS: RayStepOptions = {
  stepFactor: 0.1,
  minStep: 0.02,
  maxStep: 1.5,
  farStepFactor: 0.15,
  maxSteps: 72,
  maxCrossings: 2,
};

/**
 * Le tracé part de la sphère de rayon max(R_q, START_IMPACT_RATIO × b) et s'y arrête. Au-delà, un rayon de paramètre
 * d'impact b n'a pas acquis 0,25 % de sa déviation (part (3/16)(b/r)⁴ pour cette équation) : on l'y amène en ligne
 * droite, et sa direction de sortie est sa direction à l'infini.
 */
export const START_IMPACT_RATIO = 3;

/**
 * Série de la déviation de champ faible, α∞(b) = Σ cₖ / b^(k+1), r_s = 1 (Keeton et Petters 2005, M = 1/2) :
 * 2/b + (15π/16)/b² + (16/3)/b³ + (3465π/1024)/b⁴. Le premier ordre seul se trompe de 12 à 27 % près du trou noir ;
 * le quatrième ordre ramène l'écart à 0,1 % à b = 10. Le GLSL du fond étoilé reprend ces coefficients.
 */
export const WEAK_DEFLECTION_SERIES = [2, (15 * Math.PI) / 16, 16 / 3, (3465 * Math.PI) / 1024] as const;

/** Déviation totale (rad) d'un rayon de paramètre d'impact b venu de l'infini et reparti à l'infini : α∞(b). */
export function deflectionAtInfinity(b: number): number {
  const [c1, c2, c3, c4] = WEAK_DEFLECTION_SERIES;
  const u = 1 / b;
  return u * (c1 + u * (c2 + u * (c3 + u * c4)));
}

/** 1 − s/√(s² + b²), écrit sans soustraire deux nombres voisins quand s > 0 (caméra au-delà du périastre). */
function remainingShare(b: number, s: number): number {
  const q = Math.hypot(s, b);
  return s <= 0 ? 1 - s / q : (b * b) / (q * (q + s));
}

/**
 * Déviation de champ faible (rad) d'un rayon de paramètre d'impact b, la caméra en s le long de la droite (s < 0 tant
 * que le trou noir est devant), jusqu'à l'infini : α = α∞(b)/2 × (1 − s/√(s² + b²)). Lentille du fond étoilé
 * (weakDeflection du GLSL) ; depuis une caméra à 40 r_s, à 0,5 % du tracé fin pour b de 8 à 14 r_s.
 */
export function weakDeflection(b: number, s: number): number {
  return (deflectionAtInfinity(b) / 2) * remainingShare(b, s);
}

const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const scaled = (a: Vec3, k: number): Vec3 => v3(a.x * k, a.y * k, a.z * k);
/** a + k b */
const plus = (a: Vec3, b: Vec3, k: number): Vec3 => v3(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);

/** Facteur 1/√(1 − 1/D) de la composante transverse, pour un observateur immobile à D r_s (borné près de l'horizon). */
function lateralBoost(distanceRs: number): number {
  return 1 / Math.sqrt(Math.max(1 - 1 / distanceRs, 1e-6));
}

/**
 * Paramètre d'impact b (r_s) du rayon de direction unitaire `direction`, mesurée par une caméra immobile en
 * `cameraLocal` : b = |c × d| / √(1 − 1/D). Le fond étoilé l'emploie pour sa lentille faible, le tracé le conserve.
 */
export function observedImpact(cameraLocal: Vec3, direction: Vec3): number {
  return length(cross(cameraLocal, direction)) * lateralBoost(length(cameraLocal));
}

/**
 * Rayon angulaire (rad) de l'ombre vue par une caméra immobile à `distanceRs` (Synge 1966) :
 * sin α = (√27/2) √(1 − 1/D) / D. 45° à 3 r_s ; √27/2 / D de loin.
 */
export function shadowAngularRadius(distanceRs: number): number {
  return Math.asin(Math.min(1, (SHADOW_RADIUS_RS * Math.sqrt(Math.max(0, 1 - 1 / distanceRs))) / distanceRs));
}

/** Départ du tracé d'un rayon de caméra. */
export interface RayStart {
  /** Point de départ, en r_s : la caméra, ou le point d'entrée dans la sphère de départ. */
  position: Vec3;
  /** Vitesse affine dx/dλ (E = 1), |v|² = 1 + b²/r³. */
  velocity: Vec3;
  /** Paramètre d'impact b = |x × v|, conservé tout le long. */
  impact: number;
  /** Sphère de départ et de sortie : max(quadRs, START_IMPACT_RATIO × b). */
  escapeRs: number;
}

/**
 * Départ du tracé du rayon de direction unitaire `direction` (repère du trou noir) vu de `cameraLocal` : vitesse
 * affine de l'observateur immobile, puis, si la caméra est hors de la sphère de départ, saut en ligne droite jusqu'à
 * elle. Le point d'entrée garde exactement b (|x × v| = b) et l'énergie (|v|² = 1 + b²/r³) : seule la déviation
 * acquise au-delà, inférieure à 0,25 %, est négligée. (Une rotation de la direction par la lentille faible, sur la
 * droite, ne conserverait pas b : l'ombre en paraîtrait 9 % trop grande.)
 */
export function startRay(cameraLocal: Vec3, direction: Vec3, quadRs: number): RayStart {
  const distance = length(cameraLocal);
  const radial = scaled(cameraLocal, 1 / distance);
  const along = dot(direction, radial);
  // Composante radiale telle quelle, composante transverse × 1/√(1 − 1/D).
  const transverse = plus(direction, radial, -along);
  const affine = plus(scaled(radial, along), transverse, lateralBoost(distance));
  const momentum = cross(cameraLocal, affine);
  const impact = length(momentum);
  const escapeRs = Math.max(quadRs, START_IMPACT_RATIO * impact);
  if (distance <= escapeRs) return { position: { ...cameraLocal }, velocity: affine, impact, escapeRs };

  const speed = Math.sqrt(1 + (impact * impact) / escapeRs ** 3);
  const heading = scaled(affine, 1 / length(affine));
  // Du centre vers le pied de la perpendiculaire : p̂ = û × ĥ (nul pour un rayon radial, b = 0).
  const outward = impact > 0 ? cross(heading, scaled(momentum, 1 / impact)) : v3(0, 0, 0);
  const lateral = impact / speed;
  const position = plus(scaled(heading, -Math.sqrt(Math.max(escapeRs * escapeRs - lateral * lateral, 0))), outward, lateral);
  return { position, velocity: scaled(heading, speed), impact, escapeRs };
}

/** Pas dλ (r_s) au rayon r : clamp(stepFactor × r, minStep, maxStep) dans la sphère tracée, farStepFactor × r au-delà. */
export function rayStep(radiusRs: number, quadRs: number, steps: RayStepOptions): number {
  return radiusRs > quadRs
    ? Math.max(steps.minStep, steps.farStepFactor * radiusRs)
    : Math.min(steps.maxStep, Math.max(steps.minStep, steps.stepFactor * radiusRs));
}

/** Plan du disque et ses bords : seules les traversées entre innerRs et outerRs comptent. */
export interface DiskPlane {
  /** Normale du plan (le sens n'importe pas ici). */
  normal: Vec3;
  innerRs: number;
  outerRs: number;
}

/** Traversée lumineuse du plan du disque, point interpolé entre deux pas. */
export interface DiskCrossing {
  radiusRs: number;
  position: Vec3;
  /** Vitesse affine du tracé à la traversée (sens inverse de la lumière). */
  velocity: Vec3;
}

export type RayOutcome =
  | { kind: "captured"; steps: number }
  | { kind: "escaped"; steps: number; direction: Vec3 }
  | { kind: "unfinished"; steps: number };

export interface RayTrace {
  outcome: RayOutcome;
  crossings: DiskCrossing[];
}

/** Accélération −1,5 h² x / |x|⁵. */
function acceleration(position: Vec3, h2: number): Vec3 {
  const r = length(position);
  return scaled(position, (-1.5 * h2) / (r * r * r * r * r));
}

/**
 * Trace un rayon depuis `origin` (r_s, repère du trou noir), vitesse affine `velocity`, par Verlet : capturé si
 * r < 1, échappé si r > escapeRs en s'éloignant (direction de sortie unitaire), inachevé après maxSteps. Relève les
 * traversées du plan `disk` entre ses bords, au plus maxCrossings. `quadRs` : rayon de la sphère tracée, où les pas
 * passent de stepFactor à farStepFactor (par défaut escapeRs).
 */
export function traceRay(
  origin: Vec3,
  velocity: Vec3,
  escapeRs: number,
  disk: DiskPlane | null,
  steps: RayStepOptions,
  quadRs: number = escapeRs,
): RayTrace {
  let x = { ...origin };
  let v = { ...velocity };
  const momentum = cross(x, v);
  const h2 = dot(momentum, momentum);
  let a = acceleration(x, h2);
  let zPrev = disk ? dot(x, disk.normal) : 0;
  const crossings: DiskCrossing[] = [];
  for (let i = 0; i < steps.maxSteps; i++) {
    const dl = rayStep(length(x), quadRs, steps);
    const prev = x;
    v = plus(v, a, 0.5 * dl);
    x = plus(x, v, dl);
    a = acceleration(x, h2);
    v = plus(v, a, 0.5 * dl);
    if (disk && crossings.length < steps.maxCrossings) {
      const z = dot(x, disk.normal);
      if (zPrev * z < 0) {
        const t = zPrev / (zPrev - z);
        const position = plus(prev, plus(x, prev, -1), t);
        const radiusRs = length(position);
        if (radiusRs > disk.innerRs && radiusRs < disk.outerRs) crossings.push({ radiusRs, position, velocity: { ...v } });
      }
      zPrev = z;
    }
    const r = length(x);
    if (r < 1) return { outcome: { kind: "captured", steps: i + 1 }, crossings };
    if (r > escapeRs && dot(x, v) > 0) {
      return { outcome: { kind: "escaped", steps: i + 1, direction: scaled(v, 1 / length(v)) }, crossings };
    }
  }
  return { outcome: { kind: "unfinished", steps: steps.maxSteps }, crossings };
}

/** Vitesse angulaire képlérienne au rayon r, en c/r_s : Ω = (2r³)^(−1/2). */
const keplerOmega = (r: number) => 1 / Math.sqrt(2 * r * r * r);

/**
 * Décalage spectral g = ν observé / ν émis de la lumière d'un disque mince képlérien, au point `position` du disque,
 * pour le rayon tracé de vitesse affine `velocity` ; `axis` unitaire : moment cinétique du gaz (sens direct autour de
 * lui). Formule exacte de Schwarzschild : g = √(1 − 1,5/r) / (1 + Ω L_z), où L_z = axis · (x × v) est la composante,
 * conservée, du moment cinétique du rayon. Elle réunit le décalage gravitationnel, l'effet Doppler transverse et
 * l'effet Doppler du mouvement : g > 1 du côté qui s'approche (plus brillant, plus bleu), √0,5 à l'ISCO pour un
 * rayon émis perpendiculairement au mouvement.
 */
export function diskRedshift(position: Vec3, velocity: Vec3, axis: Vec3): number {
  const r = length(position);
  const lz = dot(axis, cross(position, velocity));
  return Math.sqrt(Math.max(0, 1 - 1.5 / r)) / Math.max(1 + lz * keplerOmega(r), 1e-3);
}

/**
 * Décalage spectral g de la lumière d'un gaz chaud qui tourne autour de `axis` (unitaire) à `rotation` fois la
 * vitesse képlérienne de l'équateur, ralentie vers les pôles (β = rotation × (ρ/r) × √(0,5/(r − 1))) :
 * g = √(1 − 1/r) √(1 − β²) / (1 + rotation × Ω L_z). Gaz immobile : √(1 − 1/r) ; rotation 1 dans le plan : le disque.
 */
export function flowRedshift(position: Vec3, velocity: Vec3, axis: Vec3, rotation: number): number {
  const r = length(position);
  const height = dot(position, axis) / r;
  const beta = rotation * Math.sqrt(Math.max(0, 1 - height * height)) * Math.sqrt(0.5 / Math.max(r - 1, 0.5));
  const lz = dot(axis, cross(position, velocity));
  return (
    (Math.sqrt(Math.max(0, 1 - 1 / r)) * Math.sqrt(Math.max(0, 1 - beta * beta))) /
    Math.max(1 + rotation * lz * keplerOmega(r), 1e-3)
  );
}

/** Rayon du maximum de température d'un disque mince, en rayons intérieurs : 49/36. */
const DISK_PEAK_RATIO = 49 / 36;
/** x^(−3/4) (1 − x^(−1/2))^(1/4) en x = 49/36. */
const DISK_PEAK_SHAPE = DISK_PEAK_RATIO ** -0.75 * (1 - 1 / Math.sqrt(DISK_PEAK_RATIO)) ** 0.25;

/**
 * Température d'un disque mince rapportée à son maximum : T ∝ r^(−3/4) (1 − √(r_in/r))^(1/4) (Shakura et Sunyaev,
 * couple nul au bord intérieur). 0 au bord intérieur, 1 en r = 49/36 r_in, r^(−3/4) au loin. Le flux, T⁴, suit
 * r⁻³ (1 − √(r_in/r)).
 */
export function diskTemperatureRatio(radiusRs: number, innerRs: number): number {
  if (radiusRs <= innerRs) return 0;
  const x = radiusRs / innerRs;
  return (x ** -0.75 * (1 - 1 / Math.sqrt(x)) ** 0.25) / DISK_PEAK_SHAPE;
}

/** Couleur linéaire (sRGB, blanc D65). */
export type LinearRgb = [r: number, g: number, b: number];

/**
 * Lieu de Planck en coordonnées uv CIE 1960, en fonction de m = 1000/T : fractions rationnelles de Krystek (1985),
 * récrites en m (valables de 1 000 à 15 000 K), raccordées à la limite de Rayleigh-Jeans (T → ∞) par un terme
 * Δ / (1 + (m/m₀)²). Écart à l'intégration de Planck sur les fonctions CIE 1931 (Wyman et al. 2013) : 1/255 au plus
 * de 2 000 K à l'infini, 5/255 à 1 500 K. Le GLSL reprend ces nombres.
 */
export const BLACKBODY_FIT = {
  /** u(m) = (a₀ + a₁ m + a₂ m²) / (b₀ + b₁ m + m²). */
  u: { numerator: [0.128641212, 0.154118254, 0.860117757], denominator: [0.708145163, 0.842420235] },
  /** v(m) = (a₀ + a₁ m + a₂ m²) / (b₀ + b₁ m + m²). */
  v: { numerator: [0.0420481691, 0.0422806245, 0.317398726], denominator: [0.161456053, -0.0289741816] },
  /** Chromaticité limite de Rayleigh-Jeans, en uv CIE 1960. */
  limit: { u: 0.180299, v: 0.263569 },
  /** m₀ du raccord à la limite. */
  limitScale: 0.015,
  /** En dessous, la couleur sort du gamut sRGB : température bornée. */
  minTemperatureK: 1200,
} as const;

/** Écart de la formule de Krystek à la limite, en m = 0 : le raccord le corrige. */
export const BLACKBODY_LIMIT_SHIFT = {
  u: BLACKBODY_FIT.limit.u - BLACKBODY_FIT.u.numerator[0] / BLACKBODY_FIT.u.denominator[0],
  v: BLACKBODY_FIT.limit.v - BLACKBODY_FIT.v.numerator[0] / BLACKBODY_FIT.v.denominator[0],
} as const;

/**
 * Couleur d'un corps noir à `temperatureK`, linéaire (sRGB, D65), de luminance 1 : la température dit la teinte,
 * l'éclat se règle à part. Bornée à BLACKBODY_FIT.minTemperatureK ; tend vers ≈ #95b1ff (canal fort à 255) quand T
 * croît, la couleur limite d'un disque à plusieurs millions de kelvins.
 */
export function blackbodyColor(temperatureK: number): LinearRgb {
  const m = 1000 / Math.max(temperatureK, BLACKBODY_FIT.minTemperatureK);
  const join = 1 / (1 + (m / BLACKBODY_FIT.limitScale) ** 2);
  const ratio = (fit: { numerator: readonly number[]; denominator: readonly number[] }) =>
    (fit.numerator[0] + m * (fit.numerator[1] + m * fit.numerator[2])) / (fit.denominator[0] + m * (fit.denominator[1] + m));
  const u = ratio(BLACKBODY_FIT.u) + BLACKBODY_LIMIT_SHIFT.u * join;
  const v = ratio(BLACKBODY_FIT.v) + BLACKBODY_LIMIT_SHIFT.v * join;
  const d = 2 * u - 8 * v + 4;
  const x = (3 * u) / d;
  const y = (2 * v) / d;
  const [X, Y, Z] = [x / y, 1, (1 - x - y) / y];
  const rgb: LinearRgb = [
    Math.max(0, 3.2406 * X - 1.5372 * Y - 0.4986 * Z),
    Math.max(0, -0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    Math.max(0, 0.0557 * X - 0.204 * Y + 1.057 * Z),
  ];
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return [rgb[0] / luminance, rgb[1] / luminance, rgb[2] / luminance];
}
