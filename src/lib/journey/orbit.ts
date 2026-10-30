import type { Vec3 } from "@/lib/astro/constants";
import { SUN, type PlanetKey } from "@/lib/astro/planets";
import { REAL_SCALE_PLANET_SHRINK, REAL_SCALE_SUN_SHRINK, zoomScale } from "@/lib/astro/scale";
import { angleDiff, isCosmicStop, RING_EXTENT, type CamState, type StopKey } from "@/lib/journey/camera";
import type { ScreenBand } from "@/lib/journey/screen";

/*
 * Géométrie du mode « Tourner autour » : la caméra tourne autour de la cible de l'escale, sous le contrôle des gestes,
 * du clavier et du pavé. Tout est pur et testé ici ; le moteur de la scène ne fait que relier ces fonctions.
 * Conventions de CamState : la caméra est en cible + dist × (cos elev cos azim, sin elev, cos elev sin azim).
 */

/** Escales où l'on peut tourner autour de la cible : toutes sauf l'interlude de la ceinture d'astéroïdes. */
export type ExploreStop = Exclude<StopKey, "belt">;

export function isExploreStop(key: StopKey): key is ExploreStop {
  return key !== "belt";
}

export interface OrbitView {
  /** Azimut de la caméra autour de la cible, en radians (convention de CamState.azim), dans ]−π, π]. */
  azim: number;
  /** Élévation, en radians, dans [−ORBIT_MAX_ELEV, ORBIT_MAX_ELEV]. */
  elev: number;
  /** ln(distance / distance de base de l'escale) : 0 au repos, ln ORBIT_MAX_PULLBACK au recul maximal. */
  distanceLog: number;
}

/** Gestes accumulés entre deux images. */
export interface OrbitInput {
  azim: number;
  elev: number;
  distanceLog: number;
  /** Revenir à la vue de départ avant d'appliquer le reste. */
  recenter: boolean;
}

export interface OrbitLimits {
  minDistanceLog: number;
  maxDistanceLog: number;
}

export interface OrbitContext {
  /** 0 = distances compressées, 1 = réelles. */
  realScale: number;
  /** Rayon affiché de la planète en distances compressées (unités de scène). */
  planetRadius(key: PlanetKey): number;
}

const DEG = Math.PI / 180;

/** Élévation maximale : la caméra ne passe jamais à la verticale de la cible (le haut de l'écran resterait indéfini). */
export const ORBIT_MAX_ELEV = 85 * DEG;
/** Recul maximal, en multiples de la distance de base. */
export const ORBIT_MAX_PULLBACK = 4;
/** Approche minimale d'une planète, en rayons affichés. */
export const ORBIT_MIN_RADII = 1.8;
/** Approche minimale d'une planète à anneaux, en multiples du rayon extérieur de ses anneaux (RING_EXTENT). */
export const RING_CLEARANCE = 1.15;
/** Distance minimale absolue (8 × le plan proche de 0,05) : en échelle réelle, la planète ne fait plus qu'un point. */
export const ORBIT_MIN_DISTANCE = 0.4;
/**
 * Approche minimale relative aux escales lointaines, sans astre cadré : un quart de la base aux étoiles voisines,
 * 0,4 ailleurs (Voie lactée, Groupe local, Univers observable, multivers).
 */
export const ORBIT_MIN_RATIO = { stars: 0.25, galaxy: 0.4, localGroup: 0.4, universe: 0.4, multiverse: 0.4 } as const;
/** Distance minimale caméra–centre du Soleil, en rayons solaires affichés (le moteur la garde aussi en vol). */
export const SUN_CLEARANCE = 2.5;
/** Pas du clavier et du pavé, de côté (azimut). */
export const KEY_ROTATE_STEP = 15 * DEG;
/** Pas du clavier et du pavé, en hauteur (élévation). */
export const KEY_TILT_STEP = 10 * DEG;
/** Pas du clavier et du pavé en distance : × 1,25 ou ÷ 1,25. */
export const KEY_ZOOM_STEP = Math.log(1.25);
/** Un glisser sur toute la hauteur de la vue fait tourner d'un demi-tour. */
export const DRAG_ROTATE_PER_VIEW_HEIGHT = Math.PI;
/** Changement de ln(distance) par pixel de molette. */
export const WHEEL_ZOOM_PER_PX = 0.0015;
/** Plus grand changement de ln(distance) pour un seul événement de molette (un cran de souris, une page). */
const WHEEL_ZOOM_MAX = 0.5;
/** Pixels par ligne quand la molette compte en lignes (deltaMode 1, Firefox). */
const WHEEL_LINE_PX = 16;
/**
 * Cadre des escales lointaines (des étoiles voisines au multivers) pendant l'exploration, au sens d'une bande libre
 * de `cameraFor` (fractions de la hauteur de la vue) : le contenu est masqué, le cadre (disque ou sphère) remplit tout
 * l'écran, à 8 % près en haut et en bas (barre d'exploration, pavé et dock). Symétrique, comme la caméra
 * d'exploration qui vise le centre de l'écran. Sans lui, la base serait la distance sans mise en page (640, 1 120 en
 * portrait) : la caméra reculerait à l'entrée, jusqu'à 60 % sur téléphone. Les astres, l'accueil et l'au-delà gardent
 * leur base sans cadre.
 */
