import type { Locale } from "@/i18n/locales";
import { VOYAGE_EN } from "./en";
import { VOYAGE_ES } from "./es";
import { VOYAGE_FR } from "./fr";
import type { VoyageContent } from "./types";

const VOYAGE: Readonly<Record<Locale, VoyageContent>> = { fr: VOYAGE_FR, en: VOYAGE_EN, es: VOYAGE_ES };

/** Textes du voyage, du Soleil à l'au-delà de Neptune, dans la langue de la page. Côté serveur seulement (ADR 0003). */
export function getVoyageContent(locale: Locale): VoyageContent {
  return VOYAGE[locale];
}
