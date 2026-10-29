import type { Locale } from "@/i18n/locales";
import { ABOUT_EN } from "./en";
import { ABOUT_ES } from "./es";
import { ABOUT_FR } from "./fr";
import type { AboutContent } from "./types";

const ABOUT: Readonly<Record<Locale, AboutContent>> = { fr: ABOUT_FR, en: ABOUT_EN, es: ABOUT_ES };

/** Textes de la page À propos dans la langue de la page. Lu par des composants serveur seulement (ADR 0003). */
export function getAboutContent(locale: Locale): AboutContent {
  return ABOUT[locale];
}
