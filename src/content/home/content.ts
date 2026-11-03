import type { Locale } from "@/i18n/locales";
import { HOME_EN } from "./en";
import { HOME_ES } from "./es";
import { HOME_FR } from "./fr";
import type { HomeContent } from "./types";

const HOME: Readonly<Record<Locale, HomeContent>> = { fr: HOME_FR, en: HOME_EN, es: HOME_ES };

/** Textes de l'accueil dans la langue de la page. Côté serveur seulement : aucun module client ne l'importe. */
export function getHomeContent(locale: Locale): HomeContent {
  return HOME[locale];
}
