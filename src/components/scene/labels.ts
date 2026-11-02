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

/** Étiquettes à repère (ciel profond) : leur texte reste au moins à cet écart des bords de la vue, en px. */
export const EDGE_MARGIN = 4;
/** Air laissé autour du point d'une étoile, dans la boîte qu'aucune étiquette ne recouvre, en px. */
export const POINT_MARGIN = 2;

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

/*
 * Étiquettes à repère : celles du ciel profond (étoiles, « Vous êtes ici », centre galactique, cercles de distance)
 * et « Soleil » quand le Soleil n'est plus qu'un point. Le repère se pose exactement sur l'astre ; seul le texte
 * occupe la place. Le texte a plusieurs dispositions possibles autour du repère, essayées dans l'ordre.
 */

/** Mesures d'une étiquette à repère, prises dans sa disposition normale (texte complet), depuis son coin haut gauche. */
export interface MarkerMetrics {
  /** Centre du repère (px). */
  dotX: number;
  dotY: number;
  /** Largeur du repère (px). */
  dotWidth: number;
  /** Boîte du texte (px). */
  textX: number;
  textY: number;
  textWidth: number;
  textHeight: number;
  /** Largeur de la précision (« · 4,2 al ») que la forme courte retire ; 0 si le texte n'en a pas. */
  detailWidth: number;
}

/** Une disposition du texte autour du repère. */
export interface MarkerLayout {
  /** Boîte du texte, relative au centre du repère (px). */
  box: LabelBox;
  /** Centre horizontal du repère dans l'étiquette ainsi disposée (px) : l'étiquette se pose en x − dotX. */
  dotX: number;
  /** Texte à gauche du repère (ligne inversée). */
  mirrored: boolean;
  /** Forme courte : le nom seul, sans la précision. */
  short: boolean;
}

/**
 * Dispositions à essayer, dans l'ordre : texte complet à droite du repère, puis à gauche ; puis, si le texte a une
 * précision, le nom seul à droite, puis à gauche. Le miroir se déduit des mesures : la ligne inversée garde l'écart
 * entre repère et texte, le texte part du bord gauche de l'étiquette et le repère vient après lui. Un texte centré
 * au-dessus ou en dessous de son repère (« Vous êtes ici », « Centre de la Galaxie ») n'a pas de miroir.
 */
export function markerLayouts(metrics: MarkerMetrics): MarkerLayout[] {
  const { dotX, dotY, dotWidth, textX, textY, textWidth, textHeight, detailWidth } = metrics;
  const gap = textX - dotX;
  const top = textY - dotY;
  const bottom = top + textHeight;
  // Texte à droite du repère : une ligne, qui a son miroir.
  const row = gap >= 0;
  const layouts: MarkerLayout[] = [];
  for (const short of detailWidth > 0 ? [false, true] : [false]) {
    const width = short ? textWidth - detailWidth : textWidth;
    layouts.push({ box: [gap, top, gap + width, bottom], dotX, mirrored: false, short });
    if (row) {
      layouts.push({ box: [-gap - width, top, -gap, bottom], dotX: textX + width - dotWidth / 2, mirrored: true, short });
    }
  }
  return layouts;
}

/** Repère d'une étiquette : position projetée de l'astre (px) et profondeur (NDC, au-delà de 1 derrière la caméra). */
export interface MarkerAnchor {
  x: number;
  y: number;
  depth: number;
}

/**
 * Décalage horizontal (px) qui éloigne le texte d'une disposition à `clearance` px au moins du centre de son repère :
 * vers la droite pour un texte à droite, vers la gauche pour un texte à gauche (miroir). Nul pour un texte déjà assez
 * loin, ou centré au-dessus ou en dessous de son repère. Sert à poser le nom d'une galaxie à côté de son disque.
 */
export function clearanceShift(box: LabelBox, clearance: number): number {
  if (box[0] >= 0) return Math.max(0, clearance - box[0]);
  if (box[2] <= 0) return Math.min(0, -clearance - box[2]);
  return 0;
}

/**
 * Rang de la première disposition qui tient, ou `null`. Il faut l'astre devant la caméra et dans la vue ; le texte
 * entier à EDGE_MARGIN px au moins des bords, sous la barre haute et au-dessus du dock ; et aucune boîte occupée
 * recouverte (étiquettes plus prioritaires, points des étoiles, règle des distances). Avec `clearance`, chaque texte
 * est d'abord éloigné d'autant du centre du repère (clearanceShift) : le nom se pose à côté d'un disque, pas dessus.
 */
export function placeMarkedLabel(
  anchor: MarkerAnchor,
  layouts: readonly { readonly box: LabelBox }[],
  viewWidth: number,
  viewHeight: number,
  occupied: readonly LabelBox[],
  clearance = 0,
): number | null {
  const { x, y, depth } = anchor;
  if (depth > 1 || x < 0 || x > viewWidth || y < 0 || y > viewHeight) return null;
  const minTop = Math.max(EDGE_MARGIN, TOP_MARGIN);
  const maxBottom = viewHeight - Math.max(EDGE_MARGIN, BOTTOM_MARGIN);
  // Appelée à chaque image pour chaque étiquette : les boîtes essayées ne sont pas allouées.
  for (let i = 0; i < layouts.length; i++) {
    const { box } = layouts[i];
    const shift = clearance > 0 ? clearanceShift(box, clearance) : 0;
    const left = x + box[0] + shift;
    const top = y + box[1];
    const right = x + box[2] + shift;
    const bottom = y + box[3];
    if (left < EDGE_MARGIN || right > viewWidth - EDGE_MARGIN || top < minTop || bottom > maxBottom) continue;
    if (isFree(left, top, right, bottom, occupied)) return i;
  }
  return null;
}

/** La boîte (gauche, haut, droite, bas) ne recouvre aucune boîte occupée ; bord à bord est permis. */
function isFree(left: number, top: number, right: number, bottom: number, occupied: readonly LabelBox[]): boolean {
  for (const other of occupied) {
    if (left < other[2] && right > other[0] && top < other[3] && bottom > other[1]) return false;
  }
  return true;
}

/** Boîte relative à un repère, posée sur le repère en (x, y). */
export function anchoredBox(box: LabelBox, x: number, y: number): LabelBox {
  return [x + box[0], y + box[1], x + box[2], y + box[3]];
}

/**
 * Boîte réservée autour du point d'une étoile (ou du point-Soleil) de `size` px de diamètre, centré en (x, y) :
 * centre ± (size / 2 + POINT_MARGIN). Les pastilles presque opaques du ciel profond ne la recouvrent jamais.
 */
export function pointBox(x: number, y: number, size: number): LabelBox {
  const half = size / 2 + POINT_MARGIN;
  return [x - half, y - half, x + half, y + half];
}
