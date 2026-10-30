import type { Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { withUnit } from "@/i18n/units";
import type { Instrument, Visibility } from "@/lib/astro/earthView";
import type { PlanetKey } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import type { ExploreStop } from "@/lib/journey/orbit";

/** Instrument à nommer : à l'œil nu, rien n'est ajouté. */
export type NamedInstrument = Exclude<Instrument, "eye">;

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

/** Textes du mode « Tourner autour » et de la lecture « Vu depuis la Terre ». */
export interface ExploreStrings {
  /** Libellé visible du bouton de la barre haute ; le complément (`targets`) reste pour les lecteurs d'écran. */
  enter: string;
  /** Complément lu après `enter` : « Tourner autour » + « de Saturne », « Orbit » + « Saturn ». */
  targets: Readonly<Record<ExploreStop, string>>;
  /** Nom du groupe des commandes, qui reçoit le focus à l'entrée. */
  group(target: string): string;
  /** Annonce de l'entrée : où l'on est, et comment tourner. */
  announce(target: string): string;
  /** Rappel des gestes, sur grand écran seulement. */
  hint: string;
  done: string;
  rotateLeft: string;
  rotateRight: string;
  rotateUp: string;
  rotateDown: string;
  closer: string;
  farther: string;
  recenter: string;
  /** Bascule de la vue depuis la Terre, aux sept autres planètes. */
  fromEarth: string;
  reading: {
    title: string;
    /** Deux lignes visibles : éclairage, diamètre et élongation, puis quand regarder. */
    lines(figures: ReadingFigures): readonly [string, string];
    /** Phrase annoncée à l'activation, unités en toutes lettres (un lecteur d'écran lit mal ″ et °). */
    spoken(figures: ReadingFigures): string;
  };
}

/** Escales d'un astre, nommé par `bodyName`. */
type BodyStop = "sun" | PlanetKey;

/** Compléments des escales d'un astre, dans l'ordre du voyage, construits par la grammaire d'une langue. */
function bodyTargets(around: (body: BodyStop) => string): Readonly<Record<BodyStop, string>> {
  return {
    sun: around("sun"),
    mercury: around("mercury"),
    venus: around("venus"),
    earth: around("earth"),
    mars: around("mars"),
    jupiter: around("jupiter"),
    saturn: around("saturn"),
    uranus: around("uranus"),
    neptune: around("neptune"),
  };
}

/** « du Soleil », « de la Terre », « d'Uranus », « de Saturne ». */
function aroundFr(body: BodyStop): string {
  const name = bodyName(body, "fr");
  if (body === "sun") return `du ${name}`;
  if (body === "earth") return `de la ${name}`;
  return /^[AEIOUYÉ]/.test(name) ? `d'${name}` : `de ${name}`;
}

/** « the Sun », « Earth », « Saturn ». */
const aroundEn = (body: BodyStop) => (body === "sun" ? `the ${bodyName(body, "en")}` : bodyName(body, "en"));

/** « del Sol », « de la Tierra », « de Saturno ». */
function aroundEs(body: BodyStop): string {
  const name = bodyName(body, "es");
  if (body === "sun") return `del ${name}`;
  if (body === "earth") return `de la ${name}`;
  return `de ${name}`;
}

/** Nombres de la lecture écrits dans la langue, avec et sans unité : « 49 % », « 3,8″ », « 46° » ; « 3,8 », « 46 ». */
function written(figures: ReadingFigures, locale: Locale) {
  const diameter = formatNumber(figures.diameter, figures.diameterDigits, locale);
  const elongation = formatNumber(figures.elongation, 0, locale);
  return {
    percent: withUnit(formatNumber(figures.percent, 0, locale), "percent", locale),
    diameter,
    elongation,
    diameterArcsec: withUnit(diameter, "arcsec", locale),
    elongationDeg: withUnit(elongation, "degree", locale),
  };
}

/** Nombre écrit suivi de l'unité accordée selon la langue : « 1,5 seconde d'arc », « 24 arcseconds ». */
const counted = (locale: Locale, value: number, text: string, forms: PluralForms) =>
  `${text} ${plural(locale, value, forms)}`;

/** Mots d'une langue pour dire quand regarder. */
interface WhenWords {
  visibility: Readonly<Record<Visibility, string>>;
  instrument: Readonly<Record<NamedInstrument, string>>;
}

/** Quand regarder (règle de `visibilityOf`), suivi de l'instrument quand il en faut un. */
function whenToLook(figures: ReadingFigures, words: WhenWords): string {
  const when = words.visibility[figures.visibility];
  return figures.instrument === null ? when : `${when}, ${words.instrument[figures.instrument]}`;
}

const WHEN_FR: WhenWords = {
  visibility: {
    "too-close": "Trop près du Soleil pour être vue",
    "evening-west": "Le soir, à l'ouest après le coucher du Soleil",
    "morning-east": "Le matin, à l'est avant le lever du Soleil",
    "all-night": "Toute la nuit",
    evening: "En soirée",
    "late-night": "En fin de nuit",
  },
  instrument: { binoculars: "aux jumelles", telescope: "au télescope" },
};

const WHEN_EN: WhenWords = {
  visibility: {
    "too-close": "Too close to the Sun to be seen",
    "evening-west": "In the evening, in the west after sunset",
    "morning-east": "In the morning, in the east before sunrise",
    "all-night": "All night",
    evening: "In the evening",
    "late-night": "In the early hours",
  },
  instrument: { binoculars: "with binoculars", telescope: "with a telescope" },
};

const WHEN_ES: WhenWords = {
  visibility: {
    "too-close": "Demasiado cerca del Sol para verse",
    "evening-west": "Al anochecer, al oeste tras la puesta de sol",
    "morning-east": "Al amanecer, al este antes de la salida del sol",
    "all-night": "Toda la noche",
    evening: "En las primeras horas de la noche",
    "late-night": "De madrugada",
  },
  instrument: { binoculars: "con prismáticos", telescope: "con telescopio" },
};

const SIDE_FR = { east: "à l'est", west: "à l'ouest" } as const;
const SIDE_ES = { east: "al este", west: "al oeste" } as const;
const ARCSECONDS_FR: PluralForms = { one: "seconde d'arc", other: "secondes d'arc" };
const DEGREES_FR: PluralForms = { one: "degré", other: "degrés" };
const ARCSECONDS_EN: PluralForms = { one: "arcsecond", other: "arcseconds" };
const DEGREES_EN: PluralForms = { one: "degree", other: "degrees" };
const ARCSECONDS_ES: PluralForms = { one: "segundo de arco", other: "segundos de arco" };
const DEGREES_ES: PluralForms = { one: "grado", other: "grados" };

const TITLE_FR = "Vu depuis la Terre, ce jour";
const TITLE_EN = "Seen from Earth on this date";
const TITLE_ES = "Visto desde la Tierra en esta fecha";

export const EXPLORE_STRINGS: Readonly<Record<Locale, ExploreStrings>> = {
  fr: {
    enter: "Tourner autour",
    targets: {
      hero: "du système solaire",
      ...bodyTargets(aroundFr),
      beyond: "du système solaire",
      stars: "des étoiles voisines",
      galaxy: "de la Voie lactée",
      localGroup: "du Groupe local",
      universe: "de l'Univers observable",
      multiverse: "du multivers",
    },
    group: (target) => `Exploration autour ${target}`,
    announce: (target) =>
      `Exploration autour ${target}. Faites glisser pour tourner, pincez ou utilisez la molette pour changer la distance. Au clavier : flèches pour tourner, plus et moins pour la distance, 0 pour recentrer, Échap pour terminer.`,
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
      title: TITLE_FR,
      // Espace avant %, aucune avant ″ et ° (comme les fiches).
      lines: (figures) => {
        const n = written(figures, "fr");
        return [
          `Éclairée à ${n.percent} · ${n.diameterArcsec} de diamètre · ${n.elongationDeg} ${SIDE_FR[figures.side]} du Soleil`,
          whenToLook(figures, WHEN_FR),
        ];
      },
      spoken: (figures) => {
        const n = written(figures, "fr");
        const diameter = counted("fr", figures.diameter, n.diameter, ARCSECONDS_FR);
        const elongation = counted("fr", figures.elongation, n.elongation, DEGREES_FR);
        return `${TITLE_FR} : éclairée à ${n.percent}, ${diameter} de diamètre, ${elongation} ${SIDE_FR[figures.side]} du Soleil. ${whenToLook(figures, WHEN_FR)}.`;
      },
    },
  },
  en: {
    enter: "Orbit",
    targets: {
      hero: "the Solar System",
      ...bodyTargets(aroundEn),
      beyond: "the Solar System",
      stars: "the nearby stars",
      galaxy: "the Milky Way",
      localGroup: "the Local Group",
      universe: "the observable Universe",
      multiverse: "the multiverse",
    },
    group: (target) => `Orbiting ${target}`,
    announce: (target) =>
      `Orbiting ${target}. Drag to turn, pinch or use the scroll wheel to change the distance. With the keyboard: arrow keys to turn, plus and minus for distance, 0 to recentre, Escape to finish.`,
    hint: "Drag to turn · scroll for distance · Esc to finish",
    done: "Done",
    rotateLeft: "Turn left",
    rotateRight: "Turn right",
    rotateUp: "Tilt up",
    rotateDown: "Tilt down",
    closer: "Move closer",
    farther: "Move away",
    recenter: "Recentre",
    fromEarth: "Seen from Earth",
    reading: {
      title: TITLE_EN,
      // % collé, comme ″ et ° (withUnit).
      lines: (figures) => {
        const n = written(figures, "en");
        return [
          `${n.percent} lit · ${n.diameterArcsec} across · ${n.elongationDeg} ${figures.side} of the Sun`,
          whenToLook(figures, WHEN_EN),
        ];
      },
      spoken: (figures) => {
        const n = written(figures, "en");
        const diameter = counted("en", figures.diameter, n.diameter, ARCSECONDS_EN);
        const elongation = counted("en", figures.elongation, n.elongation, DEGREES_EN);
        return `${TITLE_EN}: ${n.percent} lit, ${diameter} across, ${elongation} ${figures.side} of the Sun. ${whenToLook(figures, WHEN_EN)}.`;
      },
    },
  },
  es: {
    enter: "Girar alrededor",
    targets: {
      hero: "del sistema solar",
      ...bodyTargets(aroundEs),
      beyond: "del sistema solar",
      stars: "de las estrellas vecinas",
      galaxy: "de la Vía Láctea",
      localGroup: "del Grupo Local",
      universe: "del Universo observable",
      multiverse: "del multiverso",
    },
    group: (target) => `Girando alrededor ${target}`,
    announce: (target) =>
      `Girando alrededor ${target}. Arrastra para girar, pellizca o usa la rueda del ratón para cambiar la distancia. Con el teclado: flechas para girar, más y menos para la distancia, 0 para volver a centrar, Escape para terminar.`,
    hint: "Arrastra para girar · rueda para la distancia · Esc para terminar",
    done: "Terminar",
    rotateLeft: "Girar a la izquierda",
    rotateRight: "Girar a la derecha",
    rotateUp: "Girar hacia arriba",
    rotateDown: "Girar hacia abajo",
    closer: "Acercarse",
    farther: "Alejarse",
    recenter: "Volver a centrar",
    fromEarth: "Visto desde la Tierra",
    reading: {
      title: TITLE_ES,
      // « Iluminado » s'accorde avec « el planeta », masculin en espagnol.
      lines: (figures) => {
        const n = written(figures, "es");
        return [
          `Iluminado al ${n.percent} · ${n.diameterArcsec} de diámetro · ${n.elongationDeg} ${SIDE_ES[figures.side]} del Sol`,
          whenToLook(figures, WHEN_ES),
        ];
      },
      spoken: (figures) => {
        const n = written(figures, "es");
        const diameter = counted("es", figures.diameter, n.diameter, ARCSECONDS_ES);
        const elongation = counted("es", figures.elongation, n.elongation, DEGREES_ES);
        return `${TITLE_ES}: iluminado al ${n.percent}, ${diameter} de diámetro, ${elongation} ${SIDE_ES[figures.side]} del Sol. ${whenToLook(figures, WHEN_ES)}.`;
      },
    },
  },
};
