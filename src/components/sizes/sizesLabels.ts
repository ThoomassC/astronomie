import { anchoredBox, placeMarkedLabel, pointBox, type LabelBox, type MarkerLayout } from "@/components/scene/labels";
import type { ScreenBand, ScreenZone } from "@/lib/journey/screen";
import type { ScreenDisc } from "@/lib/sizes/sizesCamera";

/*
 * Étiquettes de la scène des tailles, posées sans jamais se recouvrir ni recouvrir un astre, la barre, la règle, la place
 * des plaques ou l'échelle graphique : au-dessus du limbe d'un astre grand à l'écran (le nom seul quand la forme
 * complète ne tient pas), sur un anneau à sa couleur pour un petit, anneau « ici » pour le Soleil devenu un point. Un
 * astre se mesure ici à son encombrement : un trou noir éclaire bien au-delà de son ombre. Logique pure, testée sur les
 * vues de référence ; le moteur mesure le DOM et applique le résultat.
 */

/** Diamètre à l'écran, en px, dès lequel l'étiquette d'un astre passe au-dessus de son limbe… */
const LIMB_ENTER_PX = 24;
/** … et sous lequel elle retourne sur son anneau : l'écart évite qu'elle saute d'une disposition à l'autre. */
const LIMB_EXIT_PX = 18;
/** Air entre le limbe et l'étiquette, en px. */
const LIMB_GAP_PX = 8;
/** Diamètre à l'écran, en px, sous lequel le Soleil reçoit l'anneau « ici » (celui de « Vous êtes ici »). */
const SUN_RING_BELOW_PX = 14;
/** Bande réservée en haut de la vue : la barre (72 px au plus). */
const TOP_MARGIN = 72;
/** Air laissé au bas et sur les côtés de la vue, en px (pas de dock sur la page Tailles). */
const EDGE_MARGIN = 8;
/** Sous ce diamètre à l'écran, en px, un astre est réservé par le carré de son point ; au-delà, par une croix. */
const RESERVED_DISC_PX = 24;
/**
 * Demi-côté court de la croix qui réserve un grand disque, en rayons : 0,72² + 0,72² > 1, donc aucun point du disque
 * n'échappe aux deux boîtes, alors que les coins du carré englobant restent libres.
 */
const DISC_CROSS_RATIO = 0.72;
/** Boîte vide, qui ne recouvre rien : tient la place d'une boîte réservée, écartée le temps d'une pose. */
const EMPTY_BOX: LabelBox = [0, 0, 0, 0];

/** Étiquette d'un astre : au-dessus de son limbe (grand à l'écran), ou sur un anneau à sa couleur (petit). */
export type StarLabelMode = "limb" | "ring";

/**
 * Disposition de l'étiquette d'un astre de `diameterPx` px de diamètre à l'écran : au-dessus du limbe dès 24 px ;
 * une étiquette déjà au-dessus du limbe y reste jusqu'à 18 px (hystérésis) ; sur un anneau sinon.
 */
export function starLabelMode(diameterPx: number, previous: StarLabelMode | null): StarLabelMode {
  if (diameterPx >= LIMB_ENTER_PX) return "limb";
  return previous === "limb" && diameterPx >= LIMB_EXIT_PX ? "limb" : "ring";
}

const overlaps = (a: LabelBox, b: LabelBox) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/**
 * Croix de deux boîtes qui couvre le disque de centre (x, y) et de rayon `radiusPx` sans réserver ses coins : demi-côtés
 * r × 0,72 r et 0,72 r × r. Aucune étiquette ne se pose sur un grand astre, même voisin (l'étiquette de Rigel ne
 * recouvre plus Antarès A).
 */
export function discBoxes(x: number, y: number, radiusPx: number): [LabelBox, LabelBox] {
  const short = DISC_CROSS_RATIO * radiusPx;
  return [
    [x - radiusPx, y - short, x + radiusPx, y + short],
    [x - short, y - radiusPx, x + short, y + radiusPx],
  ];
}

/** Taille d'une étiquette de limbe, en px : complète (« Rigel · 74 R☉ »), et largeur du nom seul (forme courte). */
export interface LimbLabelSize {
  width: number;
  height: number;
  shortWidth: number;
}

/**
 * Gauche (px) d'une étiquette de largeur `width` sur la ligne [top ; bottom] qui ne recouvre aucune boîte occupée et
 * couvre encore x : centrée si possible, sinon accolée au bord d'une boîte qui la gênait, au plus près du centrage ;
 * toujours entre `minLeft` et `maxLeft`. `null` si aucune ne convient.
 */
function freeLeft(
  centered: number,
  width: number,
  top: number,
  bottom: number,
  x: number,
  limits: { minLeft: number; maxLeft: number },
  occupied: readonly LabelBox[],
): number | null {
  const candidates = [centered];
  for (const other of occupied) {
    if (other[1] < bottom && other[3] > top) candidates.push(other[2], other[0] - width);
  }
  let best: number | null = null;
  for (const left of candidates) {
    if (left < limits.minLeft || left > limits.maxLeft || x < left || x > left + width) continue;
    if (best !== null && Math.abs(left - centered) >= Math.abs(best - centered)) continue;
    const box: LabelBox = [left, top, left + width, bottom];
    if (!occupied.some((other) => overlaps(box, other))) best = left;
  }
  return best;
}

