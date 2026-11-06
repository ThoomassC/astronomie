import type { Locale } from "@/i18n/locales";
import { RELEASES_EN } from "./en";
import { RELEASES_ES } from "./es";
import { RELEASES_FR } from "./fr";
import type { ReleasesContent } from "./types";

const RELEASES_CONTENT: Readonly<Record<Locale, ReleasesContent>> = { fr: RELEASES_FR, en: RELEASES_EN, es: RELEASES_ES };

/** Textes de la page Notes de version dans la langue de la page. Lu par des composants serveur seulement (ADR 0003). */
export function getReleasesContent(locale: Locale): ReleasesContent {
  return RELEASES_CONTENT[locale];
}
