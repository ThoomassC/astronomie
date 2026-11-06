import type { Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { withUnit } from "@/i18n/units";
import type { ComparedBlackHole } from "@/lib/astro/blackHoles";
import type { PlanetKey } from "@/lib/astro/planets";
import { formatCompact, formatNumber } from "@/lib/format";
import { pickBlackHoleComparison, pickComparison, radiusKm, roundSignificant } from "@/lib/sizes/comparisons";
import { comparedRadiusSolar, type ComparedObject, type SizeObjectKey } from "@/lib/sizes/objects";
import type { ScaleBar } from "@/lib/sizes/scaleBar";

/** Genre grammatical d'un astre, qui accorde son rang : une étoile, un trou noir. */
export type Gender = "feminine" | "masculine";

/**
 * Chaînes de la page « Tailles » lues par les composants client (règle, menu, astre affiché, étiquettes de la scène)
 * et par les plaques (noms, tailles, masses, comparaison). Nombres écrits par Intl, unités jointes par `withUnit`.
 * Un trou noir s'y mesure par son ombre, comme dans toute la page.
 */
export interface SizesStrings {
  /**
   * Noms officiels des astres (données v2, § 6.3, fiche des trous noirs) ; celui du Soleil vient de `bodyName`. Un nom
   * suivi d'une taille (règle, liste du menu, étiquettes) désigne l'astre même : « Trou noir du Fer à cheval cosmique »,
   * et non « Fer à cheval cosmique », sa galaxie-lentille, qui n'a pas cette taille.
   */
  names: Readonly<Record<SizeObjectKey, string>>;
  /**
   * Noms courts, pour la barre (bouton du menu, astre affiché après sa sorte), où aucune taille ne suit le nom et où la
   * place manque sur téléphone : à 375 px, le bouton du menu laisse 170 px au nom. Seulement pour un nom trop long ;
   * à défaut, `names`.
   */
  shortNames: Readonly<Partial<Record<SizeObjectKey, string>>>;
  /** Nom accessible de la règle des tailles. */
  railLabel: string;
  /** Légende sous la règle (décorative) : chaque graduation multiplie la taille par 10. */
  railLegend: string;
  /**
   * Menu des astres : nom du `<nav>`, texte du bouton à l'introduction, et complément lu après le bouton
   * (sans ponctuation) selon qu'aucun astre n'est encore affiché (`choose`) ou qu'un l'est (`change`).
   */
  menu: { nav: string; home: string; choose: string; change: string };
  /** Libellé de l'astre affiché, dans la barre, selon sa sorte : « Étoile », « Trou noir ». */
  current: Readonly<Record<ComparedObject["kind"], string>>;
  /**
   * Taille comparée, comme la règle, le menu et les étiquettes l'écrivent : rayon d'une étoile (« 764 R☉ ») ; ombre d'un
   * trou noir, aux chiffres significatifs de sa masse (« 47,4 R☉ »), en kilomètres sous 0,01 R☉ (« 163 km »).
   */
  size(object: ComparedObject): string;
  /** Rayon en R☉, avec les décimales des données : « 0,154 R☉ », « 1 420 R☉ » ; « 0.154 R☉ », « 1,420 R☉ ». */
  radius(radiusSolar: number): string;
  /** Fourchette publiée d'un rayon débattu, lue sous la valeur retenue. */
  radiusRange(low: number, high: number): string;
  /** Rayon en R☉ à `digits` chiffres significatifs : « 18,2 R☉ », « 28 000 R☉ », « 0,0000900 R☉ ». */
  solarRadii(radiusSolar: number, digits: number): string;
  /** Longueur en km, `digits` chiffres significatifs, en mots au-delà du million : « 62,6 km », « 12,7 millions de km ». */
  kilometres(km: number, digits: number): string;
  /** Masse, en mots au-delà du million : « 21,2 masses solaires », « 4,3 millions de masses solaires ». */
  mass(massSolar: number, digits: number): string;
  /** Fourchette publiée d'une masse débattue, lue sous la valeur retenue. */
  massRange(low: number, high: number, digits: number): string;
  /** Comparaison parlante de l'astre, en une phrase : étoile (`pickComparison`), ombre d'un trou noir (`pickBlackHoleComparison`). */
  comparison(object: ComparedObject): string;
  /** Échelle graphique de la scène : « 10 Soleils côte à côte », « 500 km », « 2 millions de km ». */
  scaleBar(bar: ScaleBar): string;
  /**
   * Rang d'un astre parmi `total`, du plus petit au plus grand, accordé à sa sorte : nombre, suffixe (en exposant en
   * français), total : « 1re sur 14 » (étoile), « 1er sur 14 » (trou noir), « 9th of 14 », « 9.ª de 14 », « 13.º de 14 ».
   */
  rank(position: number, total: number, gender: Gender): { value: string; suffix: string; superscript: boolean; total: string };
  /**
   * Distance en années-lumière, en toutes lettres : une décimale sous 10 al, entière ensuite, en mots au-delà du
   * million : « 4,2 années-lumière », « 548 années-lumière », « 55 millions d'années-lumière ».
   */
  lightYears(distanceLy: number): string;
  /** Temps de trajet de la lumière d'un astre lointain, en mots : « lumière partie il y a 4,8 milliards d'années ». */
  lightTravel(years: number): string;
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

/** Décimales qui écrivent `digits` chiffres significatifs : 47,4 → 1 ; 28 000 → 0 ; 0,0000900 → 7. */
function significantDecimals(value: number, digits: number): number {
  return value === 0 ? 0 : Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(value))));
}

