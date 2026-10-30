import type { Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { withUnit } from "@/i18n/units";
import type { PlanetKey } from "@/lib/astro/planets";
import type { ComparedStar, SizeStarKey } from "@/lib/astro/starSizes";
import { formatNumber } from "@/lib/format";
import { pickComparison } from "@/lib/sizes/comparisons";

/**
 * Chaînes de la page « Tailles » lues par les composants client (règle, menu, étoile affichée, étiquettes de la scène)
 * et par les plaques (noms, rayons, comparaison). Nombres écrits par Intl, unités jointes par `withUnit`.
 */
export interface SizesStrings {
  /** Noms officiels des étoiles (données v2, § 6.3) ; celui du Soleil vient de `bodyName`. */
  names: Readonly<Record<SizeStarKey, string>>;
  /** Nom accessible de la règle des tailles. */
  railLabel: string;
  /** Légende sous la règle (décorative) : chaque graduation multiplie le rayon par 10. */
  railLegend: string;
  /**
   * Menu des étoiles : nom du `<nav>`, texte du bouton à l'introduction, et complément lu après le bouton
   * (sans ponctuation) selon qu'aucune étoile n'est encore affichée (`choose`) ou qu'une l'est (`change`).
   */
  menu: { nav: string; home: string; choose: string; change: string };
  /** Libellé de l'étoile affichée, dans la barre : « Étoile ». */
  current: string;
  /** Rayon en R☉, avec les décimales des données : « 0,154 R☉ », « 1 420 R☉ » ; « 0.154 R☉ », « 1,420 R☉ ». */
  radius(radiusSolar: number): string;
  /** Fourchette publiée d'un rayon débattu, lue sous la valeur retenue. */
  radiusRange(low: number, high: number): string;
  /** Comparaison parlante de l'étoile, en une phrase (règle de `pickComparison`). */
  comparison(star: ComparedStar): string;
  /** Échelle graphique de la scène : « 10 Soleils côte à côte ». */
  scaleBar(suns: number): string;
  labels: {
    /** Repère du Soleil dans la scène, posé même quand il y fait moins d'un pixel. */
    sunMarker: string;
  };
}

/** Décimales d'une valeur des données, telle qu'elle y est écrite : 0,154 → 3 ; 25,4 → 1 ; 1 420 → 0. */
function writtenDigits(value: number): number {
  const [, fraction = ""] = String(value).split(".");
  return fraction.length;
}

/** Valeur des données avec ses propres décimales, écrite selon la langue. */
const dataNumber = (value: number, locale: Locale) => formatNumber(value, writtenDigits(value), locale);

const solarRadii = (value: number, locale: Locale) => withUnit(dataNumber(value, locale), "solarRadius", locale);

/** Nombre déjà arrondi suivi du nom accordé : « 109 Terres », « 1 Soleil ». */
const counted = (count: number, forms: PluralForms, locale: Locale) =>
  `${formatNumber(count, 0, locale)} ${plural(locale, count, forms)}`;

/** Phrases de chaque sorte de comparaison, dans une langue. */
interface ComparisonPhrases {
  orbit(planet: PlanetKey): string;
  earths(count: number): string;
  suns(count: number): string;
}

function phrase(star: ComparedStar, phrases: ComparisonPhrases): string {
  const comparison = pickComparison(star.radiusSolar);
  switch (comparison.kind) {
    case "orbit":
      return phrases.orbit(comparison.planet);
    case "earths":
      return phrases.earths(comparison.count);
    case "suns":
      return phrases.suns(comparison.count);
  }
}

/** Complément de « l'orbite » en français : « de Mars », « de la Terre », « d'Uranus ». */
function ofPlanetFr(planet: PlanetKey): string {
  const name = bodyName(planet, "fr");
  if (planet === "earth") return `de la ${name}`;
  return /^[AEIOUYÉ]/.test(name) ? `d'${name}` : `de ${name}`;
}

/** Complément de « la órbita » en espagnol : « de Marte », « de la Tierra ». */
function ofPlanetEs(planet: PlanetKey): string {
  const name = bodyName(planet, "es");
  return planet === "earth" ? `de la ${name}` : `de ${name}`;
}

export const SIZES_STRINGS: Readonly<Record<Locale, SizesStrings>> = {
  fr: {
    names: {
      "proxima-centauri": "Proxima du Centaure",
      sun: bodyName("sun", "fr"),
      "sirius-a": "Sirius A",
      pollux: "Pollux",
      arcturus: "Arcturus",
      aldebaran: "Aldébaran",
      rigel: "Rigel",
      "antares-a": "Antarès A",
      betelgeuse: "Bételgeuse",
      "vy-canis-majoris": "VY Canis Majoris",
    },
    railLabel: "Règle des tailles, de la plus petite à la plus grande étoile",
    railLegend: "× 10 à chaque graduation",
    menu: { nav: "Étoiles", home: "Étoiles", choose: "choisir une étoile", change: "changer d'étoile" },
    current: "Étoile",
    radius: (radiusSolar) => solarRadii(radiusSolar, "fr"),
    radiusRange: (low, high) => `de ${dataNumber(low, "fr")} à ${solarRadii(high, "fr")} selon les études`,
    comparison: (star) =>
      phrase(star, {
        orbit: (planet) => `À la place du Soleil, sa surface dépasserait l'orbite ${ofPlanetFr(planet)}.`,
        earths: (count) =>
          `Il faudrait environ ${counted(count, { one: "Terre", other: "Terres" }, "fr")} côte à côte pour égaler son diamètre.`,
        suns: (count) => `Son volume contiendrait environ ${counted(count, { one: "Soleil", other: "Soleils" }, "fr")}.`,
      }),
    scaleBar: (suns) => `${counted(suns, { one: "Soleil", other: "Soleils" }, "fr")} côte à côte`,
    labels: { sunMarker: bodyName("sun", "fr") },
  },
  en: {
    names: {
      "proxima-centauri": "Proxima Centauri",
      sun: bodyName("sun", "en"),
      "sirius-a": "Sirius A",
      pollux: "Pollux",
      arcturus: "Arcturus",
      aldebaran: "Aldebaran",
      rigel: "Rigel",
      "antares-a": "Antares A",
      betelgeuse: "Betelgeuse",
      "vy-canis-majoris": "VY Canis Majoris",
    },
    railLabel: "Size scale, from the smallest to the largest star",
    railLegend: "× 10 per mark",
    menu: { nav: "Stars", home: "Stars", choose: "choose a star", change: "change star" },
    current: "Star",
    radius: (radiusSolar) => solarRadii(radiusSolar, "en"),
    radiusRange: (low, high) => `${dataNumber(low, "en")}–${solarRadii(high, "en")}, depending on the study`,
    comparison: (star) =>
      phrase(star, {
        orbit: (planet) => `In the Sun's place, its surface would reach beyond the orbit of ${bodyName(planet, "en")}.`,
        earths: (count) =>
          `It would take about ${counted(count, { one: "Earth", other: "Earths" }, "en")} side by side to span its diameter.`,
        suns: (count) => `Its volume could hold about ${counted(count, { one: "Sun", other: "Suns" }, "en")}.`,
      }),
    scaleBar: (suns) => `${counted(suns, { one: "Sun", other: "Suns" }, "en")} side by side`,
    labels: { sunMarker: bodyName("sun", "en") },
  },
  es: {
    names: {
      "proxima-centauri": "Próxima Centauri",
      sun: bodyName("sun", "es"),
      "sirius-a": "Sirio A",
      pollux: "Pólux",
      arcturus: "Arturo",
      aldebaran: "Aldebarán",
      rigel: "Rigel",
      "antares-a": "Antares A",
      betelgeuse: "Betelgeuse",
      "vy-canis-majoris": "VY Canis Majoris",
    },
    railLabel: "Escala de tamaños, de la estrella más pequeña a la más grande",
    railLegend: "× 10 en cada marca",
    menu: { nav: "Estrellas", home: "Estrellas", choose: "elegir una estrella", change: "cambiar de estrella" },
    current: "Estrella",
    radius: (radiusSolar) => solarRadii(radiusSolar, "es"),
    radiusRange: (low, high) => `entre ${dataNumber(low, "es")} y ${solarRadii(high, "es")} según los estudios`,
    comparison: (star) =>
      phrase(star, {
        orbit: (planet) => `En el lugar del Sol, su superficie llegaría más allá de la órbita ${ofPlanetEs(planet)}.`,
        earths: (count) =>
          `Harían falta unas ${counted(count, { one: "Tierra", other: "Tierras" }, "es")} en fila para igualar su diámetro.`,
        suns: (count) => `Su volumen podría contener unos ${counted(count, { one: "sol", other: "soles" }, "es")}.`,
      }),
    scaleBar: (suns) => `${counted(suns, { one: "sol", other: "soles" }, "es")} en fila`,
    labels: { sunMarker: bodyName("sun", "es") },
  },
};
