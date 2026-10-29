import type { Locale } from "@/i18n/locales";
import type { Season } from "@/lib/astro/seasons";

/** Textes propres à une planète du module des saisons. */
export interface PlanetSeasonsStrings {
  /** Description du canevas pour les lecteurs d'écran. */
  canvasLabel: string;
  /** Curseur : la date (Terre) ou l'année (Uranus). */
  rangeLabel: string;
  /** Canevas : repères de l'orbite, à l'équinoxe de printemps boréal puis tous les 90°. */
  marks: readonly [string, string, string, string];
  /** Canevas : latitude marquée sur la vue de côté. */
  latLabel: string;
  /** Ligne de lecture : où se lit la durée du jour. */
  latName: string;
}

/**
 * Textes des saisons (Terre et Uranus). Dates, degrés et pour cent arrivent déjà écrits ; la date de la Terre vient
 * d'Intl (« 29 octobre », « 29 October », « 29 de octubre »).
 */
export interface SeasonsStrings {
  earth: PlanetSeasonsStrings;
  uranus: PlanetSeasonsStrings;
  /** Nom de chaque saison de l'hémisphère nord, en minuscule (en gras dans la ligne de lecture). */
  seasons: Readonly<Record<Season, string>>;
  /** Bouton bascule : suivre la date simulée du site. */
  follow: string;
  /** Canevas : titres des deux vues, flèches de la lumière, nord. */
  topView: string;
  sideView: string;
  sunlight: string;
  north: string;
  /** Uranus : année choisie, au début de la ligne de lecture et comme valeur lue du curseur. */
  inYear(year: number): string;
  /** Uranus : part de chaque rotation passée au soleil. */
  sunlitShare(percent: string): string;
  /** Jour et nuit polaires, à la place de la durée du jour. */
  polarDay: string;
  polarNight: string;
  /** Hauteur du Soleil à midi, ou Soleil resté sous l'horizon. */
  noonAbove(angle: string): string;
  noonBelow: string;
  /** Ligne de lecture, coupée autour du nom de la saison (en gras) : [avant, après]. */
  line(when: string, latName: string, day: string, noon: string): readonly [before: string, after: string];
}

export const SEASONS_STRINGS: Readonly<Record<Locale, SeasonsStrings>> = {
  fr: {
    earth: {
      canvasLabel: "Orbite de la Terre et éclairement selon la date",
      rangeLabel: "Date",
      marks: ["20 mars", "21 juin", "22 sept.", "21 déc."],
      latLabel: "Paris",
      latName: "Durée du jour à Paris",
    },
    uranus: {
      canvasLabel: "Orbite d'Uranus et éclairement selon l'année",
      rangeLabel: "Année",
      marks: ["2007", "2028", "2049", "2070"],
      latLabel: "49° N",
      latName: "À 49° nord",
    },
    seasons: { spring: "printemps", summer: "été", autumn: "automne", winter: "hiver" },
    follow: "Suivre la date du site",
    topView: "Vue du dessus",
    sideView: "Vue de côté",
    sunlight: "Lumière du Soleil",
    north: "N",
    inYear: (year) => `En ${year}`,
    sunlitShare: (percent) => `${percent} de chaque rotation au soleil`,
    polarDay: "Soleil permanent, il ne se couche pas",
    polarNight: "nuit permanente, le Soleil ne se lève pas",
    noonAbove: (angle) => `${angle} au-dessus de l’horizon`,
    noonBelow: "sous l’horizon",
    line: (when, latName, day, noon) => [
      `${when} : `,
      ` dans l'hémisphère nord. ${latName} : ${day}. Soleil à midi : ${noon}.`,
    ],
  },
  en: {
    earth: {
      canvasLabel: "Earth's orbit and how it is lit, by date",
      rangeLabel: "Date",
      marks: ["20 Mar", "21 Jun", "22 Sept", "21 Dec"],
      latLabel: "Paris",
      latName: "Day length in Paris",
    },
    uranus: {
      canvasLabel: "Uranus's orbit and how it is lit, by year",
      rangeLabel: "Year",
      marks: ["2007", "2028", "2049", "2070"],
      latLabel: "49° N",
      latName: "At 49° north",
    },
    seasons: { spring: "spring", summer: "summer", autumn: "autumn", winter: "winter" },
    follow: "Follow the site's date",
    topView: "Top view",
    sideView: "Side view",
    sunlight: "Sunlight",
    north: "N",
    inYear: (year) => `In ${year}`,
    sunlitShare: (percent) => `${percent} of each rotation in sunlight`,
    polarDay: "constant daylight, the Sun never sets",
    polarNight: "constant night, the Sun never rises",
    noonAbove: (angle) => `${angle} above the horizon`,
    noonBelow: "below the horizon",
    line: (when, latName, day, noon) => [
      `${when}: `,
      ` in the northern hemisphere. ${latName}: ${day}. Sun at noon: ${noon}.`,
    ],
  },
  es: {
    earth: {
      canvasLabel: "Órbita de la Tierra e iluminación según la fecha",
      rangeLabel: "Fecha",
      marks: ["20 mar", "21 jun", "22 sept", "21 dic"],
      latLabel: "París",
      latName: "Duración del día en París",
    },
    uranus: {
      canvasLabel: "Órbita de Urano e iluminación según el año",
      rangeLabel: "Año",
      marks: ["2007", "2028", "2049", "2070"],
      latLabel: "49° N",
      latName: "A 49° norte",
    },
    seasons: { spring: "primavera", summer: "verano", autumn: "otoño", winter: "invierno" },
    follow: "Seguir la fecha del sitio",
    topView: "Vista desde arriba",
    sideView: "Vista lateral",
    sunlight: "Luz del Sol",
    north: "N",
    inYear: (year) => `En ${year}`,
    sunlitShare: (percent) => `${percent} de cada rotación al sol`,
    polarDay: "día permanente, el Sol no se pone",
    polarNight: "noche permanente, el Sol no sale",
    noonAbove: (angle) => `${angle} sobre el horizonte`,
    noonBelow: "bajo el horizonte",
    line: (when, latName, day, noon) => [
      `${when}: `,
      ` en el hemisferio norte. ${latName}: ${day}. Sol al mediodía: ${noon}.`,
    ],
  },
};