/** Valeur arrondie à `digits` chiffres significatifs, écrite selon la langue avec ces chiffres-là. */
function significantNumber(value: number, digits: number, locale: Locale): string {
  const rounded = roundSignificant(value, digits);
  return formatNumber(rounded, significantDecimals(rounded, digits), locale);
}

/** Valeur des données avec ses propres décimales, écrite selon la langue. */
const dataNumber = (value: number, locale: Locale) => formatNumber(value, writtenDigits(value), locale);

const dataSolarRadii = (value: number, locale: Locale) => withUnit(dataNumber(value, locale), "solarRadius", locale);

const solarRadiiIn = (value: number, digits: number, locale: Locale) =>
  withUnit(significantNumber(value, digits, locale), "solarRadius", locale);

/** Nombre déjà arrondi suivi du nom accordé : « 109 Terres », « 1 Soleil ». */
const counted = (count: number, forms: PluralForms, locale: Locale) =>
  `${formatNumber(count, 0, locale)} ${plural(locale, count, forms)}`;

/** Dès ce nombre, il s'écrit en mots (Intl compact long) : « 2 millions », « 2 million », « 2 millones ». */
const IN_WORDS_FROM = 1e6;

/** Nombre de Soleils de l'échelle graphique, en chiffres, puis en mots dès le million, suivi de `millionsOf` (« de Soleils »). */
const sunsIn = (count: number, forms: PluralForms, locale: Locale, millionsOf: string) =>
  count >= IN_WORDS_FROM ? `${formatCompact(count, locale, 1)} ${millionsOf}` : counted(count, forms, locale);

/**
 * Longueur en km à `digits` chiffres significatifs : en chiffres sous le million (« 62,6 km », « 100 000 km ») ; en mots
 * au-delà, suivie de `millionsOf` (« 12,7 millions de km », « 2 million km »).
 */
function kilometresIn(km: number, digits: number, locale: Locale, millionsOf: string): string {
  const value = roundSignificant(km, digits);
  if (value >= IN_WORDS_FROM) return `${formatCompact(value, locale, 2)} ${millionsOf}`;
  return withUnit(formatNumber(value, significantDecimals(value, digits), locale), "km", locale);
}

/** Sous cette taille, en R☉ (7 000 km), l'ombre d'un trou noir s'écrit en kilomètres : « 163 km ». */
const KILOMETRES_BELOW_SOLAR = 0.01;

