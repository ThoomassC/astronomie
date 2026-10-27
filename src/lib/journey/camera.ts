import type { Vec3 } from "@/lib/astro/constants";
import type { PlanetKey } from "@/lib/astro/planets";
import { sceneRadius } from "@/lib/astro/scale";

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
const DEFAULTS = { elev: 11, phi: 55, offX: 0.17, offY: 0 };

interface StopCameraConfig {
  dist?: number;
  k?: number;
  elev?: number;
  azim?: number;
  phi?: number;
  offX?: number;
  offY?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const emptyCam = (): CamState => ({ tx: 0, ty: 0, tz: 0, dist: 1, azim: 0, elev: 0, offX: 0, offY: 0, planet: false });

/** Escales du voyage, dans l'ordre de la page. */
export type StopKey = "hero" | "sun" | PlanetKey | "belt" | "beyond";

export const STOP_ORDER: readonly StopKey[] = [
  "hero", "sun", "mercury", "venus", "earth", "mars", "belt", "jupiter", "saturn", "uranus", "neptune", "beyond",
];

/** État de caméra : cible (tx, ty, tz), distance, azimut et élévation (radians), décalage d'écran (fraction de la vue). */
export interface CamState {
  tx: number;
  ty: number;
  tz: number;
  dist: number;
  azim: number;
  elev: number;
  /** La cible est à 0,5 + offX de la largeur (positif = vers la droite). */
  offX: number;
  /** La cible est à 0,5 + offY de la hauteur (négatif = vers le haut). */
  offY: number;
  /** La cible est un astre en orbite (planète ou ceinture), pas le centre du système. */
  planet: boolean;
}

export interface StopCameraContext {
  /** Position de scène actuelle de la planète. */
  planetPosition(key: PlanetKey): Vec3;
  /** Rayon affiché de la planète (unités de scène). */
  planetRadius(key: PlanetKey): number;
  /** 0 = distances compressées, 1 = réelles. */
  realScale: number;
  /** Écran en portrait (largeur / hauteur < 0,9). */
  portrait: boolean;
}

/**
 * Réglages par escale. `dist` absolue, ou `k` × rayon de la planète ; angles en degrés.
 * Valeurs par défaut : elev 11, phi 55, offX 0,17, offY 0.
 */
export const STOP_CAMERA = {
  hero: { dist: 420, elev: 24, azim: 206, offX: 0.23, offY: 0.05 },
  sun: { dist: 46, elev: 8, azim: 226, offX: 0.17 },
  mercury: { k: 9 },
  venus: { k: 7.5 },
  earth: { k: 8 },
  mars: { k: 8.5 },
  belt: { dist: 82, elev: 38, phi: 30 },
  jupiter: { k: 6.6 },
  saturn: { k: 9.8, elev: 17 },
  uranus: { k: 7.8 },
  neptune: { k: 7.8 },
  beyond: { dist: 640, elev: 62, azim: 206, offX: 0.14, offY: 0 },
} as const;

/**
 * Caméra au repos sur une escale. Règles (angles convertis en radians) :
 * - elev = elev de l'escale, 11° par défaut.
 * - hero, beyond : cible (0,0,0), dist × (portrait ? 1,75 : 1), azim fixe, planet = false.
 * - sun : cible (0,0,0), dist × (portrait ? 1,45 : 1), azim fixe, planet = false.
 * - belt : θ = atan2(mars.z, mars.x) − 0,55 ; R = sceneRadius(2,7, realScale) ; cible (R cos θ, 0, R sin θ) ;
 *   dist × (portrait ? 1,3 : 1) ; azim = θ + π + phi ; planet = true.
 * - planète : cible = sa position ; θ = atan2(z, x) ; dist = k × rayon × (portrait ? 1,4 : 1) ;
 *   azim = θ + π + phi (55° par défaut) ; planet = true.
 * - offX = portrait ? 0 : offX de l'escale (0,17 par défaut).
 * - offY = portrait ? (hero : −0,29 ; beyond : −0,1 ; autres : −0,21) : offY de l'escale (0 par défaut).
 */
export function cameraFor(key: StopKey, ctx: StopCameraContext, out: CamState = emptyCam()): CamState {
  const cfg: StopCameraConfig = STOP_CAMERA[key];
  const portrait = ctx.portrait;
  out.tx = 0;
  out.ty = 0;
  out.tz = 0;
  out.elev = (cfg.elev ?? DEFAULTS.elev) * D2R;
  out.planet = false;
  if (key === "hero" || key === "beyond" || key === "sun") {
    const factor = key === "sun" ? 1.45 : 1.75;
    out.dist = (cfg.dist ?? 1) * (portrait ? factor : 1);
    out.azim = (cfg.azim ?? 0) * D2R;
  } else if (key === "belt") {
    const mars = ctx.planetPosition("mars");
    const theta = Math.atan2(mars.z, mars.x) - 0.55;
    const radius = sceneRadius(2.7, ctx.realScale);
    out.tx = radius * Math.cos(theta);
    out.tz = radius * Math.sin(theta);
    out.dist = (cfg.dist ?? 1) * (portrait ? 1.3 : 1);
    out.azim = theta + Math.PI + (cfg.phi ?? DEFAULTS.phi) * D2R;
    out.planet = true;
  } else {
    const p = ctx.planetPosition(key);
    const theta = Math.atan2(p.z, p.x);
    out.tx = p.x;
    out.ty = p.y;
    out.tz = p.z;
    out.dist = (cfg.k ?? 8) * ctx.planetRadius(key) * (portrait ? 1.4 : 1);
    out.azim = theta + Math.PI + (cfg.phi ?? DEFAULTS.phi) * D2R;
    out.planet = true;
  }
  out.offX = portrait ? 0 : (cfg.offX ?? DEFAULTS.offX);
  out.offY = portrait ? (key === "hero" ? -0.29 : key === "beyond" ? -0.1 : -0.21) : (cfg.offY ?? DEFAULTS.offY);
  return out;
}

/** Plus court écart angulaire signé de a vers b, dans ]−π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d <= -Math.PI) d += TAU;
  return d;
}

/** Courbe 6t⁵ − 15t⁴ + 10t³, t borné à [0, 1]. */
export function smootherstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Interpolation de vol entre deux caméras (t déjà lissé par l'appelant).
 * - Cible en coordonnées cylindriques autour du Soleil : rayon et y linéaires, angle par le plus court chemin ;
 *   une cible de rayon < 0,01 prend l'angle de l'autre (pas de tour sur soi-même au départ du centre).
 * - hop = (a.planet && b.planet) ? clamp(|Δθ| / π + 0,15, 0, 1) : 0,2 ; arc = sin(π t).
 * - dist = exp(lerp(ln a.dist, ln b.dist, t)) × (1 + 2,2 · hop · arc)  (recul en milieu de vol).
 * - azim par le plus court chemin ; elev = lerp + 0,32 · hop · arc ; offX, offY linéaires.
 * - planet = t < 0,5 ? a.planet : b.planet.
 */
export function blendCameras(a: CamState, b: CamState, t: number, out: CamState = emptyCam()): CamState {
  const rA = Math.hypot(a.tx, a.tz);
  const rB = Math.hypot(b.tx, b.tz);
  let thA = Math.atan2(a.tz, a.tx);
  let thB = Math.atan2(b.tz, b.tx);
  if (rA < 0.01) thA = thB;
  if (rB < 0.01) thB = thA;
  const dTheta = angleDiff(thA, thB);
  const theta = thA + dTheta * t;
  const radius = lerp(rA, rB, t);
  const hop = a.planet && b.planet ? clamp(Math.abs(dTheta) / Math.PI + 0.15, 0, 1) : 0.2;
  const arc = Math.sin(Math.PI * t);
  const ty = lerp(a.ty, b.ty, t);
  const dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)) * (1 + 2.2 * hop * arc);
  const azim = a.azim + angleDiff(a.azim, b.azim) * t;
  const elev = lerp(a.elev, b.elev, t) + 0.32 * hop * arc;
  const offX = lerp(a.offX, b.offX, t);
  const offY = lerp(a.offY, b.offY, t);
  const planet = t < 0.5 ? a.planet : b.planet;
  out.tx = radius * Math.cos(theta);
  out.ty = ty;
  out.tz = radius * Math.sin(theta);
  out.dist = dist;
  out.azim = azim;
  out.elev = elev;
  out.offX = offX;
  out.offY = offY;
  out.planet = planet;
  return out;
}

