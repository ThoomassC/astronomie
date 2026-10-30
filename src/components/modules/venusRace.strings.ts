import type { Locale } from "@/i18n/locales";

/**
 * Textes de la course de Vénus (l'année contre la rotation). Numéros de jour et parts (pour cent compris) arrivent
 * déjà écrits ; pause, reprise et relance viennent de `COMMON_STRINGS`.
 */
export interface VenusRaceStrings {
  /** Description du canevas pour les lecteurs d'écran. */
  canvasLabel: string;
  /** Commande de départ. */
  start: string;
  /** Compteur de jours : « Jour 12 » (canevas ; suivi d'un point dans la ligne de lecture du départ). */
  day(day: string): string;
  /** Ligne de lecture quand l'année est bouclée, puis quand la rotation l'est. */
  yearReadout: string;
  rotationReadout: string;
  /** Annonce à la pause : jour atteint, part du tour du Soleil et part du tour sur elle-même. */
  paused(day: string, year: string, rotation: string): string;
  /** Canevas : cadran de l'année, puis cadran de la rotation (titre et durée). */
  orbit: string;
  orbitDays: string;
  spin: string;
  spinDays: string;
  /** Canevas : étiquette passagère quand l'année est bouclée. */
  yearDone: string;
}

export const VENUS_RACE_STRINGS: Readonly<Record<Locale, VenusRaceStrings>> = {
  fr: {
    canvasLabel: "Deux cadrans : l'année de Vénus et sa rotation",
    start: "Lancer la course",
    day: (day) => `Jour ${day}`,
    yearReadout: "Jour 224,7 : l'année de Vénus est bouclée. Sa rotation n'en est qu'à 92 %.",
    rotationReadout:
      "Jour 243 : Vénus a enfin fait un tour sur elle-même. Son jour sidéral dure plus longtemps que son année. Du lever au lever du Soleil, il s'écoule 117 jours.",
    paused: (day, year, rotation) => `${day} : ${year} du tour du Soleil, ${rotation} du tour sur elle-même.`,
    orbit: "Un tour du Soleil",
    orbitDays: "224,7 jours",
    spin: "Un tour sur elle-même",
    spinDays: "243 jours, dans l’autre sens",
    yearDone: "Année bouclée",
  },
  en: {
    canvasLabel: "Two dials: Venus's year and its rotation",
    start: "Start the race",
    day: (day) => `Day ${day}`,
    yearReadout: "Day 224.7: Venus has completed its year. Its rotation is only 92% done.",
    rotationReadout:
      "Day 243: Venus has finally turned once on its axis. Its sidereal day is longer than its year. From one sunrise to the next, 117 days go by.",
    paused: (day, year, rotation) => `${day}: ${year} of an orbit of the Sun, ${rotation} of a turn on its axis.`,
    orbit: "One orbit of the Sun",
    orbitDays: "224.7 days",
    spin: "One turn on its axis",
    spinDays: "243 days, the other way round",
    yearDone: "Year complete",
  },
  es: {
    canvasLabel: "Dos diales: el año de Venus y su rotación",
    start: "Empezar la carrera",
    day: (day) => `Día ${day}`,
    yearReadout: "Día 224,7: Venus ha completado su año. Su rotación solo va por el 92 %.",
    rotationReadout:
      "Día 243: Venus por fin ha dado una vuelta sobre su eje. Su día sideral dura más que su año. De un amanecer al siguiente pasan 117 días.",
    paused: (day, year, rotation) => `${day}: ${year} de la vuelta al Sol, ${rotation} de la vuelta sobre su eje.`,
    orbit: "Una vuelta al Sol",
    orbitDays: "224,7 días",
    spin: "Una vuelta sobre su eje",
    spinDays: "243 días, en sentido contrario",
    yearDone: "Año completado",
  },
};
