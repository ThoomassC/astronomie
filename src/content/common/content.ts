import type { Locale } from "@/i18n/locales";
import { COMMON_EN } from "./en";
import { COMMON_ES } from "./es";
import { COMMON_FR } from "./fr";
import type { CommonContent } from "./types";

const COMMON: Readonly<Record<Locale, CommonContent>> = { fr: COMMON_FR, en: COMMON_EN, es: COMMON_ES };

/** Textes communs de la langue : métadonnées des pages, page introuvable. Côté serveur seulement. */
export function getCommonContent(locale: Locale): CommonContent {
  return COMMON[locale];
}
