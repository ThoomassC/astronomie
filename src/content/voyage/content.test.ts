import { describe, expect, it } from "vitest";
import { ABOUT_URLS, ccByUrl } from "@/content/about/structure";
import { getVoyageContent } from "@/content/voyage/content";
import {
  BEYOND_MARKS,
  nearbyStarsSource,
  SOLAR_STOP_STRUCTURE,
  type BodyStopStructure,
} from "@/content/voyage/structure";
import type { VoyageContent } from "@/content/voyage/types";
import { LOCALES, type Locale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";

/** Langues traduites depuis le français. */
const TRANSLATED = ["en", "es"] as const satisfies readonly Locale[];

const BODY_KEYS = SOLAR_STOP_STRUCTURE.filter((stop): stop is BodyStopStructure => stop.kind === "body").map(
  ({ key }) => key,
);

/**
 * Feuilles de texte d'un contenu, avec leur chemin (« bodies.saturn.facts.7.note »). Les fonctions (rang, lecture de
 * l'échelle) et les adresses des liens (`href`) n'en sont pas : elles ont leurs propres tests.
 */
function textLeaves(value: unknown, path = ""): [path: string, text: string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => key !== "href")
      .flatMap(([key, child]) => textLeaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

/** Tout le texte d'une langue, d'un seul tenant. */
const allText = (locale: Locale) =>
  textLeaves(getVoyageContent(locale))
    .map(([, text]) => text)
    .join("\n");

/** Repères de l'échelle de l'au-delà, dans l'ordre de l'échelle. */
const marksOf = (content: VoyageContent) => BEYOND_MARKS.map(({ key }) => content.beyond.marks[key]);

/**
 * Feuilles qu'une traduction peut écrire comme le français : noms propres, sigles, et valeurs faites seulement de
 * nombres, de signes et de symboles d'unités (« 92 bar », « 24 h 40 min », « −65 °C »).
 */
const SAME_AS_FRENCH: Readonly<Record<(typeof TRANSLATED)[number], readonly string[]>> = {
  en: ["Surface", "Volume", "Neptune", "Kuiper", "Voyager 2", "Voyager 1", "Solar System Scope", "CC BY 4.0"],
  es: ["Kuiper", "Voyager 2", "Voyager 1", "Solar System Scope", "CC BY 4.0"],
};
const UNIT_SYMBOLS = new Set(["km", "UA", "AU", "g", "h", "min", "bar", "m", "s", "C"]);
const isNumbersAndUnits = (text: string) => (text.match(/\p{L}+/gu) ?? []).every((word) => UNIT_SYMBOLS.has(word));

/**
 * Nombres écrits dans un texte, dans la typographie de la langue : séparateur de milliers puis décimales (« 1,392,700 »,
 * « 0.39 » ; « 1.392.700 », « 0,39 »). L'anglais groupe dès 4 chiffres, l'espagnol dès 5.
 */
const NUMBER_PATTERNS: Readonly<Record<(typeof TRANSLATED)[number], RegExp>> = {
  en: /\d+(?:,\d{3})*(?:\.\d+)?/g,
  es: /\d+(?:\.\d{3})*(?:,\d+)?/g,
};

/** Valeur et nombre de décimales d'un nombre écrit dans la langue. */
function parseWritten(token: string, locale: (typeof TRANSLATED)[number]): { value: number; digits: number } {
  const [whole, fraction = ""] = locale === "en" ? token.split(".") : token.split(",");
  const digitsOnly = whole.replace(/[.,]/g, "");
  return { value: Number(`${digitsOnly}.${fraction || "0"}`), digits: fraction.length };
}

/** Années (« 1846 », « 2011 ») et minutes sur deux chiffres (« 16 h 06 min ») : écrites sans séparateur partout. */
const isYearOrMinutes = (token: string) => /^(1[5-9]|20)\d\d$/.test(token) || /^0\d$/.test(token);

describe("getVoyageContent", () => {
  it.each(LOCALES)("devrait écrire les neuf astres, du Soleil à Neptune, dans l'ordre de la page (%s)", (locale) => {
    expect(Object.keys(getVoyageContent(locale).bodies)).toEqual(BODY_KEYS);
  });

  it.each(LOCALES)("ne devrait laisser aucun texte vide ni reste de brouillon (%s)", (locale) => {
    const leaves = textLeaves(getVoyageContent(locale));
    expect(leaves.length).toBeGreaterThan(150);
    for (const [path, text] of leaves) {
      expect(text.trim(), path).not.toBe("");
      expect(text, path).not.toMatch(/TODO|FIXME|XXX/);
    }
  });

  it.each(TRANSLATED)("devrait garder en %s les fiches du français : mêmes lignes, mêmes précisions", (locale) => {
    const shape = (content: VoyageContent) =>
      BODY_KEYS.map((key) => content.bodies[key].facts.map(({ note }) => note !== undefined));
    expect(shape(getVoyageContent(locale))).toEqual(shape(getVoyageContent("fr")));
  });

  it.each(TRANSLATED)("devrait tout traduire en %s, sans recopier le français (noms propres et valeurs à part)", (locale) => {
    const french = new Map(textLeaves(getVoyageContent("fr")));
    const leaves = textLeaves(getVoyageContent(locale));
    expect(leaves.map(([path]) => path)).toEqual([...french.keys()]);
    for (const [path, text] of leaves) {
      if (SAME_AS_FRENCH[locale].includes(text) || isNumbersAndUnits(text)) continue;
      expect(text, path).not.toBe(french.get(path));
    }
  });

  it.each([
    ["fr", "Lire la fiche", "Lire la suite", "Revenir au Soleil"],
    ["en", "Read the fact sheet", "Read more", "Back to the Sun"],
    ["es", "Leer la ficha", "Leer más", "Volver al Sol"],
  ] as const)("devrait nommer les boutons des plaques selon le glossaire du site (%s)", (locale, story, more, back) => {
    const content = getVoyageContent(locale);
    expect(content.plate).toEqual({ story, more });
    expect(content.beyond.back).toBe(back);
  });
});

describe("rang des planètes (ordinal)", () => {
  it.each([
    [1, "1", "re"],
    [3, "3", "e"],
    [8, "8", "e"],
  ] as const)("devrait écrire %i en français, accordé à « planète » : %s + %s", (n, number, suffix) => {
    expect(getVoyageContent("fr").ordinal(n)).toEqual({ number, suffix });
  });

  it.each([
    [1, "st"],
    [2, "nd"],
    [3, "rd"],
    [4, "th"],
    [11, "th"],
    [12, "th"],
    [13, "th"],
    [21, "st"],
    [22, "nd"],
  ] as const)("devrait écrire %i en anglais avec le suffixe « %s »", (n, suffix) => {
    expect(getVoyageContent("en").ordinal(n)).toEqual({ number: String(n), suffix });
  });

  it.each([
    [1, "1.", "er"],
    [2, "2.º", ""],
    [3, "3.", "er"],
    [4, "4.º", ""],
    [8, "8.º", ""],
    [11, "11.º", ""],
    [13, "13.", "er"],
  ] as const)("devrait écrire %i en espagnol, accordé à « planeta » (masculin) : %s + %s", (n, number, suffix) => {
    expect(getVoyageContent("es").ordinal(n)).toEqual({ number, suffix });
  });
});

describe("au-delà de Neptune", () => {
  it.each([
    ["fr", "≈ 7 h", "environ 7 heures"],
    ["fr", "4 h 10", "4 heures 10"],
    ["en", "≈ 7 h", "about 7 hours"],
    ["en", "4 h 10 min", "4 hours 10 minutes"],
    ["es", "≈ 7 h", "unas 7 horas"],
    ["es", "4 h 10 min", "4 horas y 10 minutos"],
  ] as const)("devrait lire à voix haute en %s « %s » : « %s »", (locale, value, spoken) => {
    expect(getVoyageContent(locale).beyond.spoken(value)).toBe(spoken);
  });

  it.each(LOCALES)("devrait lire chaque durée de l'échelle sans symbole (%s)", (locale) => {
    const { beyond } = getVoyageContent(locale);
    for (const { label, value } of marksOf(getVoyageContent(locale))) {
      expect(beyond.spoken(value), label).not.toMatch(/≈|\bh\b|\bmin\b/);
    }
  });

  it.each([
    [
      "fr",
      "Neptune\u00a0: 4 heures 10\u202f; Pluton\u00a0: 5 heures 28\u202f; Kuiper\u00a0: environ 7 heures\u202f; Voyager 2\u00a0: environ 20 heures\u202f; Voyager 1\u00a0: environ 24 heures.",
    ],
    [
      "en",
      "Neptune: 4 hours 10 minutes; Pluto: 5 hours 28 minutes; Kuiper: about 7 hours; Voyager 2: about 20 hours; Voyager 1: about 24 hours.",
    ],
    [
      "es",
      "Neptuno: 4 horas y 10 minutos; Plutón: 5 horas y 28 minutos; Kuiper: unas 7 horas; Voyager 2: unas 20 horas; Voyager 1: unas 24 horas.",
    ],
  ] as const)("devrait dire toute l'échelle d'une seule phrase en %s", (locale, sentence) => {
    const content = getVoyageContent(locale);
    expect(content.beyond.spokenScale(marksOf(content))).toBe(sentence);
  });
});

describe("pied de page du voyage", () => {
  it.each(LOCALES)("devrait créditer les cartes de Solar System Scope sous CC BY 4.0, résumé dans la langue (%s)", (locale) => {
    const { textures } = getVoyageContent(locale).footer;
    expect(textures.source).toEqual({ label: "Solar System Scope", href: ABOUT_URLS.solarSystemScope });
    expect(textures.license).toEqual({ label: "CC BY 4.0", href: ccByUrl(locale) });
  });

  it.each(LOCALES)("devrait citer les références des étoiles voisines dans la ponctuation de la langue (%s)", (locale) => {
    expect(getVoyageContent(locale).footer.sources).toContain(nearbyStarsSource(locale));
  });
});

describe("typographie du voyage", () => {
  it.each(LOCALES)("ne devrait employer ni guillemet droit ni points de suspension en trois points (%s)", (locale) => {
    expect(allText(locale)).not.toMatch(/"|\.\.\./);
  });

  it.each(LOCALES)("devrait écrire les nombres négatifs avec le signe moins (U+2212), pas le trait d'union (%s)", (locale) => {
    expect(allText(locale)).not.toMatch(/(^|[\s(])-\d/m);
  });

  it.each(LOCALES)("devrait espacer °C du nombre et coller le degré d'angle (%s)", (locale) => {
    const text = allText(locale);
    expect(text).not.toMatch(/\d°C/);
    expect(text).not.toMatch(/\d\s°(?!C)/);
  });

  it.each(TRANSLATED)("devrait écrire chaque nombre comme Intl l'écrit en %s (milliers, décimales)", (locale) => {
    for (const [path, text] of textLeaves(getVoyageContent(locale))) {
      for (const token of text.match(NUMBER_PATTERNS[locale]) ?? []) {
        if (isYearOrMinutes(token)) continue;
        const { value, digits } = parseWritten(token, locale);
        expect(token, `${path} : « ${text} »`).toBe(formatNumber(value, digits, locale));
      }
    }
  });

  it("devrait employer en anglais AU, les guillemets “ ”, % collé, et rien avant : ni ;", () => {
    const english = allText("en");
    expect(english).toContain("“");
    expect(english).not.toMatch(/[«»]|\bUA\b|\d\s%|\s[:;]/);
  });

  it("devrait employer en espagnol UA, les guillemets « » collés au texte, % espacé, et rien avant : ni ;", () => {
    const spanish = allText("es");
    expect(spanish).toContain("«");
    expect(spanish).not.toMatch(/«\s|\s»|\bAU\b|\d%|\s[:;]/);
  });

  it("devrait ouvrir en espagnol chaque question par ¿ et chaque exclamation par ¡", () => {
    for (const [path, text] of textLeaves(getVoyageContent("es"))) {
      expect(text.split("¿").length, path).toBe(text.split("?").length);
      expect(text.split("¡").length, path).toBe(text.split("!").length);
    }
  });
});