export const EXPLORE_COSMIC_BAND: Readonly<ScreenBand> = { top: 0.08, bottom: 0.92 };
/** Vitesse à laquelle la vue affichée rejoint la vue demandée, par seconde. */
export const ORBIT_EASE_RATE = 12;
/** Fondu d'entrée et de sortie de l'exploration, en secondes. */
export const EXPLORE_TRANSITION_S = 0.6;
/** Écart sous lequel la vue affichée se pose sur la vue demandée (radians, ou ln de distance). */
const ORBIT_SNAP = 1e-4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Angle ramené dans ]−π, π]. */
const wrapAngle = (angle: number) => angleDiff(0, angle);
const emptyView = (): OrbitView => ({ azim: 0, elev: 0, distanceLog: 0 });
const emptyCam = (): CamState => ({
  tx: 0, ty: 0, tz: 0, dist: 1, azim: 0, elev: 0, offX: 0, offY: 0, planet: false, zoom: 0,
});

/**
 * Rayon de la sphère de garde du Soleil, en unités de scène :
 * SUN.displayRadius × SUN_CLEARANCE × lerp(1, REAL_SCALE_SUN_SHRINK, realScale) × zoomScale(zoom).
 * Soit 17,5 en distances compressées, 0,875 en distances réelles, 0,175 au zoom cosmique 2.
 */
export function sunClearance(realScale: number, zoom: number): number {
  return SUN.displayRadius * SUN_CLEARANCE * lerp(1, REAL_SCALE_SUN_SHRINK, realScale) * zoomScale(zoom);
}

/** Vue de départ : angles de la caméra de base (azimut ramené dans ]−π, π], élévation bornée), distanceLog 0. */
export function orbitFromCamera(base: CamState, out: OrbitView = emptyView()): OrbitView {
  out.azim = wrapAngle(base.azim);
  out.elev = clamp(base.elev, -ORBIT_MAX_ELEV, ORBIT_MAX_ELEV);
  out.distanceLog = 0;
  return out;
}

/**
 * Bornes de distanceLog. max = ln ORBIT_MAX_PULLBACK. min = ln(min(dMin, base.dist) / base.dist) : une base déjà
 * plus proche que dMin ne recule pas d'elle-même, on ne peut simplement pas s'approcher davantage. dMin :
 * - planète : max(ORBIT_MIN_RADII × rayon affiché, RING_CLEARANCE × RING_EXTENT × rayon affiché, ORBIT_MIN_DISTANCE),
 *   rayon affiché = planetRadius × lerp(1, REAL_SCALE_PLANET_SHRINK, realScale) ;
 * - sun, hero, beyond : max(sunClearance(realScale, base.zoom), ORBIT_MIN_DISTANCE) ;
 * - escales lointaines (des étoiles voisines au multivers) : ORBIT_MIN_RATIO × base.dist.
 */
export function orbitLimits(stop: ExploreStop, base: CamState, ctx: OrbitContext): OrbitLimits {
  let minDistance: number;
  if (isCosmicStop(stop)) {
    minDistance = ORBIT_MIN_RATIO[stop] * base.dist;
  } else if (stop === "sun" || stop === "hero" || stop === "beyond") {
    minDistance = Math.max(sunClearance(ctx.realScale, base.zoom), ORBIT_MIN_DISTANCE);
  } else {
    const radius = ctx.planetRadius(stop) * lerp(1, REAL_SCALE_PLANET_SHRINK, ctx.realScale);
    const rings = RING_EXTENT[stop];
    minDistance = Math.max(
      ORBIT_MIN_RADII * radius,
      rings === undefined ? 0 : RING_CLEARANCE * rings * radius,
      ORBIT_MIN_DISTANCE,
    );
  }
  return {
    minDistanceLog: Math.log(Math.min(minDistance, base.dist) / base.dist),
    maxDistanceLog: Math.log(ORBIT_MAX_PULLBACK),
  };
}

