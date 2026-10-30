import type { Locale } from "@/i18n/locales";

/** Textes des distances réelles hors du dock : bascule de l'accueil et de l'au-delà, note d'échelle. */
export interface ScaleStrings {
  /** Bascule de l'accueil et de l'au-delà : libellé fixe, l'état passe par `aria-pressed`. */
  show: string;
  /** Note d'échelle, visible tant que les distances réelles sont actives, annoncée quand on les active. */
  note: string;
  /** Bouton qui déplie la note sur téléphone, où elle tient sur une ligne (texte pour les lecteurs d'écran). */
  readNote: string;
  hideNote: string;
  /** Description de la bascule du dock, indisponible aux étoiles voisines et à la Voie lactée. */
  locked: string;
}

export const SCALE_STRINGS: Readonly<Record<Locale, ScaleStrings>> = {
  fr: {
    show: "Voir les distances réelles",
    note: "Distances réelles : chaque planète serait plus petite qu'un pixel, un cercle la signale. La Terre est à 1 UA du Soleil, Neptune à 30.",
    readNote: "Lire toute la note",
    hideNote: "Masquer la note",
    locked: "Ici, les distances sont déjà réelles.",
  },
  en: {
    show: "Show real distances",
    note: "Real distances: each planet would be smaller than a pixel, so a circle shows where it is. Earth is 1 AU from the Sun and Neptune is 30.",
    readNote: "Read the whole note",
    hideNote: "Hide note",
    locked: "Distances here are already real.",
  },
  es: {
    show: "Ver las distancias reales",
    note: "Distancias reales: cada planeta sería más pequeño que un píxel, así que un círculo indica dónde está. La Tierra está a 1 UA del Sol; Neptuno, a 30.",
    readNote: "Leer toda la nota",
    hideNote: "Ocultar la nota",
    locked: "Aquí las distancias ya son reales.",
  },
};
