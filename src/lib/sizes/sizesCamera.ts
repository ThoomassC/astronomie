import type { ScreenBand, ScreenZone } from "@/lib/journey/screen";
import type { PlacedStar } from "@/lib/sizes/layout";
import type { SizeStopKey } from "@/lib/sizes/stops";

const D2R = Math.PI / 180;
/** Part du vol pendant laquelle le halo de l'étoile qui arrive entre en fondu (ou s'éteint, au retour). */
const HALO_FADE = 0.3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Transition d'Hermite 3x² − 2x³, de 0 en `edge0` à 1 en `edge1`. */
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};
const emptyCam = (): SizesCam => ({ tx: 0, dist: 1, offX: 0, offY: 0 });

/**
 * Caméra de la scène des tailles. Elle regarde la cible (tx, 0, 0) depuis le côté +z, élevée de SIZES_VIEW_ELEV_DEG,
 * x croissant vers la droite de l'écran : l'étoile précédente, plus petite, apparaît à droite de la courante.
 * Le regard étant perpendiculaire à l'axe x, les centres des étoiles sont tous à la profondeur `dist`.
 */
export interface SizesCam {
  /** Cible (tx, 0, 0), en R☉. */
  tx: number;
  /** Distance de la caméra à la cible, en R☉. */
  dist: number;
  /** La cible est à 0,5 + offX de la largeur (positif = vers la droite). */
  offX: number;
  /** La cible est à 0,5 + offY de la hauteur (négatif = vers le haut). */
  offY: number;
}

/** Élévation de la caméra au-dessus du plan des étoiles, en degrés : un peu de relief, sans effet sur le cadrage. */
export const SIZES_VIEW_ELEV_DEG = 5;
/** Recul de l'introduction sur le repos de la plus petite étoile. */
export const SIZES_INTRO_PULLBACK = 1.6;
/**
 * Part du cadre que peut occuper ce que la caméra cadre au repos, en largeur et en hauteur :
 * - zone libre du grand écran : 90 % de la largeur de la zone, 80 % de la hauteur de l'écran ;
 * - bande libre de la mise en page compacte : 80 % de la largeur de l'écran, 90 % de la hauteur de la bande ;
 * - ni l'une ni l'autre : 70 % de la largeur et de la hauteur de l'écran.
 */
export const SIZES_FILL = { zoneWidth: 0.9, zoneHeight: 0.8, bandWidth: 0.8, bandHeight: 0.9, plainWidth: 0.7, plainHeight: 0.7 } as const;

export interface SizesFrameContext {
  /** Largeur / hauteur de la vue. */
  aspect: number;
  /** Champ vertical de la caméra, en degrés. */
  fovDeg: number;
  /** Mise en page compacte : bande libre au-dessus de la plaque repliée, `null` ailleurs. Prioritaire sur la zone. */
  band: ScreenBand | null;
  /** Grand écran : zone libre entre la plaque (à gauche) et la règle des tailles (à droite), `null` ailleurs. */
  zone: ScreenZone | null;
}

/**
 * Caméra au repos sur une escale. Sur l'étoile i : cadre la paire (i, i − 1), l'étoile seule pour i = 0 ;
 * boîte [xᵢ − rᵢ ; xᵢ₋₁ + rᵢ₋₁] × [−rᵢ ; rᵢ] ; tx = centre de la boîte ;
 * dist = max(demi-largeur / tanW, rᵢ / sin(atan(tanH))), la plus contraignante gagne : la demi-largeur est prise
 * au plan de la cible, et la sphère de rayon rᵢ, à la profondeur dist, a le demi-angle apparent atan(tanH).
 * - Bande (prioritaire, comme au voyage) : tanW = 0,8 × aspect × tan(fov/2), tanH = 0,9 × hauteur de bande × tan(fov/2),
 *   offX = 0, offY = milieu de bande − 0,5.
 * - Zone : tanW = 0,9 × largeur de zone × aspect × tan(fov/2), tanH = 0,8 × tan(fov/2), offX = milieu de zone − 0,5, offY = 0.
 * - Sinon : 0,7 et 0,7, décalages nuls.
 * « intro » : repos de l'étoile 0, dist × SIZES_INTRO_PULLBACK.
 * Lève une erreur si l'étoile de l'escale (l'étoile 0 pour « intro ») n'est pas posée.
 */
