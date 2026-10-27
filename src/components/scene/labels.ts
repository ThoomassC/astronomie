/** Boîte occupée à l'écran : gauche, haut, droite, bas (px). */
export type LabelBox = readonly [left: number, top: number, right: number, bottom: number];

export interface LabelAnchor {
  /** Position projetée de l'astre, en px depuis le coin haut gauche de la vue. */
  x: number;
  y: number;
  /** Profondeur projetée (NDC) : au-delà de 1, l'astre est derrière la caméra. */
  depth: number;
  /** Taille réelle du bouton d'étiquette, en px. */
  width: number;
  height: number;
}

/** Décalage du bouton par rapport à l'astre : sa pastille est centrée sur lui. */
export const LABEL_OFFSET_X = 8;
export const LABEL_OFFSET_Y = 15;

/** Zones exclues : sous la barre haute, au-dessus du dock ; léger débord permis sur les côtés. */
const TOP_MARGIN = 72;
const BOTTOM_MARGIN = 90;
const SIDE_TOLERANCE = 40;

const overlaps = (a: LabelBox, b: LabelBox) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/**
 * Boîte du bouton d'étiquette ancré sur l'astre, ou `null` s'il sort de la zone permise
 * ou recouvre une boîte déjà occupée (règle des distances, étiquettes plus prioritaires).
 */
export function placeLabel(
  anchor: LabelAnchor,
  viewWidth: number,
  viewHeight: number,
  occupied: readonly LabelBox[],
): LabelBox | null {
  const { x, y, depth, width, height } = anchor;
  if (depth > 1) return null;
  if (x < -SIDE_TOLERANCE || x > viewWidth + SIDE_TOLERANCE) return null;
  const left = x - LABEL_OFFSET_X;
  const top = y - LABEL_OFFSET_Y;
  const box: LabelBox = [left, top, left + width, top + height];
  if (box[1] < TOP_MARGIN || box[3] > viewHeight - BOTTOM_MARGIN) return null;
  return occupied.some((other) => overlaps(box, other)) ? null : box;
}
