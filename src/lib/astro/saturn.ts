/** Période orbitale de Saturne, en années. */
export const SATURN_YEAR_YEARS = 29.457;

/**
 * Ouverture approximative des anneaux vus de la Terre, en degrés (modèle sinusoïdal, ±1 an) :
 * B = −26,7 · sin(2π (année − 2025,2) / 29,457). Positif = face nord visible (par-dessus),
 * négatif = face sud (par-dessous), proche de 0 = par la tranche (2025, 2039-2040).
 */
export function ringOpeningDeg(year: number): number {
  return -26.7 * Math.sin((2 * Math.PI * (year - 2025.2)) / SATURN_YEAR_YEARS);
}
