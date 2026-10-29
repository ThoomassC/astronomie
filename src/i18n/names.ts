import type { PlanetKey } from "@/lib/astro/planets";
import type { Locale } from "./locales";

/** Astres nommés ici : le Soleil, les huit planètes et la Lune. */
export type NamedBody = "sun" | PlanetKey | "moon";

/**
 * Seule source des noms des astres, dans les trois langues (les champs `name` français des données disparaissent
 * en clôture).
 * fr : Soleil, Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune, Lune ;
 * en : Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Moon ;
 * es : Sol, Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano, Neptuno, Luna.
 */
export const BODY_NAMES: Readonly<Record<Locale, Readonly<Record<NamedBody, string>>>> = {
  fr: {
    sun: "Soleil",
    mercury: "Mercure",
    venus: "Vénus",
    earth: "Terre",
    mars: "Mars",
    jupiter: "Jupiter",
    saturn: "Saturne",
    uranus: "Uranus",
    neptune: "Neptune",
    moon: "Lune",
  },
  en: {
    sun: "Sun",
    mercury: "Mercury",
    venus: "Venus",
    earth: "Earth",
    mars: "Mars",
    jupiter: "Jupiter",
    saturn: "Saturn",
    uranus: "Uranus",
    neptune: "Neptune",
    moon: "Moon",
  },
  es: {
    sun: "Sol",
    mercury: "Mercurio",
    venus: "Venus",
    earth: "Tierra",
    mars: "Marte",
    jupiter: "Júpiter",
    saturn: "Saturno",
    uranus: "Urano",
    neptune: "Neptuno",
    moon: "Luna",
  },
};

/** Nom de l'astre dans la langue : bodyName("jupiter", "es") → « Júpiter ». */
export function bodyName(key: NamedBody, locale: Locale): string {
  return BODY_NAMES[locale][key];
}
