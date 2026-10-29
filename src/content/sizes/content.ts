import type { Locale } from "@/i18n/locales";
import { SIZES_EN } from "./en";
import { SIZES_ES } from "./es";
import { SIZES_FR } from "./fr";
import type { SizesContent } from "./types";

const SIZES_CONTENT: Readonly<Record<Locale, SizesContent>> = { fr: SIZES_FR, en: SIZES_EN, es: SIZES_ES };

/** Textes de la page « Tailles » dans la langue de la page (composants serveur seulement). */
export function getSizesContent(locale: Locale): SizesContent {
  return SIZES_CONTENT[locale];
}
