import type { Locale } from "@/i18n/locales";
import { plural } from "@/i18n/plural";

/** Textes du planétaire de l'accueil, lus par le composant client `Orrery` (les autres sont dans src/content/home). */
export interface HomeStrings {
  /** Nom du dessin (titre du SVG), que la ligne datée complète. */
  orreryTitle: string;
  /** Début de la ligne datée, avant la date du chargement : « Positions réelles du » 29 octobre 2026. */
  datedLead: string;
  /**
   * Date la plus large de la langue (septembre ; chiffres tabulaires, donc tous de même largeur) : elle réserve sa
   * place dès le rendu serveur, si bien que la ligne passe à la ligne au même endroit avant et après l'hydratation.
   */
  dateReserve: string;
  /** Ce que la vue simplifie (MASTER : le dire). */
  note: string;
  /** Étiquette de la Terre sur le dessin. */
  here: string;
  /** Nom de la Terre dans la légende : « Terre (vous êtes ici) ». */
  earthInLegend(name: string): string;
  /** Nom de la légende quand chaque planète dit sa position, lue sur un cadran (`clock`). */
  legendWithPositions: string;
  /** Position d'une planète autour du Soleil, comme l'heure d'un cadran (1 à 12) : « à 8 heures ». */
  clock(hour: number): string;
}

export const HOME_STRINGS: Readonly<Record<Locale, HomeStrings>> = {
  fr: {
    orreryTitle: "Les huit planètes autour du Soleil, vues du dessus",
    datedLead: "Positions réelles du",
    dateReserve: "28 septembre 2026",
    note: "Vu du dessus. Orbites rapprochées et planètes agrandies pour tenir dans le cadre.",
    here: "Vous êtes ici",
    earthInLegend: (name) => `${name} (vous êtes ici)`,
    legendWithPositions:
      "Les huit planètes et leur place autour du Soleil, lue comme l'heure sur un cadran, midi en haut",
    clock: (hour) => plural("fr", hour, { one: `à ${hour} heure`, other: `à ${hour} heures` }),
  },
  en: {
    orreryTitle: "The eight planets around the Sun, seen from above",
    datedLead: "Real positions on",
    dateReserve: "28 September 2026",
    note: "Seen from above. Orbits drawn closer together and planets enlarged to fit.",
    here: "You are here",
    earthInLegend: (name) => `${name} (you are here)`,
    legendWithPositions:
      "The eight planets and where they sit around the Sun, read like a clock face with 12 at the top",
    clock: (hour) => `at ${hour} o'clock`,
  },
  es: {
    orreryTitle: "Los ocho planetas alrededor del Sol, vistos desde arriba",
    datedLead: "Posiciones reales del",
    dateReserve: "28 de septiembre de 2026",
    note: "Visto desde arriba. Órbitas más juntas y planetas agrandados para que quepan.",
    here: "Estás aquí",
    earthInLegend: (name) => `${name} (estás aquí)`,
    legendWithPositions:
      "Los ocho planetas y su posición alrededor del Sol, leída como la hora en un reloj, con las 12 arriba",
    clock: (hour) => plural("es", hour, { one: `a la ${hour}`, other: `a las ${hour}` }),
  },
};
