import type { Vec3 } from "@/lib/astro/constants";
import type { ScreenBand, ScreenZone } from "@/lib/journey/screen";
import type { PlacedObject } from "@/lib/sizes/layout";
import type { SizeStopKey } from "@/lib/sizes/stops";

const D2R = Math.PI / 180;
/** Part du vol pendant laquelle le halo de l'astre qui arrive entre en fondu (ou s'éteint, au retour). */
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
 * x croissant vers la droite de l'écran : l'astre précédent, plus petit, apparaît à droite du courant.
 * Le regard étant perpendiculaire à l'axe x, les centres des astres sont tous à la profondeur `dist`.
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
/** Recul de l'introduction sur le repos du plus petit astre. */
export const SIZES_INTRO_PULLBACK = 1.6;
/**
 * Part du cadre que peut occuper ce que la caméra cadre au repos, en largeur et en hauteur :
 * - zone libre du grand écran : 90 % de la largeur de la zone, 80 % de la hauteur de l'écran ;
 * - bande libre de la mise en page compacte : 80 % de la largeur de l'écran, 90 % de la hauteur de la bande ; l'astre
 *   courant seul y prend 65 % de la largeur quand la paire le ferait plus petit (`bandCurrentWidth`) ;
 * - ni l'une ni l'autre : 70 % de la largeur et de la hauteur de l'écran.
 */