/**
 * Applique les gestes à la vue : recentrage d'abord (la vue repart de `home`), puis rotations et changement de
 * distance ajoutés ; azimut ramené dans ]−π, π], élévation bornée à ±ORBIT_MAX_ELEV, distanceLog bornée aux limites.
 * Sans geste, borne seulement la vue (limites changées entre deux images). `out` peut être `view`.
 */
export function applyOrbitInput(
  view: OrbitView,
  input: OrbitInput,
  home: OrbitView,
  limits: OrbitLimits,
  out: OrbitView = emptyView(),
): OrbitView {
  const from = input.recenter ? home : view;
  const azim = wrapAngle(from.azim + input.azim);
  const elev = clamp(from.elev + input.elev, -ORBIT_MAX_ELEV, ORBIT_MAX_ELEV);
  const distanceLog = clamp(from.distanceLog + input.distanceLog, limits.minDistanceLog, limits.maxDistanceLog);
  out.azim = azim;
  out.elev = elev;
  out.distanceLog = distanceLog;
  return out;
}

/**
 * Rapproche la vue affichée de la vue demandée d'une fraction `factor` (1 : l'atteint), l'azimut par le plus court
 * chemin. Quand il ne reste que moins de ORBIT_SNAP sur chaque composante, se pose exactement sur la vue demandée :
 * le moteur sait alors qu'il peut cesser de rendre. `out` peut être `shown`.
 */
export function easeOrbitView(
  shown: OrbitView,
  target: OrbitView,
  factor: number,
  out: OrbitView = emptyView(),
): OrbitView {
  const azim = wrapAngle(shown.azim + angleDiff(shown.azim, target.azim) * factor);
  const elev = lerp(shown.elev, target.elev, factor);
  const distanceLog = lerp(shown.distanceLog, target.distanceLog, factor);
  const arrived =
    Math.abs(angleDiff(azim, target.azim)) < ORBIT_SNAP &&
    Math.abs(target.elev - elev) < ORBIT_SNAP &&
    Math.abs(target.distanceLog - distanceLog) < ORBIT_SNAP;
  out.azim = arrived ? target.azim : azim;
  out.elev = arrived ? target.elev : elev;
  out.distanceLog = arrived ? target.distanceLog : distanceLog;
  return out;
}

/**
 * Plus grande distance ≤ `dist`, le long de `dir` (unitaire) depuis `target`, avant d'entrer dans la sphère de centre
 * l'origine (le Soleil) et de rayon `radius`. Rayon P(s) = target + s × dir : s² + 2 s (target · dir) + |target|² − r² = 0.
 * Renvoie `dist` si la cible est déjà dans la sphère, ou si le rayon ne la rencontre pas devant elle.
 */
export function distanceBeforeSphere(target: Vec3, dir: Vec3, dist: number, radius: number): number {
  const c = target.x * target.x + target.y * target.y + target.z * target.z - radius * radius;
  if (c <= 0) return dist;
  const b = target.x * dir.x + target.y * dir.y + target.z * dir.z;
  const discriminant = b * b - c;
  // Racines de même signe (c > 0) et de somme −2b : avec b ≥ 0, la sphère est derrière la cible.
  if (discriminant < 0 || b >= 0) return dist;
  return Math.min(dist, -b - Math.sqrt(discriminant));
}

/**
 * Caméra d'exploration : cible, zoom et drapeau planet de `base` ; angles de `view` ;
 * dist = base.dist × e^distanceLog, raccourcie pour ne jamais entrer dans la sphère de garde du Soleil de rayon
 * `clearance` (distanceBeforeSphere) ; offX = offY = 0 : la cible au centre de l'écran, le contenu étant masqué.
 */