/**
 * Boîte d'une étiquette au-dessus du limbe de l'astre (centre projeté x, y ; rayon projeté `radiusPx`), à 8 px ; sinon
 * au-dessous ; sinon le nom seul au-dessus, puis au-dessous ; sinon `null`. Centrée sur l'astre, elle glisse vers
 * l'intérieur de la vue quand elle en déborderait d'un côté (au repos, les plus grands ont parfois leur centre à moins
 * d'une demi-étiquette du bord), et le long d'une boîte occupée qui la gênerait (la place des plaques, au bord de la
 * zone libre étroite d'un téléphone en paysage). Elle reste au-dessus du centre de l'astre, sans quoi elle ne le
 * désignerait plus. Elle doit tenir dans la vue (sous la barre, à 8 px des autres bords), ne recouvrir aucune boîte
 * occupée, et l'astre doit être devant la caméra (profondeur NDC ≤ 1).
 */
export function placeLimbLabel(
  anchor: { x: number; y: number; radiusPx: number; depth: number },
  size: LimbLabelSize,
  view: { width: number; height: number },
  occupied: readonly LabelBox[],
): { box: LabelBox; short: boolean } | null {
  const { x, y, radiusPx, depth } = anchor;
  if (depth > 1) return null;
  const above = y - radiusPx - LIMB_GAP_PX - size.height;
  const below = y + radiusPx + LIMB_GAP_PX;
  for (const short of [false, true]) {
    const width = short ? size.shortWidth : size.width;
    const limits = { minLeft: EDGE_MARGIN, maxLeft: view.width - EDGE_MARGIN - width };
    if (limits.maxLeft < limits.minLeft) continue;
    const centered = Math.min(Math.max(x - width / 2, limits.minLeft), limits.maxLeft);
    for (const top of [above, below]) {
      const bottom = top + size.height;
      if (top < TOP_MARGIN || bottom > view.height - EDGE_MARGIN) continue;
      const left = freeLeft(centered, width, top, bottom, x, limits, occupied);
      if (left !== null) return { box: [left, top, left + width, bottom], short };
    }
  }
  return null;
}

/**
 * Ordre de pose des étiquettes (les premières prennent la place) : l'astre affiché, le précédent, le Soleil, puis les
 * autres du plus grand au plus petit. Les astres sont rangés par taille comparée croissante (indices).
 */
export function labelOrder(current: number, sun: number, count: number): number[] {
  const order = [current];
  if (current > 0) order.push(current - 1);
  if (!order.includes(sun)) order.push(sun);
  for (let i = count - 1; i >= 0; i--) if (!order.includes(i)) order.push(i);
  return order;
}

/** Le Soleil, devenu un point (moins de 14 px de diamètre), reçoit l'anneau « ici » en `--soleil`. */
export function sunRinged(diameterPx: number): boolean {
  return diameterPx < SUN_RING_BELOW_PX;
}

/** Repère et dispositions d'une étiquette à anneau, mesurés dans sa forme normale (`markerLayouts`). */
export interface RingMarker {
  layouts: readonly MarkerLayout[];
  /** Centre vertical du repère dans l'étiquette, en px. */
  dotY: number;
  dotWidth: number;
  dotHeight: number;
}

/** Mesures des deux étiquettes d'un astre, prises dans le DOM ; `null` : étiquette absente. */
export interface ObjectLabelMetrics {
  ring: RingMarker | null;
  limb: LimbLabelSize | null;
}

/**
 * Ce que devient une étiquette à cette image : masquée ; au-dessus du limbe (forme courte ou non) ; sur un anneau (texte
 * à gauche ou à droite du repère, forme courte ou non). `box` : boîte du texte ; `left`, `top` : coin haut gauche de
 * l'étiquette, en px de la vue.
 */
export type LabelPlacement =
  | { form: "hidden" }
  | { form: "limb"; box: LabelBox; left: number; top: number; short: boolean }
  | { form: "ring"; box: LabelBox; left: number; top: number; mirrored: boolean; short: boolean };

const HIDDEN: LabelPlacement = { form: "hidden" };

export interface SizeLabelsInput {
  /** Disque à l'écran des astres dessinés, par indice : les `discs.length` plus petits le sont, les autres non. */
  discs: readonly ScreenDisc[];
  /** Nombre d'astres, dessinés ou non (une étiquette chacun). */
  count: number;
  /** Indices de l'astre affiché et du Soleil. */
  current: number;
  sun: number;
  metrics: readonly ObjectLabelMetrics[];
  /** Anneau « ici » du Soleil devenu un point ; `null` s'il est absent. */
  sunMarker: RingMarker | null;
  view: { width: number; height: number };
  /** Boîtes réservées d'avance (`frameBoxes`) : barre, règle, place des plaques, échelle graphique. */
  reserved: readonly LabelBox[];
  /** Disposition de chaque étiquette à l'image précédente (hystérésis), mise à jour en place. */
  modes: (StarLabelMode | null)[];
}