/** Taille comparée d'un astre (`size`), dans une langue ; `millionsOfKm` suit les grandes longueurs en mots. */
function sizeIn(object: ComparedObject, locale: Locale, millionsOfKm: string): string {
  if (object.kind === "star") return dataSolarRadii(object.radiusSolar, locale);
  const shadow = comparedRadiusSolar(object);
  return shadow < KILOMETRES_BELOW_SOLAR
    ? kilometresIn(radiusKm(shadow), object.significantDigits, locale, millionsOfKm)
    : solarRadiiIn(shadow, object.significantDigits, locale);
}

/** Masse à `digits` chiffres significatifs : nom accordé sous le million (« 21,2 masses solaires »), en mots au-delà. */
function massIn(massSolar: number, digits: number, locale: Locale, forms: PluralForms, millionsOf: string): string {
  const value = roundSignificant(massSolar, digits);
  if (value >= IN_WORDS_FROM) return `${formatCompact(value, locale, 2)} ${millionsOf}`;
  return `${formatNumber(value, significantDecimals(value, digits), locale)} ${plural(locale, value, forms)}`;
}

/**
 * Bas d'une fourchette de masses, écrit dans l'unité de mots de son haut (milliards, millions) : « 5,4 » pour
 * 5,37 milliards quand le haut vaut 7,2 milliards ; « 12,7 » sous le million.
 */
function rangeLowIn(low: number, high: number, digits: number, locale: Locale): string {
  const scale = high >= 1e9 ? 1e9 : high >= IN_WORDS_FROM ? 1e6 : 1;
  const value = roundSignificant(low, digits) / scale;
  return formatNumber(value, significantDecimals(value, digits), locale);
}

/** Sous cette distance, en années-lumière, une décimale (4,2) ; au-delà, entière (548). */
const ONE_DECIMAL_BELOW_LY = 10;

