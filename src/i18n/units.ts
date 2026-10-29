import type { Locale } from "./locales";

/** Symboles d'unités et signes écrits après un nombre ; `withUnit` les y joint selon la langue. */
export interface UnitSymbols {
  /** Unité astronomique. */
  au: string;
  /** Année-lumière. */
  ly: string;
  km: string;
  /** Rayon solaire. */
  solarRadius: string;
  kelvin: string;
  /** Seconde d'arc (diamètre apparent) : double prime U+2033, pas le guillemet droit. */
  arcsec: string;
  /** Degré d'angle (U+00B0). */
  degree: string;
  /** Pour cent : espacé ou collé selon la langue (`withUnit`). */
  percent: string;
}

/** Symboles communs aux trois langues (R☉ : R suivi du symbole du Soleil, U+2609). */
const SHARED_SYMBOLS = { km: "km", solarRadius: "R☉", kelvin: "K", arcsec: "″", degree: "°", percent: "%" } as const;

/** fr { au "UA", ly "al" } ; en { au "AU", ly "ly" } ; es { au "UA", ly "al" } ; km, R☉, K, ″, °, % identiques. */
export const UNITS: Readonly<Record<Locale, UnitSymbols>> = {
  fr: { au: "UA", ly: "al", ...SHARED_SYMBOLS },
  en: { au: "AU", ly: "ly", ...SHARED_SYMBOLS },
  es: { au: "UA", ly: "al", ...SHARED_SYMBOLS },
};

/** Unités collées au nombre, par langue : les angles partout, % en anglais seulement. */
const GLUED_UNITS: Readonly<Record<Locale, readonly (keyof UnitSymbols)[]>> = {
  fr: ["arcsec", "degree"],
  en: ["arcsec", "degree", "percent"],
  es: ["arcsec", "degree"],
};

/**
 * Nombre déjà formaté (`formatNumber`) suivi de son unité, selon la langue :
 * - une espace ordinaire (U+0020) avant l'unité, dans les trois langues : « 1,52 UA », « 1.52 AU », « 764 R☉ » ;
 * - % espacé en français et en espagnol (« 49 % »), collé en anglais (« 49% ») ;
 * - seconde d'arc et degré collés partout : « 24″ », « 46° ».
 * L'espace ordinaire est celle de tous les textes actuels du site et de leurs tests (le français reste inchangé pendant
 * la migration) ; l'espace insécable que recommandent les normes (BIPM, RAE) se posera d'un bloc, sur tout le site.
 */
export function withUnit(value: string, unit: keyof UnitSymbols, locale: Locale): string {
  const space = GLUED_UNITS[locale].includes(unit) ? "" : " ";
  return `${value}${space}${UNITS[locale][unit]}`;
}