export interface SizeLabelsLayout {
  /** Une disposition par astre, par indice. */
  objects: LabelPlacement[];
  /** Anneau « ici » du Soleil. */
  sun: LabelPlacement;
}

/**
 * Boîtes réservées d'avance aux étiquettes, en px de la vue : ce que mesure la page (barre, règle), l'échelle
 * graphique, et la place des plaques (à gauche de la zone libre sur grand écran, sous la bande libre en mise en page
 * compacte).
 */
export function frameBoxes(
  view: { width: number; height: number },
  measured: readonly LabelBox[],
  zone: ScreenZone | null,
  band: ScreenBand | null,
  scaleBox: LabelBox | null,
): LabelBox[] {
  const boxes = [...measured];
  if (scaleBox) boxes.push(scaleBox);
  if (zone) boxes.push([0, 0, zone.left * view.width, view.height]);
  if (band) boxes.push([0, band.bottom * view.height, view.width, view.height]);
  return boxes;
}

/**
 * Étiquettes de l'image, dans l'ordre de pose (labelOrder), après avoir réservé chaque astre dessiné : le carré de son
 * point s'il fait moins de 24 px, sa croix (discBoxes) sinon. Au-dessus du limbe d'un astre grand à l'écran
 * (placeLimbLabel), sur un anneau pour un petit (placeMarkedLabel : texte à droite, à gauche, puis le nom seul), anneau
 * « ici » pour le Soleil sous 14 px. L'anneau se pose sur l'astre même : son propre point est écarté de la recherche le
 * temps de la pose, les autres non. Une étiquette qui ne tient nulle part est masquée : jamais de texte recouvert ni
 * coupé. Un astre dans lequel la caméra serait entrée (rayon infini) occupe toute la vue.
 */
export function layoutSizeLabels(input: SizeLabelsInput): SizeLabelsLayout {
  const { discs, count, current, sun, metrics, sunMarker, view, reserved, modes } = input;
  const occupied: LabelBox[] = [...reserved];
  /** Place, dans `occupied`, du point réservé de chaque petit astre (−1 : grand, ou non dessiné). */
  const ownPoint = new Array<number>(count).fill(-1);
  discs.forEach(({ x, y, radius }, i) => {
    if (!Number.isFinite(radius)) {
      occupied.push([0, 0, view.width, view.height]);
    } else if (2 * radius < RESERVED_DISC_PX) {
      ownPoint[i] = occupied.length;
      occupied.push(pointBox(x, y, 2 * radius));
    } else {
      occupied.push(...discBoxes(x, y, radius));
    }
  });

  /** Pose une étiquette à anneau sur l'astre `index`, son propre point écarté ; la boîte de texte et le repère réservés. */
  const ring = (marker: RingMarker | null, index: number): LabelPlacement => {
    const disc = discs[index];
    if (!marker || !Number.isFinite(disc.radius)) return HIDDEN;
    const own = ownPoint[index];
    const saved = own >= 0 ? occupied[own] : null;
    if (saved) occupied[own] = EMPTY_BOX;
    const chosen = placeMarkedLabel({ x: disc.x, y: disc.y, depth: 0.5 }, marker.layouts, view.width, view.height, occupied);
    if (saved) occupied[own] = saved;
    if (chosen === null) return HIDDEN;
    const layout = marker.layouts[chosen];
    const box = anchoredBox(layout.box, disc.x, disc.y);
    const halfWidth = marker.dotWidth / 2;
    const halfHeight = marker.dotHeight / 2;
    occupied.push(box, [disc.x - halfWidth, disc.y - halfHeight, disc.x + halfWidth, disc.y + halfHeight]);
    return {
      form: "ring",
      box,
      left: disc.x - layout.dotX,
      top: disc.y - marker.dotY,
      mirrored: layout.mirrored,
      short: layout.short,
    };
  };

  const objects = new Array<LabelPlacement>(count).fill(HIDDEN);
  let sunPlacement = HIDDEN;
  for (const i of labelOrder(current, sun, count)) {
    if (i >= count) continue;
    const disc = i < discs.length ? discs[i] : undefined;
    if (!disc) {
      modes[i] = null;
      continue;
    }
    const diameter = 2 * disc.radius;
    if (i === sun && sunMarker && sunRinged(diameter)) {
      modes[i] = null;
      sunPlacement = ring(sunMarker, i);
      continue;
    }
    const mode = starLabelMode(diameter, modes[i] ?? null);
    modes[i] = mode;
    if (mode === "ring") {
      objects[i] = ring(metrics[i]?.ring ?? null, i);
      continue;
    }
    const size = metrics[i]?.limb;
    const placed = size ? placeLimbLabel({ x: disc.x, y: disc.y, radiusPx: disc.radius, depth: 0.5 }, size, view, occupied) : null;
    if (!placed) continue;
    occupied.push(placed.box);
    objects[i] = { form: "limb", box: placed.box, left: placed.box[0], top: placed.box[1], short: placed.short };
  }
  return { objects, sun: sunPlacement };
}
