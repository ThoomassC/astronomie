/*
 * Mise en page de l'écran autour de la scène : ce que les plaques, la barre du haut et la règle laissent libre.
 * Commun au voyage et à la page Tailles ; mesuré dans la page (components/scene/screenLayout.ts).
 */

/** Air entre la bande libre et ce qui la borde (bandeaux du haut, plaque), en px. */
export const BAND_MARGIN_PX = 8;
/**
 * Sous cette part de l'écran (texte très agrandi), pas de bande : cadrage portrait habituel.
 * Au-dessus, même un petit astre visible vaut mieux qu'un grand caché derrière la plaque.
 */
const MIN_BAND_SHARE = 0.08;

/** Bande horizontale de l'écran, en fractions de sa hauteur (0 en haut, 1 en bas). */
export interface ScreenBand {
  top: number;
  bottom: number;
}

/** Bande verticale de l'écran, en fractions de sa largeur (0 à gauche, 1 à droite). */
export interface ScreenZone {
  left: number;
  right: number;
}

/**
 * Bande libre de la mise en page mobile, en fractions de la hauteur de la vue : du bas des bandeaux
 * fixés en haut de l'écran (`top`, en px) au haut de la plaque repliée collée en bas (hauteur et écart
 * au bas de l'écran, en px), 8 px d'air de chaque côté. `null` si elle fait moins de 8 % de la vue.
 */
export function freeBand(viewHeight: number, top: number, plate: { height: number; bottom: number }): ScreenBand | null {
  const upper = top + BAND_MARGIN_PX;
  const lower = viewHeight - plate.bottom - plate.height - BAND_MARGIN_PX;
  return lower - upper >= MIN_BAND_SHARE * viewHeight ? { top: upper / viewHeight, bottom: lower / viewHeight } : null;
}
