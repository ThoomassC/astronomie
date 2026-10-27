const formatters = new Map<number, Intl.NumberFormat>();

/**
 * Nombre à la française (`fr-FR`) avec exactement `digits` décimales :
 * séparateur de milliers = espace fine insécable (U+202F), virgule décimale.
 * Exemples : `formatNumber(1392700)` → "1 392 700", `formatNumber(0.9930, 4)` → "0,9930".
 */
export function formatNumber(value: number, digits = 0): string {
  let formatter = formatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(digits, formatter);
  }
  return formatter.format(value);
}

/** Entier positif sur au moins deux chiffres : 5 → "05", 42 → "42". */
export function pad2(value: number): string {
  return String(Math.trunc(value)).padStart(2, "0");
}