export const SIZES_FILL = {
  zoneWidth: 0.9,
  zoneHeight: 0.8,
  bandWidth: 0.8,
  bandHeight: 0.9,
  /** Bande : part de la largeur que prend l'astre courant, cadré seul, quand la paire le ferait plus petit. */
  bandCurrentWidth: 0.65,
  plainWidth: 0.7,
  plainHeight: 0.7,
} as const;

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
 * Caméra au repos sur une escale, cadrée sur les encombrements (e). Sur l'astre i : cadre la paire (i, i − 1), l'astre
 * seul pour i = 0 ; boîte [xᵢ − eᵢ ; xᵢ₋₁ + eᵢ₋₁] × [−eᵢ ; eᵢ] ; tx = centre de la boîte ;
 * dist = max(demi-largeur / tanW, eᵢ / sin(atan(tanH))), la plus contraignante gagne : la demi-largeur est prise
 * au plan de la cible, et la sphère de rayon eᵢ, à la profondeur dist, a le demi-angle apparent atan(tanH).
 * - Bande (prioritaire, comme au voyage) : tanW = 0,8 × aspect × tan(fov/2), tanH = 0,9 × hauteur de bande × tan(fov/2),
 *   offX = 0, offY = milieu de bande − 0,5. L'astre courant d'abord : cadré seul (tx = xᵢ), il prendrait 65 % de la
 *   largeur à dist = max(eᵢ / (0,65 × aspect × tan(fov/2)), eᵢ / sin(atan(tanH))) ; si c'est plus près que la paire, il
 *   l'emporte. La précédente sort alors par la droite et se compare pendant le vol ; la suivante reste hors champ.
 * - Zone : tanW = 0,9 × largeur de zone × aspect × tan(fov/2), tanH = 0,8 × tan(fov/2), offX = milieu de zone − 0,5, offY = 0.
 * - Sinon : 0,7 et 0,7, décalages nuls.
 * « intro » : repos de l'astre 0, dist × SIZES_INTRO_PULLBACK.
 * Lève une erreur si l'astre de l'escale (l'astre 0 pour « intro ») n'est pas posé.
 */
export function sizesRestCamera(
  placed: readonly PlacedObject[],
  stop: SizeStopKey,
  ctx: SizesFrameContext,
  out: SizesCam = emptyCam(),
): SizesCam {
  const index = stop === "intro" ? 0 : placed.findIndex((object) => object.key === stop);
  const current: PlacedObject | undefined = placed[index];
  if (!current) throw new Error(`Astre absent de la disposition : ${stop}`);
  const previous = index > 0 ? placed[index - 1] : current;
  const left = current.x - current.extent;
  const right = previous.x + previous.extent;
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
  const heightDist = current.extent / Math.sin(Math.atan(tanHeight));
  let dist = Math.max((right - left) / 2 / tanWidth, heightDist);
  let tx = (left + right) / 2;
  if (ctx.band) {
    const alone = Math.max(current.extent / (SIZES_FILL.bandCurrentWidth * ctx.aspect * tanHalf), heightDist);
    if (alone < dist) {
      dist = alone;
      tx = current.x;
    }
  }
  out.tx = tx;
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
 * Nombre d'astres dessinés, les plus petits d'abord (indices dans la disposition) : fromIndex + 1 au repos (t = 0) ;
 * max(fromIndex, toIndex) + 1 pendant un vol (t > 0). L'astre suivant n'est dessiné qu'une fois le vol commencé,
 * hors champ à cet instant, et le plus grand des deux le reste jusqu'au repos au retour.
 */
export function visibleObjectCount(fromIndex: number, toIndex: number, t: number): number {
  return (t > 0 ? Math.max(fromIndex, toIndex) : fromIndex) + 1;
}

/**
 * Opacité du halo de l'astre `index` (fondu d'arrivée d'un trou noir). Seule change celle de l'astre qui arrive (le plus
 * grand des deux du vol) : smoothstep(0 ; 0,3 ; t) vers l'avant (toIndex > fromIndex, astre toIndex),
 * smoothstep(0 ; 0,3 ; 1 − t) en retour (astre fromIndex) ; 1 pour tous les autres, et au repos.
 */
export function haloOpacity(index: number, fromIndex: number, toIndex: number, t: number): number {
  if (toIndex > fromIndex && index === toIndex) return smoothstep(0, HALO_FADE, t);
  if (toIndex < fromIndex && index === fromIndex) return smoothstep(0, HALO_FADE, 1 - t);
  return 1;
}

/** Disque d'un astre à l'écran, en px depuis le coin haut gauche de la vue : centre, rayon apparent de son encombrement. */
export interface ScreenDisc {
  x: number;
  y: number;
  radius: number;
}

/** Pixels par unité de tangente au centre de l'image : hauteur de la vue / (2 tan(champ / 2)). */
const pixelsPerTangent = (viewHeight: number, fovDeg: number) => viewHeight / (2 * Math.tan((fovDeg * D2R) / 2));

/**
 * Disque de l'astre (centre x sur l'axe, encombrement e) vu par la caméra `cam` dans la vue `view` (px CSS). Le regard
 * étant perpendiculaire à l'axe x, son centre est à la profondeur cam.dist, sur la ligne horizontale de la cible :
 * x = (0,5 + offX) × largeur + (x − tx) / dist × f, y = (0,5 + offY) × hauteur, f = hauteur / (2 tan(champ / 2)).
 * Rayon apparent : f × tan(asin(e / d)), d la distance de la caméra au centre ; infini quand la caméra est dedans. Même
 * calcul que la projection de three pour ces points (décalage de vue compris), sans allocation.
 */
export function screenDisc(
  object: { x: number; extent: number },
  cam: SizesCam,
  ctx: Pick<SizesFrameContext, "fovDeg">,
  view: { width: number; height: number },
  out: ScreenDisc = { x: 0, y: 0, radius: 0 },
): ScreenDisc {
  const f = pixelsPerTangent(view.height, ctx.fovDeg);
  const dx = object.x - cam.tx;
  const distance = Math.hypot(dx, cam.dist);
  out.x = (0.5 + cam.offX) * view.width + (dx / cam.dist) * f;
  out.y = (0.5 + cam.offY) * view.height;
  out.radius =
    distance > object.extent ? (f * object.extent) / Math.sqrt(distance * distance - object.extent * object.extent) : Infinity;
  return out;
}

/** Point de la scène à l'écran, en px depuis le coin haut gauche de la vue, et sa profondeur le long du regard (R☉). */
export interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
}

/**
 * Profondeur (R☉) du point (x, y, z en R☉) le long du regard de la caméra `cam`, négative derrière elle :
 * dist − (y sin 5° + z cos 5°). Celle du centre d'un astre est `dist`.
 */
export function viewDepth(point: Vec3, cam: SizesCam): number {
  const elevation = SIZES_VIEW_ELEV_DEG * D2R;
  return cam.dist - (point.y * Math.sin(elevation) + point.z * Math.cos(elevation));
}

/**
 * Point (x, y, z en R☉) vu par la caméra `cam`, posée comme celle du moteur : en (tx, dist sin 5°, dist cos 5°), elle
 * vise la cible (tx, 0, 0), image décalée de (offX, offY). En px de la vue : x = (0,5 + offX) × largeur + (v·droite /
 * profondeur) × f, y = (0,5 + offY) × hauteur − (v·haut / profondeur) × f, v du point à la caméra, f = hauteur /
 * (2 tan(champ / 2)). Même projection que three ; sur l'axe des astres, le centre que donne screenDisc. `null` pour un
 * point qui n'est pas devant la caméra.
 */
export function screenPoint(
  point: Vec3,
  cam: SizesCam,
  ctx: Pick<SizesFrameContext, "fovDeg">,
  view: { width: number; height: number },
  out: ScreenPoint = { x: 0, y: 0, depth: 0 },
): ScreenPoint | null {
  const depth = viewDepth(point, cam);
  if (depth <= 0) return null;
  // Axes de la caméra : droite (1, 0, 0), haut (0, cos 5°, −sin 5°).
  const elevation = SIZES_VIEW_ELEV_DEG * D2R;
  const f = pixelsPerTangent(view.height, ctx.fovDeg);
  out.x = (0.5 + cam.offX) * view.width + ((point.x - cam.tx) / depth) * f;
  out.y = (0.5 + cam.offY) * view.height - ((point.y * Math.cos(elevation) - point.z * Math.sin(elevation)) / depth) * f;
  out.depth = depth;
  return out;
}

/**
 * Bord droit de la silhouette de l'astre à l'écran, en px depuis la gauche de la vue de largeur `viewWidth` : le rayon
 * tangent droit à sa sphère d'encombrement fait avec l'axe de visée l'angle atan2(x − tx, dist) + asin(e / d) ; plafonné
 * à 90° (une sphère qui déborde sur le côté de la caméra a son bord à l'infini, à droite).
 */
export function rightEdgePx(
  object: { x: number; extent: number },
  cam: SizesCam,
  ctx: Pick<SizesFrameContext, "aspect" | "fovDeg">,
  viewWidth: number,
): number {
  const dx = object.x - cam.tx;
  const angle = Math.atan2(dx, cam.dist) + Math.asin(Math.min(1, object.extent / Math.hypot(dx, cam.dist)));
  const tanHalf = Math.tan((ctx.fovDeg * D2R) / 2);
  return (0.5 + cam.offX + Math.tan(Math.min(angle, Math.PI / 2)) / (2 * ctx.aspect * tanHalf)) * viewWidth;
}

/**
 * Rampe d'effacement près de la règle, en px CSS : la marge entre la zone libre et la règle (celle des coquilles du
 * Voyage, ADR 0005).
 */
export const RAIL_FADE_PX = 24;

/**
 * Part visible d'un astre qui déborde de la zone libre du grand écran vers la règle : 1 − smoothstep(0 ; 24 ; débord), le
 * débord étant l'écart, en px CSS, entre le bord droit de sa silhouette et celui de la zone. Il s'efface avant de
 * passer sous la règle ou d'être coupé par le bord de l'écran, d'un seul côté : le suivant entre toujours par la
 * gauche, sous la plaque.
 */
export function railSideFade(rightEdge: number, zoneRight: number): number {
  return 1 - smoothstep(0, RAIL_FADE_PX, rightEdge - zoneRight);
}
