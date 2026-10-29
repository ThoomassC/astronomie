/**
 * Langues du site, dans l'ordre des menus. Ce module n'importe rien : le proxy, les composants serveur et les
 * composants client le lisent tous.
 */
export const LOCALES = ["fr", "en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/** Langue des anciens liens, des composants rendus hors fournisseur et des visites qui n'en préfèrent aucune. */
export const DEFAULT_LOCALE: Locale = "fr";

/** Vrai pour une langue du site, écrite telle quelle : « fr », mais pas « FR » ni « fr-FR ». */
export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/** Balise BCP 47 donnée à Intl (nombres, dates, pluriels) : anglais britannique, formats métriques, jour-mois-année. */
export const INTL_LOCALE: Readonly<Record<Locale, string>> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };

/** Nom de chaque langue dans sa propre langue (menu des langues). */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { fr: "Français", en: "English", es: "Español" };

/** Locale Open Graph (`og:locale`). */
export const OG_LOCALE: Readonly<Record<Locale, string>> = { fr: "fr_FR", en: "en_GB", es: "es_ES" };

/** Cookie de préférence, posé par le menu des langues, lu par le proxy. */
export const LOCALE_COOKIE = "lang";

/** Durée de vie du cookie de langue : un an, en secondes. */
export const LOCALE_COOKIE_MAX_AGE_S = 31_536_000;
