import type { Locale } from "@/i18n/locales";
import { COSMIC_EN } from "./en";
import { COSMIC_ES } from "./es";
import { COSMIC_FR } from "./fr";
import type { CosmicContent, CosmicContentKey } from "./types";

/** Escales lointaines, dans l'ordre du voyage (et des textes de chaque langue). */
export const COSMIC_CONTENT_KEYS = ["stars", "galaxy", "localGroup", "universe", "multiverse"] as const satisfies readonly CosmicContentKey[];

const COSMIC_CONTENT: Readonly<Record<Locale, CosmicContent>> = { fr: COSMIC_FR, en: COSMIC_EN, es: COSMIC_ES };

/** Textes des escales lointaines dans la langue de la page (composants serveur seulement). */
export function getCosmicContent(locale: Locale): CosmicContent {
  return COSMIC_CONTENT[locale];
}