export function sizesRestCamera(
  placed: readonly PlacedStar[],
  stop: SizeStopKey,
  ctx: SizesFrameContext,
  out: SizesCam = emptyCam(),
): SizesCam {
  const index = stop === "intro" ? 0 : placed.findIndex((star) => star.key === stop);
  const star: PlacedStar | undefined = placed[index];
  if (!star) throw new Error(`Étoile absente de la disposition : ${stop}`);
  const previous = index > 0 ? placed[index - 1] : star;
  const left = star.x - star.radius;
  const right = previous.x + previous.radius;
  const tanHalf = Math.tan((ctx.fovDeg * D2R) / 2);
  let tanWidth: number;
  let tanHeight: number;
  let offX = 0;
  let offY = 0;
  if (ctx.band) {
    tanWidth = SIZES_FILL.bandWidth * ctx.aspect * tanHalf;
    tanHeight = SIZES_FILL.bandHeight * (ctx.band.bottom - ctx.band.top) * tanHalf;
    offY = (ctx.band.top + ctx.band.bottom) / 2 - 0.5;
  } else if (ctx.zone) {
    tanWidth = SIZES_FILL.zoneWidth * (ctx.zone.right - ctx.zone.left) * ctx.aspect * tanHalf;
    tanHeight = SIZES_FILL.zoneHeight * tanHalf;
    offX = (ctx.zone.left + ctx.zone.right) / 2 - 0.5;
  } else {
    tanWidth = SIZES_FILL.plainWidth * ctx.aspect * tanHalf;
    tanHeight = SIZES_FILL.plainHeight * tanHalf;
  }
  const dist = Math.max((right - left) / 2 / tanWidth, star.radius / Math.sin(Math.atan(tanHeight)));
  out.tx = (left + right) / 2;
  out.dist = stop === "intro" ? dist * SIZES_INTRO_PULLBACK : dist;
  out.offX = offX;
  out.offY = offY;
  return out;
}

/**
 * Vol entre deux caméras (s déjà lissé par l'appelant) :
 * - dist géométrique : a.dist × (b.dist / a.dist)^s, soit exp(lerp(ln a.dist, ln b.dist, s)) ;
 * - la cible suit le zoom : tx = lerp(a.tx, b.tx, w), w = (dist − a.dist) / (b.dist − a.dist), calculé sous la forme
 *   expm1(s·L) / expm1(L) avec L = ln(b.dist / a.dist), exacte même pour des distances très proches ; w = s si elles
 *   sont égales. La cible avance donc au rythme où l'image grossit : rien ne glisse plus vite que le zoom ;
 * - offX, offY = lerp(…, s).
 */
export function sizesFlightCamera(a: SizesCam, b: SizesCam, s: number, out: SizesCam = emptyCam()): SizesCam {
  const logRatio = Math.log(b.dist / a.dist);
  const w = logRatio === 0 ? s : Math.expm1(s * logRatio) / Math.expm1(logRatio);
  const dist = a.dist * Math.exp(s * logRatio);
  const tx = lerp(a.tx, b.tx, w);
  const offX = lerp(a.offX, b.offX, s);
  const offY = lerp(a.offY, b.offY, s);
  out.tx = tx;
  out.dist = dist;
  out.offX = offX;
  out.offY = offY;
  return out;
}

/**
 * Nombre d'étoiles dessinées, les plus petites d'abord (indices dans la disposition) : fromIndex + 1 au repos (t = 0) ;
 * max(fromIndex, toIndex) + 1 pendant un vol (t > 0). L'étoile suivante n'est dessinée qu'une fois le vol commencé,
 * hors champ à cet instant, et la plus grande des deux le reste jusqu'au repos au retour.
 */
export function visibleStarCount(fromIndex: number, toIndex: number, t: number): number {
  return (t > 0 ? Math.max(fromIndex, toIndex) : fromIndex) + 1;
}

/**
 * Opacité du halo de l'étoile `index`. Seule change celle de l'étoile qui arrive (la plus grande des deux du vol) :
 * smoothstep(0 ; 0,3 ; t) vers l'avant (toIndex > fromIndex, étoile toIndex), smoothstep(0 ; 0,3 ; 1 − t) en retour
 * (étoile fromIndex) ; 1 pour toutes les autres, et au repos.
 */
export function haloOpacity(index: number, fromIndex: number, toIndex: number, t: number): number {
  if (toIndex > fromIndex && index === toIndex) return smoothstep(0, HALO_FADE, t);
  if (toIndex < fromIndex && index === fromIndex) return smoothstep(0, HALO_FADE, 1 - t);
  return 1;
}
