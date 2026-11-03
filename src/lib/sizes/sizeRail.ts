/** Haut de la règle des tailles, en R☉ : sous la plus petite étoile du comparateur (Proxima du Centaure). */
const SIZE_RAIL_MIN_SOLAR = 0.1;
/** Bas de la règle des tailles, en R☉ : au-delà de la plus grande (VY Canis Majoris). */
const SIZE_RAIL_MAX_SOLAR = 2_000;

/**
 * Position d'un rayon sur la règle des tailles (pourcentage de sa hauteur, 0 en haut), logarithmique et croissante :
 * 4 + 92 × log10(r / 0,1) / log10(2 000 / 0,1). 0,1 R☉ → 4 %, 1 → 25,3902 %, 2 000 → 96 %.
 */
export function sizeRailPercent(radiusSolar: number): number {
  return 4 + (92 * Math.log10(radiusSolar / SIZE_RAIL_MIN_SOLAR)) / Math.log10(SIZE_RAIL_MAX_SOLAR / SIZE_RAIL_MIN_SOLAR);
}

/**
 * Graduations de la règle des tailles : une par puissance de dix, de 0,1 à 1 000 R☉, majeure au Soleil (1 R☉).
 * Même forme que les graduations de la règle des distances (`RailTick`), sans en dépendre : `lib` n'importe rien
 * de `components`.
 */
export const SIZE_RAIL_TICKS: readonly { percent: number; major: boolean }[] = [0.1, 1, 10, 100, 1_000].map(
  (radiusSolar) => ({ percent: sizeRailPercent(radiusSolar), major: radiusSolar === 1 }),
);
