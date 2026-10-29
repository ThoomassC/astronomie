import type { Locale } from "@/i18n/locales";
import type { PluralForms } from "@/i18n/plural";
import { counted, type Count } from "./common.strings";

/**
 * Textes de l'année neptunienne (Neptune). Les années (1846, 2012…) s'écrivent telles quelles, jamais groupées ;
 * parts d'orbite et nombres décimaux arrivent déjà écrits (`Count`, pour cent compris).
 */
export interface NeptuneYearStrings {
  /** Description du cadran ; la phrase des tours depuis la découverte s'y ajoute. */
  canvasLabel: string;
  /** Champ de l'année de naissance. */
  birthYear: string;
  /** Borne haute de l'exemple du champ : l'année en cours. */
  today: string;
  /** Année refusée, illisible ou hors bornes : la phrase donne les bornes. */
  error(min: number, max: number): string;
  /** Phrase des tours de Neptune depuis sa découverte, ajoutée à la description du cadran. */
  discovery(turns: Count): string;
  /** Tours de Neptune depuis sa découverte, accordés (canevas). */
  turns(count: Count): string;
  /** Orbites parcourues depuis la naissance, au-delà d'une orbite complète (canevas). */
  orbits(count: Count): string;
  /** Part d'une orbite parcourue depuis la naissance, en dessous d'une orbite complète (canevas). */
  orbitShare(share: string): string;
  /** Ligne de lecture quand la date du site précède la naissance. */
  notBorn: string;
  /** Ligne de lecture avant une orbite complète : part de l'orbite, âge sur Neptune et sur Mars. */
  beforeOneOrbit(birthYear: number, share: string, life: Count, mars: Count): string;
  /** Ligne de lecture au-delà d'une orbite complète. */
  afterOneOrbit(birthYear: number, life: Count, mars: Count): string;
  /** Repères du cadran, puis titres des deux valeurs dessinées à droite. */
  discovered: string;
  fullOrbit: string;
  yourLife: string;
  sinceDiscovery: string;
}

const TURNS_FR: PluralForms = { one: "tour", other: "tours" };
const NEPTUNE_YEARS_FR: PluralForms = { one: "année neptunienne", other: "années neptuniennes" };
const ORBITS_EN: PluralForms = { one: "orbit", other: "orbits" };
const NEPTUNE_YEARS_EN: PluralForms = { one: "Neptune year", other: "Neptune years" };
const YEARS_EN: PluralForms = { one: "year", other: "years" };
const TURNS_ES: PluralForms = { one: "vuelta", other: "vueltas" };
const NEPTUNE_YEARS_ES: PluralForms = { one: "año neptuniano", other: "años neptunianos" };
const YEARS_ES: PluralForms = { one: "año", other: "años" };

export const NEPTUNE_YEAR_STRINGS: Readonly<Record<Locale, NeptuneYearStrings>> = {
  fr: {
    canvasLabel: "Cadran de l'orbite de Neptune de 1846 à 2011",
    birthYear: "Année de naissance",
    today: "aujourd'hui",
    error: (min, max) => `Indiquez une année entre ${min} et ${max}.`,
    discovery: (turns) => `Depuis sa découverte, Neptune a fait ${counted("fr", turns, TURNS_FR)} du Soleil.`,
    turns: (count) => counted("fr", count, TURNS_FR),
    orbits: (count) => counted("fr", count, { one: "orbite", other: "orbites" }),
    orbitShare: (share) => `${share} d'une orbite`,
    notBorn: "La date du site est antérieure à votre naissance.",
    // Âge sur Mars toujours en « ans », comme avant la traduction.
    beforeOneOrbit: (birthYear, share, life, mars) =>
      `Depuis ${birthYear}, Neptune a parcouru ${share} de son orbite. Sur Neptune, vous n'auriez pas encore un an : ${counted("fr", life, NEPTUNE_YEARS_FR)}. Sur Mars, vous auriez ${mars.text} ans.`,
    afterOneOrbit: (birthYear, life, mars) =>
      `Depuis ${birthYear}, Neptune a fait plus d'un tour du Soleil. Sur Neptune, vous auriez ${counted("fr", life, NEPTUNE_YEARS_FR)}. Sur Mars, vous auriez ${mars.text} ans.`,
    discovered: "1846, découverte",
    fullOrbit: "2011, un tour complet",
    yourLife: "Votre vie",
    sinceDiscovery: "Depuis la découverte",
  },
  en: {
    canvasLabel: "Dial of Neptune's orbit from 1846 to 2011",
    birthYear: "Year of birth",
    today: "today",
    error: (min, max) => `Enter a year between ${min} and ${max}.`,
    discovery: (turns) => `Since its discovery, Neptune has completed ${counted("en", turns, ORBITS_EN)} of the Sun.`,
    turns: (count) => counted("en", count, ORBITS_EN),
    orbits: (count) => counted("en", count, ORBITS_EN),
    orbitShare: (share) => `${share} of an orbit`,
    notBorn: "The site's date is before you were born.",
    beforeOneOrbit: (birthYear, share, life, mars) =>
      `Since ${birthYear}, Neptune has travelled ${share} of its orbit. On Neptune, you would not be one year old yet: ${counted("en", life, NEPTUNE_YEARS_EN)}. On Mars, you would be ${counted("en", mars, YEARS_EN)} old.`,
    afterOneOrbit: (birthYear, life, mars) =>
      `Since ${birthYear}, Neptune has gone round the Sun more than once. On Neptune, you would be ${counted("en", life, NEPTUNE_YEARS_EN)} old. On Mars, you would be ${counted("en", mars, YEARS_EN)} old.`,
    discovered: "1846, discovery",
    fullOrbit: "2011, one full orbit",
    yourLife: "Your life",
    sinceDiscovery: "Since discovery",
  },
  es: {
    canvasLabel: "Dial de la órbita de Neptuno de 1846 a 2011",
    birthYear: "Año de nacimiento",
    today: "hoy",
    error: (min, max) => `Indica un año entre ${min} y ${max}.`,
    discovery: (turns) => `Desde su descubrimiento, Neptuno ha dado ${counted("es", turns, TURNS_ES)} al Sol.`,
    turns: (count) => counted("es", count, TURNS_ES),
    orbits: (count) => counted("es", count, { one: "órbita", other: "órbitas" }),
    orbitShare: (share) => `${share} de una órbita`,
    notBorn: "La fecha del sitio es anterior a tu nacimiento.",
    beforeOneOrbit: (birthYear, share, life, mars) =>
      `Desde ${birthYear}, Neptuno ha recorrido el ${share} de su órbita. En Neptuno, aún no tendrías ni un año: ${counted("es", life, NEPTUNE_YEARS_ES)}. En Marte, tendrías ${counted("es", mars, YEARS_ES)}.`,
    afterOneOrbit: (birthYear, life, mars) =>
      `Desde ${birthYear}, Neptuno ha dado más de una vuelta al Sol. En Neptuno, tendrías ${counted("es", life, NEPTUNE_YEARS_ES)}. En Marte, tendrías ${counted("es", mars, YEARS_ES)}.`,
    discovered: "1846, descubrimiento",
    fullOrbit: "2011, una vuelta completa",
    yourLife: "Tu vida",
    sinceDiscovery: "Desde el descubrimiento",
  },
};
