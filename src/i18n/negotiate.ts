import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

/** Préférences de langue d'une requête : cookie `lang` et en-tête Accept-Language, chacun absent ou non. */
export interface LocalePreferences {
  cookie?: string | null;
  acceptLanguage?: string | null;
}

/** Poids q lisible (RFC 9110) : de 0 à 1, au plus trois décimales (« 0.8 », « 1.000 »). */
const QVALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;
/** Sous-étiquette principale lisible : 1 à 8 lettres. */
const PRIMARY_SUBTAG = /^[a-z]{1,8}$/;

/** Langue principale d'une étiquette, en minuscules (« en-US » → « en ») ; « * » tel quel ; null si illisible. */
function primaryLanguage(range: string): string | null {
  if (range === "*") return range;
  const primary = range.toLowerCase().split("-", 1)[0];
  return PRIMARY_SUBTAG.test(primary) ? primary : null;
}

/** Poids de l'entrée : 1 sans paramètre q, null si q est illisible. « q » ignore la casse, comme le veut la RFC. */
function weight(params: readonly string[]): number | null {
  const param = params.find((candidate) => candidate.split("=", 1)[0].trim().toLowerCase() === "q");
  if (param === undefined) return 1;
  const value = param.slice(param.indexOf("=") + 1).trim();
  return QVALUE.test(value) ? Number(value) : null;
}

/**
 * Langues de l'en-tête Accept-Language, sous-étiquette principale en minuscules (« en-US » → « en »),
 * triées par q décroissant, ordre d'origine à q égal ; q = 0 et q illisible : entrée ignorée ; « * » gardé tel quel.
 * Chaque langue ne figure qu'une fois, à son meilleur poids : « fr-CA;q=0.3, en;q=0.5, fr;q=0.9 » → fr, en.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  const entries: { language: string; q: number }[] = [];
  for (const entry of header.split(",")) {
    const [range, ...params] = entry.split(";").map((part) => part.trim());
    const language = primaryLanguage(range);
    const q = weight(params);
    if (language !== null && q !== null && q > 0) entries.push({ language, q });
  }
  // Tri stable : à poids égal, l'ordre de l'en-tête.
  entries.sort((a, b) => b.q - a.q);
  return [...new Set(entries.map((entry) => entry.language))];
}

/** Première langue acceptée parmi LOCALES ; null si aucune (« * » ne choisit rien). */
export function negotiateLocale(header: string | null | undefined): Locale | null {
  return parseAcceptLanguage(header).find(isLocale) ?? null;
}

/** Cookie valide, sinon Accept-Language, sinon DEFAULT_LOCALE. */
export function preferredLocale(prefs: LocalePreferences): Locale {
  if (isLocale(prefs.cookie)) return prefs.cookie;
  return negotiateLocale(prefs.acceptLanguage) ?? DEFAULT_LOCALE;
}