export interface SectionBox {
  key: StopKey;
  /** Position du haut de la section dans le document, en px. */
  top: number;
  height: number;
}

export interface SectionRange {
  key: StopKey;
  /** Défilement à partir duquel la caméra est arrivée sur l'escale. */
  arrive: number;
  /** Défilement à partir duquel elle repart vers l'escale suivante (≥ arrive). */
  depart: number;
}

/**
 * Plages de défilement par section : arrive = 0 pour la première, sinon top − 0,12 × hauteur de vue ;
 * depart = max(arrive, top + height − hauteur de vue).
 */
export function sectionRanges(boxes: readonly SectionBox[], viewportHeight: number): SectionRange[] {
  return boxes.map((box, i) => {
    const arrive = i === 0 ? 0 : box.top - 0.12 * viewportHeight;
    return { key: box.key, arrive, depart: Math.max(arrive, box.top + box.height - viewportHeight) };
  });
}

export interface ScrollState {
  /** Indice de l'escale de départ dans `ranges`. */
  from: number;
  /** Indice de l'escale d'arrivée (= from au repos). */
  to: number;
  /** Avancement du vol entre les deux, de 0 à 1 (non lissé). */
  t: number;
}

/**
 * Position du défilement dans le voyage : i = dernière section avec arrive ≤ y (0 si aucune) ;
 * au repos si i est la dernière ou si y ≤ depart(i) ; sinon vol vers i + 1 avec
 * t = clamp((y − depart(i)) / max(1, arrive(i+1) − depart(i)), 0, 1). Liste vide → {0, 0, 0}.
 */
