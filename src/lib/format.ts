import { INTL_LOCALE, type Locale } from "@/i18n/locales";

/**
 * Formateurs déjà construits, par notation, langue et décimales : en construire un coûte cher, et certains textes
 * se recalculent à chaque pas du temps simulé (distances du jour).
 */
const formatters = new Map<string, Intl.NumberFormat>();

function cachedFormatter(key: string, locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], options);
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Nombre avec exactement `digits` décimales, dans la langue `locale`. Les deux sont obligatoires : un nombre écrit sans
 * sa langue serait du français sur une page anglaise. Sortie d'Intl telle quelle, que les nombres écrits à la main
 * dans les textes reprennent :
 * - fr : virgule décimale, milliers groupés dès 4 chiffres par une espace fine insécable (U+202F) :
 *   « 4 879 », « 27 000 », « 0,9930 » ;
 * - en : point décimal, virgule dès 4 chiffres : « 4,879 », « 27,000 », « 0.39 » ;
 * - es : virgule décimale, point dès 5 chiffres seulement : « 4879 », « 27.000 », « 1234,25 ». C'est l'usage courant
 *   en Espagne (CLDR) ; la RAE recommande une espace fine, que le site n'applique pas (ADR 0003).
 * L'unité se joint ensuite par `withUnit`. Négatifs : Intl écrit le trait d'union (« -180 »), les textes le signe
 * moins (« −180 », U+2212).
 */
export function formatNumber(value: number, digits: number, locale: Locale): string {
  return cachedFormatter(`fixed:${locale}:${digits}`, locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Grand nombre en mots, Intl compact long, `digits` décimales au plus : 2,5 millions / 2.5 million / 2,5 millones ;
 * 46,5 milliards / 46.5 billion / 46,5 mil millones. Le mot suit le nombre après une espace ordinaire (sortie d'Intl).
 */
export function formatCompact(value: number, locale: Locale, digits = 1): string {
  return cachedFormatter(`compact:${locale}:${digits}`, locale, {
    notation: "compact",
    compactDisplay: "long",
    maximumFractionDigits: digits,
  }).format(value);
}

/** Entier positif sur au moins deux chiffres : 5 → "05", 42 → "42". */
export function pad2(value: number): string {
  return String(Math.trunc(value)).padStart(2, "0");
}
