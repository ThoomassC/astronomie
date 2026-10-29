import type { Locale } from "@/i18n/locales";

/** Textes de la balance (Mars) ; les astres sont nommés par `bodyName`, l'exemple du champ par `COMMON_STRINGS`. */
export interface WeightStrings {
  /** Champ de la masse, suivi de « kg ». */
  massLabel: string;
  /** Saisie refusée, illisible ou hors bornes : la même phrase donne les bornes (déjà écrites) et un exemple. */
  error(min: string, max: string): string;
  /** Annonce après une saisie valide : ce qu'afficherait la balance sur l'astre de l'escale… */
  here(body: string, reading: string): string;
  /** … puis le renvoi à la liste pour les autres astres. */
  others: string;
  /** Note sous la liste. */
  note: string;
}

export const WEIGHT_STRINGS: Readonly<Record<Locale, WeightStrings>> = {
  fr: {
    massLabel: "Masse sur Terre",
    error: (min, max) => `Indiquez une masse entre ${min} et ${max} kg, par exemple 40 ou 62,5.`,
    here: (body, reading) => `Sur ${body}, la balance afficherait ${reading}.`,
    others: "Les autres astres sont dans la liste.",
    note: "Pour les géantes gazeuses, gravité au sommet des nuages : on ne peut pas s'y poser.",
  },
  en: {
    massLabel: "Mass on Earth",
    error: (min, max) => `Enter a mass between ${min} and ${max} kg, for example 40 or 62.5.`,
    here: (body, reading) => `On ${body}, the scales would read ${reading}.`,
    others: "The other worlds are in the list.",
    note: "For the gas giants, this is the gravity at the cloud tops: there is nowhere to land.",
  },
  es: {
    massLabel: "Masa en la Tierra",
    error: (min, max) => `Indica una masa entre ${min} y ${max} kg, por ejemplo 40 o 62,5.`,
    here: (body, reading) => `En ${body}, la báscula marcaría ${reading}.`,
    others: "Los demás astros están en la lista.",
    note: "En los gigantes gaseosos, es la gravedad en la cima de las nubes: no hay dónde posarse.",
  },
};