export function scrollState(ranges: readonly SectionRange[], scrollY: number): ScrollState {
  if (!ranges.length) return { from: 0, to: 0, t: 0 };
  let i = 0;
  while (i < ranges.length - 1 && ranges[i + 1].arrive <= scrollY) i++;
  const current = ranges[i];
  if (i === ranges.length - 1 || scrollY <= current.depart) return { from: i, to: i, t: 0 };
  const next = ranges[i + 1];
  return { from: i, to: i + 1, t: clamp((scrollY - current.depart) / Math.max(1, next.arrive - current.depart), 0, 1) };
}

/** Repères de la règle des distances (UA). « hero » se place comme le Soleil. */
export const RAIL_STOPS: readonly { key: StopKey; au: number }[] = [
  { key: "sun", au: 0 }, { key: "mercury", au: 0.387 }, { key: "venus", au: 0.723 }, { key: "earth", au: 1 },
  { key: "mars", au: 1.524 }, { key: "belt", au: 2.7 }, { key: "jupiter", au: 5.2 }, { key: "saturn", au: 9.54 },
  { key: "uranus", au: 19.19 }, { key: "neptune", au: 30.07 }, { key: "beyond", au: 45 },
];

/** Position verticale sur la règle (pourcentage) : 2 pour 0 UA, sinon 6 + 88 × (ln au − ln 0,3) / (ln 50 − ln 0,3). */
export function railPercent(au: number): number {
  if (au <= 0) return 2;
  return 6 + (88 * (Math.log(au) - Math.log(0.3))) / (Math.log(50) - Math.log(0.3));
}
