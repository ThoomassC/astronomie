import type { Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { withUnit } from "@/i18n/units";
import type { PlanetKey } from "@/lib/astro/planets";
import type { ComparedStar, SizeStarKey } from "@/lib/astro/starSizes";
import { formatCompact, formatNumber } from "@/lib/format";
import { pickComparison, roundSignificant } from "@/lib/sizes/comparisons";
import type { ScaleBar } from "@/lib/sizes/scaleBar";

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
  /** Échelle graphique de la scène : « 10 Soleils côte à côte », « 500 km », « 2 millions de km ». */
  scaleBar(bar: ScaleBar): string;
  /**
   * Rang d'une étoile parmi `total`, de la plus petite à la plus grande : nombre, suffixe (en exposant en français),
   * total : « 9ᵉ sur 10 », « 9th of 10 », « 9.ª de 10 ».
   */
  rank(position: number, total: number): { value: string; suffix: string; superscript: boolean; total: string };
  /** Distance en années-lumière, en toutes lettres, une décimale sous 10 al : « 4,2 années-lumière », « 548 années-lumière ». */
  lightYears(distanceLy: number): string;
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

/** Dès ce nombre, il s'écrit en mots (Intl compact long) : « 2 millions », « 2 million », « 2 millones ». */
const IN_WORDS_FROM = 1e6;

/** Nombre de Soleils de l'échelle graphique, en chiffres, puis en mots dès le million, suivi de `millionsOf` (« de Soleils »). */
const sunsIn = (count: number, forms: PluralForms, locale: Locale, millionsOf: string) =>
  count >= IN_WORDS_FROM ? `${formatCompact(count, locale, 1)} ${millionsOf}` : counted(count, forms, locale);

/**
 * Longueur en km à `digits` chiffres significatifs : en chiffres, avec ses décimales, sous le million (« 62,6 km »,
 * « 100 000 km ») ; en mots au-delà, suivie de `millionsOf` (« 12,7 millions de km », « 2 million km »).
 */
function kilometresIn(km: number, digits: number, locale: Locale, millionsOf: string): string {
  const value = roundSignificant(km, digits);
  if (value >= IN_WORDS_FROM) return `${formatCompact(value, locale, 2)} ${millionsOf}`;
  return withUnit(formatNumber(value, writtenDigits(value), locale), "km", locale);
}

/** Sous cette distance, en années-lumière, une décimale (4,2) ; au-delà, entière (548). */
const ONE_DECIMAL_BELOW_LY = 10;

/** Distance en années-lumière avec ses décimales, suivie du nom accordé. */
const lightYearsIn = (distanceLy: number, forms: PluralForms, locale: Locale) => {
  const digits = distanceLy < ONE_DECIMAL_BELOW_LY ? 1 : 0;
  return `${formatNumber(distanceLy, digits, locale)} ${plural(locale, Number(distanceLy.toFixed(digits)), forms)}`;
};

/** Suffixes ordinaux anglais, par catégorie CLDR des ordinaux : 1st, 2nd, 3rd, 4th, 11th, 21st. */
const EN_ORDINAL_SUFFIXES: Readonly<Record<Intl.LDMLPluralRule, string>> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
};
const enOrdinals = new Intl.PluralRules("en-GB", { type: "ordinal" });

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
    scaleBar: (bar) =>
      bar.unit === "km"
        ? kilometresIn(bar.count, 1, "fr", "de km")
        : `${sunsIn(bar.count, { one: "Soleil", other: "Soleils" }, "fr", "de Soleils")} côte à côte`,
    rank: (position, total) => ({ value: String(position), suffix: position === 1 ? "re" : "e", superscript: true, total: ` sur ${total}` }),
    lightYears: (distanceLy) => lightYearsIn(distanceLy, { one: "année-lumière", other: "années-lumière" }, "fr"),
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
    scaleBar: (bar) =>
      bar.unit === "km"
        ? kilometresIn(bar.count, 1, "en", "km")
        : `${sunsIn(bar.count, { one: "Sun", other: "Suns" }, "en", "Suns")} side by side`,
    rank: (position, total) => ({
      value: String(position),
      suffix: EN_ORDINAL_SUFFIXES[enOrdinals.select(position)],
      superscript: false,
      total: ` of ${total}`,
    }),
    lightYears: (distanceLy) => lightYearsIn(distanceLy, { one: "light-year", other: "light-years" }, "en"),
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
    scaleBar: (bar) =>
      bar.unit === "km"
        ? kilometresIn(bar.count, 1, "es", "de km")
        : `${sunsIn(bar.count, { one: "sol", other: "soles" }, "es", "de soles")} en fila`,
    // Ordinal féminin (« la 9.ª estrella »), sans exposant : l'indicateur ª l'est déjà.
    rank: (position, total) => ({ value: String(position), suffix: ".ª", superscript: false, total: ` de ${total}` }),
    lightYears: (distanceLy) => lightYearsIn(distanceLy, { one: "año luz", other: "años luz" }, "es"),
    labels: { sunMarker: bodyName("sun", "es") },
  },
};
