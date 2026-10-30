import type { Locale } from "@/i18n/locales";
import type { PlanetKey } from "@/lib/astro/planets";
import type { StopKey } from "@/lib/journey/camera";

/** Escales qui ne sont pas un astre : leur nom vient d'ici ; ceux du Soleil et des planètes, de `bodyName`. */
export type NonBodyStopKey = Exclude<StopKey, "sun" | PlanetKey>;

/**
 * Textes du voyage lus par ses composants client : barre haute (escale en cours, menu des escales), règle des
 * distances, plaques (bouton « Replier », ligne « ce jour » des fiches). Les nombres arrivent déjà écrits dans la
 * langue, unité comprise (`stopMeta`, `LiveDistance`).
 */
export interface JourneyStrings {
  /** Libellé de l'escale affichée, dans la barre haute : « Escale ». */
  currentStop: string;
  stopNames: Readonly<Record<NonBodyStopKey, string>>;
  /** Distance au Soleil sous le nom d'un repère de la règle et d'une escale du menu. */
  distance: {
    /** Le Soleil, et la vue d'ensemble qui se place comme lui. */
    centre: string;
    /** Étendue de la ceinture d'astéroïdes, unité après la seconde borne seulement : « 2,1 à 3,3 UA ». */
    range(inner: string, outer: string): string;
    /** Au-delà de Neptune : « plus de 30 UA ». */
    beyond(distance: string): string;
    /** Étoiles voisines, à partir de la plus proche : « dès 4,2 al ». */
    from(distance: string): string;
    /** Voie lactée, par la distance de son centre : « centre à 27 000 al ». */
    centreAt(distance: string): string;
    /** Groupe local, par la distance d'Andromède : « Andromède à 2,5 millions d'al ». */
    andromedaAt(distance: string): string;
    /** Univers observable, par son rayon : « rayon de 46 milliards d'al ». */
    radius(distance: string): string;
    /** Multivers, à l'infini : une hypothèse, pas une distance. */
    hypothesis: string;
  };
  /**
   * Menu des escales : nom du `<nav>`, texte du bouton à la vue d'ensemble, et complément lu après le bouton (sans
   * ponctuation) selon qu'aucune escale n'est encore affichée (`choose`) ou qu'une l'est (`change`).
   */
  stopsMenu: { nav: string; home: string; choose: string; change: string };
  /** Nom accessible de la règle des distances. */
  railLabel: string;
  /** Bouton qui replie toutes les sections d'une plaque (téléphones) ; le nom de l'astre est lu après lui. */
  fold: string;
  /** Seconde ligne de « ce jour », dans les fiches, sous la distance. */
  live: {
    /** Terre : sa distance au Soleil en millions de km, nombre déjà écrit. */
    millionKm(value: string): string;
    /** Autres astres : temps de trajet de la lumière depuis la Terre, durée déjà écrite. */
    lightTime(duration: string): string;
  };
}

export const JOURNEY_STRINGS: Readonly<Record<Locale, JourneyStrings>> = {
  fr: {
    currentStop: "Escale",
    stopNames: {
      hero: "Vue d'ensemble",
      belt: "Astéroïdes",
      beyond: "Au-delà",
      stars: "Étoiles voisines",
      galaxy: "Voie lactée",
      localGroup: "Groupe local",
      universe: "Univers observable",
      multiverse: "Multivers",
    },
    distance: {
      centre: "le centre",
      range: (inner, outer) => `${inner} à ${outer}`,
      beyond: (distance) => `plus de ${distance}`,
      from: (distance) => `dès ${distance}`,
      centreAt: (distance) => `centre à ${distance}`,
      andromedaAt: (distance) => `Andromède à ${distance}`,
      radius: (distance) => `rayon de ${distance}`,
      hypothesis: "hypothèse",
    },
    stopsMenu: { nav: "Escales", home: "Escales", choose: "choisir une escale", change: "changer d'escale" },
    railLabel: "Escales, du Soleil vers l'extérieur",
    fold: "Replier",
    live: {
      millionKm: (value) => `${value} millions de km`,
      lightTime: (duration) => `soit ${duration} à la vitesse de la lumière`,
    },
  },
  en: {
    currentStop: "Stop",
    stopNames: {
      hero: "Overview",
      belt: "Asteroids",
      beyond: "Beyond",
      stars: "Nearby stars",
      galaxy: "Milky Way",
      localGroup: "Local Group",
      universe: "Observable Universe",
      multiverse: "Multiverse",
    },
    distance: {
      centre: "the centre",
      range: (inner, outer) => `${inner} to ${outer}`,
      beyond: (distance) => `over ${distance}`,
      from: (distance) => `from ${distance}`,
      centreAt: (distance) => `centre at ${distance}`,
      andromedaAt: (distance) => `Andromeda at ${distance}`,
      radius: (distance) => `${distance} in radius`,
      hypothesis: "hypothesis",
    },
    stopsMenu: { nav: "Stops", home: "Stops", choose: "choose a stop", change: "change stop" },
    railLabel: "Stops, from the Sun outwards",
    fold: "Collapse",
    live: {
      millionKm: (value) => `${value} million km`,
      lightTime: (duration) => `i.e. ${duration} at the speed of light`,
    },
  },
  es: {
    currentStop: "Escala",
    stopNames: {
      hero: "Vista general",
      belt: "Asteroides",
      beyond: "Más allá",
      stars: "Estrellas vecinas",
      galaxy: "Vía Láctea",
      localGroup: "Grupo Local",
      universe: "Universo observable",
      multiverse: "Multiverso",
    },
    distance: {
      centre: "el centro",
      range: (inner, outer) => `de ${inner} a ${outer}`,
      beyond: (distance) => `más de ${distance}`,
      from: (distance) => `desde ${distance}`,
      centreAt: (distance) => `centro a ${distance}`,
      andromedaAt: (distance) => `Andrómeda a ${distance}`,
      radius: (distance) => `radio de ${distance}`,
      hypothesis: "hipótesis",
    },
    stopsMenu: { nav: "Escalas", home: "Escalas", choose: "elegir una escala", change: "cambiar de escala" },
    railLabel: "Escalas, del Sol hacia fuera",
    fold: "Plegar",
    live: {
      millionKm: (value) => `${value} millones de km`,
      lightTime: (duration) => `es decir, ${duration} a la velocidad de la luz`,
    },
  },
};
