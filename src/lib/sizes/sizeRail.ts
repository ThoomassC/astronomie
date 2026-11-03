/**
 * Haut de la règle des tailles, en R☉ : la puissance de dix sous le plus petit astre du comparateur, l'ombre de
 * Cygnus X-1 (2,3 × 10⁻⁴ R☉, 163 km).
 */
const SIZE_RAIL_MIN_SOLAR = 1e-4;
/** Bas de la règle des tailles, en R☉ : la puissance de dix au-delà du plus grand, l'ombre du Fer à cheval cosmique (4 × 10⁵ R☉). */
const SIZE_RAIL_MAX_SOLAR = 1e6;

/**
 * Position d'une taille comparée sur la règle des tailles (pourcentage de sa hauteur, 0 en haut), logarithmique et
 * croissante, dix décades sans rupture : 4 + 92 × log10(r / 10⁻⁴) / log10(10⁶ / 10⁻⁴). 10⁻⁴ R☉ → 4 %, 1 → 40,8 %,
 * 10⁶ → 96 %. Onze des quatorze astres tiennent en quatre décades (de Proxima du Centaure à VY Canis Majoris) : leurs
 * repères s'écartent de leur position vraie, que rappelle leur équerre (RailView).
 */
export function sizeRailPercent(radiusSolar: number): number {
  return 4 + (92 * Math.log10(radiusSolar / SIZE_RAIL_MIN_SOLAR)) / Math.log10(SIZE_RAIL_MAX_SOLAR / SIZE_RAIL_MIN_SOLAR);
}

/**
 * Graduations de la règle des tailles : une par puissance de dix, de 10⁻⁴ à 10⁶ R☉ (onze), majeure au Soleil (1 R☉) ;
 * la légende « × 10 à chaque graduation » reste vraie. Même forme que les graduations de la règle des distances
 * (`RailTick`), sans en dépendre : `lib` n'importe rien de `components`.
 */
export const SIZE_RAIL_TICKS: readonly { percent: number; major: boolean }[] = Array.from({ length: 11 }, (_, i) => i - 4).map(
  (exponent) => ({ percent: sizeRailPercent(10 ** exponent), major: exponent === 0 }),
);