export function orbitCamera(base: CamState, view: OrbitView, clearance: number, out: CamState = emptyCam()): CamState {
  const h = Math.cos(view.elev);
  const direction = { x: h * Math.cos(view.azim), y: Math.sin(view.elev), z: h * Math.sin(view.azim) };
  const target = { x: base.tx, y: base.ty, z: base.tz };
  const dist = distanceBeforeSphere(target, direction, base.dist * Math.exp(view.distanceLog), clearance);
  out.tx = base.tx;
  out.ty = base.ty;
  out.tz = base.tz;
  out.dist = dist;
  out.azim = view.azim;
  out.elev = view.elev;
  out.offX = 0;
  out.offY = 0;
  out.planet = base.planet;
  out.zoom = base.zoom;
  return out;
}

/**
 * Angles de la caméra placée dans la direction `dir` (unitaire) depuis la cible : azim = atan2(z, x),
 * elev = asin(y), bornée à ±ORBIT_MAX_ELEV.
 */
export function directionToView(dir: Vec3): { azim: number; elev: number } {
  return {
    azim: Math.atan2(dir.z, dir.x),
    elev: clamp(Math.asin(clamp(dir.y, -1, 1)), -ORBIT_MAX_ELEV, ORBIT_MAX_ELEV),
  };
}

/*
 * Gestes. Convention : l'astre suit le doigt. Glisser vers la droite fait tourner la caméra vers la gauche (azimut +),
 * glisser vers le bas la fait monter (élévation +).
 */

/** Rotation d'un glisser de (dx, dy) px : DRAG_ROTATE_PER_VIEW_HEIGHT radians par hauteur de vue. */
export function dragToRotation(dx: number, dy: number, viewHeight: number): { azim: number; elev: number } {
  const perPixel = viewHeight > 0 ? DRAG_ROTATE_PER_VIEW_HEIGHT / viewHeight : 0;
  return { azim: dx * perPixel, elev: dy * perPixel };
}

/**
 * Changement de ln(distance) pour un événement de molette : deltaY en px (deltaMode 0), en lignes de WHEEL_LINE_PX px
 * (deltaMode 1) ou en pages d'une hauteur de vue (deltaMode 2), × WHEEL_ZOOM_PER_PX, borné à ±0,5.
 * Molette tournée vers soi (deltaY > 0) : la caméra recule.
 */
export function wheelToZoom(deltaY: number, deltaMode: number, viewHeight: number): number {
  const pixels = deltaMode === 1 ? deltaY * WHEEL_LINE_PX : deltaMode === 2 ? deltaY * viewHeight : deltaY;
  return clamp(pixels * WHEEL_ZOOM_PER_PX, -WHEEL_ZOOM_MAX, WHEEL_ZOOM_MAX);
}

/** −ln(span / previousSpan) : des doigts qui s'écartent rapprochent la caméra. 0 si l'un des écarts est nul. */
export function pinchToZoom(previousSpan: number, span: number): number {
  return previousSpan > 0 && span > 0 ? -Math.log(span / previousSpan) : 0;
}

export type OrbitKeyCommand =
  | { kind: "rotate"; azim: number; elev: number }
  | { kind: "zoom"; distanceLog: number }
  | { kind: "recenter" }
  | { kind: "exit" };

/**
 * Commande d'une touche (valeur de `KeyboardEvent.key`) :
 * ArrowLeft / ArrowRight : azimut ∓ / ± 15° ; ArrowUp / ArrowDown : élévation − / + 10°, comme un glisser ;
 * « + » et « = » : se rapprocher (−ln 1,25) ; « - » : s'éloigner (+ln 1,25) ; « 0 » et Home : recentrer ;
 * Escape : quitter ; toute autre touche : null.
 */
export function orbitKeyCommand(key: string): OrbitKeyCommand | null {
  switch (key) {
    case "ArrowLeft":
      return { kind: "rotate", azim: -KEY_ROTATE_STEP, elev: 0 };
    case "ArrowRight":
      return { kind: "rotate", azim: KEY_ROTATE_STEP, elev: 0 };
    case "ArrowUp":
      return { kind: "rotate", azim: 0, elev: -KEY_TILT_STEP };
    case "ArrowDown":
      return { kind: "rotate", azim: 0, elev: KEY_TILT_STEP };
    case "+":
    case "=":
      return { kind: "zoom", distanceLog: -KEY_ZOOM_STEP };
    case "-":
      return { kind: "zoom", distanceLog: KEY_ZOOM_STEP };
    case "0":
    case "Home":
      return { kind: "recenter" };
    case "Escape":
      return { kind: "exit" };
    default:
      return null;
  }
}