/** Distance en années-lumière, suivie du nom accordé ; en mots au-delà du million, suivie de `millionsOf`. */
const lightYearsIn = (distanceLy: number, forms: PluralForms, locale: Locale, millionsOf: string) => {
  if (distanceLy >= IN_WORDS_FROM) return `${formatCompact(distanceLy, locale, 1)} ${millionsOf}`;
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

/** Phrases de chaque sorte de comparaison, dans une langue : étoiles, puis ombres des trous noirs. */
interface ComparisonPhrases {
  orbit(planet: PlanetKey): string;
  earths(count: number): string;
  suns(count: number): string;
  /** Ombre plus petite que la Terre : son diamètre, déjà écrit (« 330 km »). */
  shadowKm(diameter: string): string;
  shadowInsideOrbit(planet: PlanetKey): string;
  shadowBeyondNeptune(times: number): string;
}

function phrase(object: ComparedObject, phrases: ComparisonPhrases, millionsOfKm: string, locale: Locale): string {
  if (object.kind === "black-hole") return shadowPhrase(object, phrases, millionsOfKm, locale);
  const comparison = pickComparison(object.radiusSolar);
  switch (comparison.kind) {
    case "orbit":
      return phrases.orbit(comparison.planet);
    case "earths":
      return phrases.earths(comparison.count);
    case "suns":
      return phrases.suns(comparison.count);
  }
}

function shadowPhrase(hole: ComparedBlackHole, phrases: ComparisonPhrases, millionsOfKm: string, locale: Locale): string {
  const comparison = pickBlackHoleComparison(comparedRadiusSolar(hole));
  switch (comparison.kind) {
    case "km":
      return phrases.shadowKm(kilometresIn(comparison.diameterKm, 2, locale, millionsOfKm));
    case "insideOrbit":
      return phrases.shadowInsideOrbit(comparison.planet);
    case "beyondNeptune":
      return phrases.shadowBeyondNeptune(comparison.times);
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

const MASS_FR: PluralForms = { one: "masse solaire", other: "masses solaires" };
const MASS_EN: PluralForms = { one: "solar mass", other: "solar masses" };
const MASS_ES: PluralForms = { one: "masa solar", other: "masas solares" };

/** Nom d'un astre autour de son nom court : `lead` + `core` + `tail` donnent le nom entier ; `core`, le nom court. */
export interface ObjectNameParts {
  lead: string;
  core: string;
  tail: string;
}

/**
 * Nom d'un astre découpé autour de son nom court (`shortNames`), pour l'étiquette de la scène, dont la forme courte ne
 * garde que `core`. Sans nom court, ou s'il ne figure pas dans le nom entier, `core` est le nom entier.
 */
export function nameParts(t: SizesStrings, key: SizeObjectKey): ObjectNameParts {
  const name = t.names[key];
  const short = t.shortNames[key];
  const at = short === undefined ? -1 : name.indexOf(short);
  if (short === undefined || at < 0) return { lead: "", core: name, tail: "" };
  return { lead: name.slice(0, at), core: short, tail: name.slice(at + short.length) };
}

export const SIZES_STRINGS: Readonly<Record<Locale, SizesStrings>> = {
  fr: {
    names: {
      "cygnus-x-1": "Cygnus X-1",
      "proxima-centauri": "Proxima du Centaure",
      sun: bodyName("sun", "fr"),
      "sirius-a": "Sirius A",
      pollux: "Pollux",
      arcturus: "Arcturus",
      aldebaran: "Aldébaran",
      "sagittarius-a-star": "Sagittarius A*",
      rigel: "Rigel",
      "antares-a": "Antarès A",
      betelgeuse: "Bételgeuse",
      "vy-canis-majoris": "VY Canis Majoris",
      "m87-star": "M87*",
      "cosmic-horseshoe": "Trou noir du Fer à cheval cosmique",
    },
    shortNames: { "cosmic-horseshoe": "Fer à cheval cosmique" },
    railLabel: "Règle des tailles, du plus petit au plus grand astre",
    railLegend: "× 10 à chaque graduation",
    menu: { nav: "Étoiles et trous noirs", home: "Astres", choose: "choisir un astre", change: "changer d'astre" },
    current: { star: "Étoile", "black-hole": "Trou noir" },
    size: (object) => sizeIn(object, "fr", "de km"),
    radius: (radiusSolar) => dataSolarRadii(radiusSolar, "fr"),
    radiusRange: (low, high) => `de ${dataNumber(low, "fr")} à ${dataSolarRadii(high, "fr")} selon les études`,
    solarRadii: (radiusSolar, digits) => solarRadiiIn(radiusSolar, digits, "fr"),
    kilometres: (km, digits) => kilometresIn(km, digits, "fr", "de km"),
    mass: (massSolar, digits) => massIn(massSolar, digits, "fr", MASS_FR, "de masses solaires"),
    massRange: (low, high, digits) =>
      `de ${rangeLowIn(low, high, digits, "fr")} à ${massIn(high, digits, "fr", MASS_FR, "de masses solaires")} selon les études`,
    comparison: (object) =>
      phrase(
        object,
        {
          orbit: (planet) => `À la place du Soleil, sa surface dépasserait l'orbite ${ofPlanetFr(planet)}.`,
          earths: (count) =>
            `Il faudrait environ ${counted(count, { one: "Terre", other: "Terres" }, "fr")} côte à côte pour égaler son diamètre.`,
          suns: (count) => `Son volume contiendrait environ ${counted(count, { one: "Soleil", other: "Soleils" }, "fr")}.`,
          shadowKm: (diameter) => `Son ombre ne mesure qu'environ ${diameter} de diamètre.`,
          shadowInsideOrbit: (planet) => `À la place du Soleil, son ombre tiendrait dans l'orbite ${ofPlanetFr(planet)}.`,
          shadowBeyondNeptune: (times) =>
            `À la place du Soleil, son ombre engloutirait tout le système solaire, jusqu'à ${formatNumber(times, 0, "fr")} fois l'orbite de Neptune.`,
        },
        "de km",
        "fr",
      ),
    scaleBar: (bar) =>
      bar.unit === "km"
        ? kilometresIn(bar.count, 1, "fr", "de km")
        : `${sunsIn(bar.count, { one: "Soleil", other: "Soleils" }, "fr", "de Soleils")} côte à côte`,
    // 1re étoile, 1er trou noir ; puis 2e, 3e… pour les deux.
    rank: (position, total, gender) => ({
      value: String(position),
      suffix: position === 1 ? (gender === "feminine" ? "re" : "er") : "e",
      superscript: true,
      total: ` sur ${total}`,
    }),
    lightYears: (distanceLy) =>
      lightYearsIn(distanceLy, { one: "année-lumière", other: "années-lumière" }, "fr", "d'années-lumière"),
    lightTravel: (years) => `lumière partie il y a ${formatCompact(years, "fr", 1)} d'années`,
    labels: { sunMarker: bodyName("sun", "fr") },
  },
  en: {
    names: {
      "cygnus-x-1": "Cygnus X-1",
      "proxima-centauri": "Proxima Centauri",
      sun: bodyName("sun", "en"),
      "sirius-a": "Sirius A",
      pollux: "Pollux",
      arcturus: "Arcturus",
      aldebaran: "Aldebaran",
      "sagittarius-a-star": "Sagittarius A*",
      rigel: "Rigel",
      "antares-a": "Antares A",
      betelgeuse: "Betelgeuse",
      "vy-canis-majoris": "VY Canis Majoris",
      "m87-star": "M87*",
      "cosmic-horseshoe": "Cosmic Horseshoe black hole",
    },
    shortNames: { "cosmic-horseshoe": "Cosmic Horseshoe" },
    railLabel: "Size scale, from the smallest to the largest object",
    railLegend: "× 10 per mark",
    menu: { nav: "Stars and black holes", home: "Objects", choose: "choose an object", change: "change object" },
    current: { star: "Star", "black-hole": "Black hole" },
    size: (object) => sizeIn(object, "en", "km"),
    radius: (radiusSolar) => dataSolarRadii(radiusSolar, "en"),
    radiusRange: (low, high) => `${dataNumber(low, "en")}–${dataSolarRadii(high, "en")}, depending on the study`,
    solarRadii: (radiusSolar, digits) => solarRadiiIn(radiusSolar, digits, "en"),
    kilometres: (km, digits) => kilometresIn(km, digits, "en", "km"),
    mass: (massSolar, digits) => massIn(massSolar, digits, "en", MASS_EN, "solar masses"),
    massRange: (low, high, digits) =>
      `${rangeLowIn(low, high, digits, "en")}–${massIn(high, digits, "en", MASS_EN, "solar masses")}, depending on the study`,
    comparison: (object) =>
      phrase(
        object,
        {
          orbit: (planet) => `In the Sun's place, its surface would reach beyond the orbit of ${bodyName(planet, "en")}.`,
          earths: (count) =>
            `It would take about ${counted(count, { one: "Earth", other: "Earths" }, "en")} side by side to span its diameter.`,
          suns: (count) => `Its volume could hold about ${counted(count, { one: "Sun", other: "Suns" }, "en")}.`,
          shadowKm: (diameter) => `Its shadow is only about ${diameter} across.`,
          shadowInsideOrbit: (planet) => `In the Sun's place, its shadow would fit inside the orbit of ${bodyName(planet, "en")}.`,
          shadowBeyondNeptune: (times) =>
            `In the Sun's place, its shadow would swallow the whole Solar System, out to ${formatNumber(times, 0, "en")} times Neptune's orbit.`,
        },
        "km",
        "en",
      ),
    scaleBar: (bar) =>
      bar.unit === "km"
        ? kilometresIn(bar.count, 1, "en", "km")
        : `${sunsIn(bar.count, { one: "Sun", other: "Suns" }, "en", "Suns")} side by side`,
    // Sans genre en anglais.
    rank: (position, total) => ({
      value: String(position),
      suffix: EN_ORDINAL_SUFFIXES[enOrdinals.select(position)],
      superscript: false,
      total: ` of ${total}`,
    }),
    lightYears: (distanceLy) => lightYearsIn(distanceLy, { one: "light-year", other: "light-years" }, "en", "light-years"),
    lightTravel: (years) => `light that set out ${formatCompact(years, "en", 1)} years ago`,
    labels: { sunMarker: bodyName("sun", "en") },
  },
  es: {
    names: {
      "cygnus-x-1": "Cygnus X-1",
      "proxima-centauri": "Próxima Centauri",
      sun: bodyName("sun", "es"),
      "sirius-a": "Sirio A",
      pollux: "Pólux",
      arcturus: "Arturo",
      aldebaran: "Aldebarán",
      "sagittarius-a-star": "Sagitario A*",
      rigel: "Rigel",
      "antares-a": "Antares A",
      betelgeuse: "Betelgeuse",
      "vy-canis-majoris": "VY Canis Majoris",
      "m87-star": "M87*",
      "cosmic-horseshoe": "Agujero negro de la Herradura Cósmica",
    },
    shortNames: { "cosmic-horseshoe": "Herradura Cósmica" },
    railLabel: "Escala de tamaños, del astro más pequeño al más grande",
    railLegend: "× 10 en cada marca",
    menu: { nav: "Estrellas y agujeros negros", home: "Astros", choose: "elegir un astro", change: "cambiar de astro" },
    current: { star: "Estrella", "black-hole": "Agujero negro" },
    size: (object) => sizeIn(object, "es", "de km"),
    radius: (radiusSolar) => dataSolarRadii(radiusSolar, "es"),
    radiusRange: (low, high) => `entre ${dataNumber(low, "es")} y ${dataSolarRadii(high, "es")} según los estudios`,
    solarRadii: (radiusSolar, digits) => solarRadiiIn(radiusSolar, digits, "es"),
    kilometres: (km, digits) => kilometresIn(km, digits, "es", "de km"),
    mass: (massSolar, digits) => massIn(massSolar, digits, "es", MASS_ES, "de masas solares"),
    massRange: (low, high, digits) =>
      `entre ${rangeLowIn(low, high, digits, "es")} y ${massIn(high, digits, "es", MASS_ES, "de masas solares")} según los estudios`,
    comparison: (object) =>
      phrase(
        object,
        {
          orbit: (planet) => `En el lugar del Sol, su superficie llegaría más allá de la órbita ${ofPlanetEs(planet)}.`,
          earths: (count) =>
            `Harían falta unas ${counted(count, { one: "Tierra", other: "Tierras" }, "es")} en fila para igualar su diámetro.`,
          suns: (count) => `Su volumen podría contener unos ${counted(count, { one: "sol", other: "soles" }, "es")}.`,
          shadowKm: (diameter) => `Su sombra mide solo unos ${diameter} de diámetro.`,
          shadowInsideOrbit: (planet) => `En el lugar del Sol, su sombra cabría dentro de la órbita ${ofPlanetEs(planet)}.`,
          shadowBeyondNeptune: (times) =>
            `En el lugar del Sol, su sombra engulliría todo el sistema solar, hasta ${formatNumber(times, 0, "es")} veces la órbita de Neptuno.`,
        },
        "de km",
        "es",
      ),
    scaleBar: (bar) =>
      bar.unit === "km"
        ? kilometresIn(bar.count, 1, "es", "de km")
        : `${sunsIn(bar.count, { one: "sol", other: "soles" }, "es", "de soles")} en fila`,
    // Ordinal accordé, sans exposant (l'indicateur l'est déjà) : « la 9.ª estrella », « el 13.º agujero negro ».
    rank: (position, total, gender) => ({
      value: String(position),
      suffix: gender === "feminine" ? ".ª" : ".º",
      superscript: false,
      total: ` de ${total}`,
    }),
    lightYears: (distanceLy) => lightYearsIn(distanceLy, { one: "año luz", other: "años luz" }, "es", "de años luz"),
    lightTravel: (years) => `luz que partió hace ${formatCompact(years, "es", 1)} de años`,
    labels: { sunMarker: bodyName("sun", "es") },
  },
};
