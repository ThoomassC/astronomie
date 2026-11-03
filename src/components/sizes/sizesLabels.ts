import type { LabelBox } from "@/components/scene/labels";

/** Diamètre à l'écran, en px, dès lequel l'étiquette d'une étoile passe au-dessus de son limbe… */
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

/** Étiquette d'une étoile : au-dessus de son limbe (grande à l'écran), ou sur un anneau à sa couleur (petite). */
export type StarLabelMode = "limb" | "ring";

/**
 * Disposition de l'étiquette d'une étoile de `diameterPx` px de diamètre à l'écran : au-dessus du limbe dès 24 px ;
 * une étiquette déjà au-dessus du limbe y reste jusqu'à 18 px (hystérésis) ; sur un anneau sinon.
 */
export function starLabelMode(diameterPx: number, previous: StarLabelMode | null): StarLabelMode {
  if (diameterPx >= LIMB_ENTER_PX) return "limb";
  return previous === "limb" && diameterPx >= LIMB_EXIT_PX ? "limb" : "ring";
}

const overlaps = (a: LabelBox, b: LabelBox) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/**
 * Boîte d'une étiquette au-dessus du limbe de l'étoile (centre projeté x, y ; rayon projeté `radiusPx`), à 8 px ;
 * sinon au-dessous ; sinon `null`. Centrée sur l'étoile, elle glisse vers l'intérieur de la vue quand elle en
 * déborderait d'un côté : au repos, la caméra cadre l'étoile avec la précédente à sa droite, et sur téléphone les plus
 * grandes (Bételgeuse, VY Canis Majoris) ont leur centre à moins d'une demi-étiquette du bord gauche. Elle reste au-dessus
 * du centre de l'étoile, sans quoi elle ne la désignerait plus. Elle doit tenir dans la vue (sous la barre, à 8 px des
 * autres bords), ne recouvrir aucune boîte occupée, et l'étoile doit être devant la caméra (profondeur NDC ≤ 1).
 */
export function placeLimbLabel(
  anchor: { x: number; y: number; radiusPx: number; depth: number },
  size: { width: number; height: number },
  view: { width: number; height: number },
  occupied: readonly LabelBox[],
): LabelBox | null {
  const { x, y, radiusPx, depth } = anchor;
  if (depth > 1) return null;
  const maxLeft = view.width - EDGE_MARGIN - size.width;
  if (maxLeft < EDGE_MARGIN) return null;
  const left = Math.min(Math.max(x - size.width / 2, EDGE_MARGIN), maxLeft);
  const right = left + size.width;
  if (x < left || x > right) return null;
  const above = y - radiusPx - LIMB_GAP_PX - size.height;
  const below = y + radiusPx + LIMB_GAP_PX;
  for (const top of [above, below]) {
    const box: LabelBox = [left, top, right, top + size.height];
    if (box[1] < TOP_MARGIN || box[3] > view.height - EDGE_MARGIN) continue;
    if (!occupied.some((other) => overlaps(box, other))) return box;
  }
  return null;
}

/**
 * Ordre de pose des étiquettes (les premières prennent la place) : l'étoile affichée, la précédente, le Soleil,
 * puis les autres de la plus grande à la plus petite. Les étoiles sont rangées par rayon croissant (indices).
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
