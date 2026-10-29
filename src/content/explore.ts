import type { Instrument, Visibility } from "@/lib/astro/earthView";
import { formatNumber } from "@/lib/format";
import type { ExploreStop } from "@/lib/journey/orbit";

/*
 * Textes du mode « Tourner autour » et de la lecture « Vu depuis la Terre », tous ici pour la traduction à venir
 * (phrases, accords et écriture des nombres). Petits : ils partent dans le paquet client.
 */

/** Complément du nom : « Tourner autour » + complément. Record complet, vérifié par le compilateur. */
const TARGETS = {
  hero: "du système solaire",
  sun: "du Soleil",
  mercury: "de Mercure",
  venus: "de Vénus",
  earth: "de la Terre",
  mars: "de Mars",
  jupiter: "de Jupiter",
  saturn: "de Saturne",
  uranus: "d'Uranus",
  neptune: "de Neptune",
  beyond: "du système solaire",
  stars: "des étoiles voisines",
  galaxy: "de la Voie lactée",
} as const satisfies Record<ExploreStop, string>;

/** Quand regarder la planète, selon son élongation (règle de `visibilityOf`). */
const VISIBILITY = {
  "too-close": "Trop près du Soleil pour être vue",
  "evening-west": "Le soir, à l'ouest après le coucher du Soleil",
  "morning-east": "Le matin, à l'est avant le lever du Soleil",
  "all-night": "Toute la nuit",
  evening: "En soirée",
  "late-night": "En fin de nuit",
} as const satisfies Record<Visibility, string>;

/** Instrument à nommer : à l'œil nu, rien n'est ajouté. */
export type NamedInstrument = Exclude<Instrument, "eye">;

const INSTRUMENT = {
  binoculars: "aux jumelles",
  telescope: "au télescope",
} as const satisfies Record<NamedInstrument, string>;

const SIDE = { east: "à l'est", west: "à l'ouest" } as const satisfies Record<"east" | "west", string>;

/** Lecture « vu depuis la Terre », chaque valeur déjà arrondie comme elle s'affiche. */
export interface ReadingFigures {
  /** Fraction éclairée du disque, en pour cent (entier). */
  percent: number;
  /** Diamètre apparent, en secondes d'arc, arrondi à `diameterDigits` décimales. */
  diameter: number;
  diameterDigits: number;
  /** Séparation Soleil–planète vue de la Terre, en degrés (entier). */
  elongation: number;
  /** Côté du Soleil : l'est est le ciel du soir. */
  side: "east" | "west";
  visibility: Visibility;
  /** Instrument nécessaire, ou null (œil nu, ou planète trop près du Soleil pour être vue). */
  instrument: NamedInstrument | null;
}

/** Nom d'unité accordé à la française : singulier sous 2 (« 1,5 degré »), pluriel à partir de 2. */
const unit = (value: number, one: string, many: string) => (Math.abs(value) < 2 ? one : many);

/** « Le soir, à l'ouest après le coucher du Soleil », suivi de l'instrument quand il en faut un. */
const whenToLook = (figures: ReadingFigures) =>
  figures.instrument === null
    ? VISIBILITY[figures.visibility]
    : `${VISIBILITY[figures.visibility]}, ${INSTRUMENT[figures.instrument]}`;

const READING_TITLE = "Vu depuis la Terre, ce jour";

export const EXPLORE = {
  /** Libellé visible du bouton de la barre haute ; le complément (TARGETS) reste pour les lecteurs d'écran. */
  enter: "Tourner autour",
  targets: TARGETS,
  /** Nom du groupe des commandes, qui reçoit le focus à l'entrée. */
  group: (target: string) => `Exploration autour ${target}`,
  /** Annonce de l'entrée : où l'on est, et comment tourner. */
  announce: (target: string) =>
    `Exploration autour ${target}. Faites glisser pour tourner, pincez ou utilisez la molette pour changer la distance. Au clavier : flèches pour tourner, plus et moins pour la distance, 0 pour recentrer, Échap pour terminer.`,
  /** Rappel des gestes, sur grand écran seulement. */
  hint: "Glisser pour tourner · molette pour la distance · Échap pour terminer",
  done: "Terminer",
  rotateLeft: "Tourner vers la gauche",
  rotateRight: "Tourner vers la droite",
  rotateUp: "Tourner vers le haut",
  rotateDown: "Tourner vers le bas",
  closer: "Se rapprocher",
  farther: "S'éloigner",
  recenter: "Recentrer",
  fromEarth: "Vu depuis la Terre",
  reading: {
    title: READING_TITLE,
    /**
     * Deux lignes visibles : « Éclairée à 49 % · 24″ de diamètre · 46° à l'est du Soleil », puis quand regarder.
     * Espace avant %, aucune avant ″ et ° (comme les fiches).
     */
    lines: (figures: ReadingFigures): readonly [string, string] => [
      `Éclairée à ${formatNumber(figures.percent)} % · ${formatNumber(figures.diameter, figures.diameterDigits)}″ de diamètre · ${formatNumber(figures.elongation)}° ${SIDE[figures.side]} du Soleil`,
      whenToLook(figures),
    ],
    /** Phrase annoncée à l'activation, unités en toutes lettres (un lecteur d'écran lit mal ″ et °). */
    spoken: (figures: ReadingFigures) =>
      `${READING_TITLE} : éclairée à ${formatNumber(figures.percent)} %, ${formatNumber(figures.diameter, figures.diameterDigits)} ${unit(figures.diameter, "seconde d'arc", "secondes d'arc")} de diamètre, ${formatNumber(figures.elongation)} ${unit(figures.elongation, "degré", "degrés")} ${SIDE[figures.side]} du Soleil. ${whenToLook(figures)}.`,
  },
} as const;
