import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/locales";
import { loadStringTables, SERVER_CONTENTS, textLeaves } from "@/i18n/testUtils";

/*
 * Complétude des trois langues : chaque contenu serveur (`src/content/<domaine>`) et chaque table de chaînes client
 * (`*.strings.ts`) donne en anglais et en espagnol les mêmes textes qu'en français, aux mêmes places, sans vide ni
 * brouillon, et traduits. Une feuille recopiée du français est une traduction oubliée, sauf ce qui s'écrit pareil d'une
 * langue à l'autre : ponctuation, nombres et symboles, noms propres, et quelques mots listés un à un.
 */

/** Langues traduites depuis le français. */
const TRANSLATED = ["en", "es"] as const satisfies readonly Locale[];

type Translated = (typeof TRANSLATED)[number];

/** Marqueur de brouillon, en capitales seulement : l'espagnol « sobre todo » n'en est pas un. */
const DRAFT_MARK = /\b(?:TODO|FIXME|XXX)\b/;

/** Symboles d'unités et de points cardinaux, les mêmes dans les trois langues ou dans deux d'entre elles. */
const SYMBOLS: ReadonlySet<string> = new Set([
  ...["km", "UA", "AU", "al", "ly", "R", "K", "C", "g", "h", "min", "s", "m", "bar"],
  // Nord, des latitudes (« 49° N »).
  "N",
]);

/** Texte sans mot à traduire : ponctuation, nombres, signes et symboles (« . », « ≈ 5 % », « 464 °C », « R☉ »). */
const isNumbersAndSymbols = (text: string) => (text.match(/\p{L}+/gu) ?? []).every((word) => SYMBOLS.has(word));

/**
 * Places des noms propres, laissés tels quels : tables de noms d'étoiles et de galaxies (`starNames`, `galaxyNames`,
 * `names`), titres des sources de la page À propos (« NASA, Planetary Fact Sheet »), crédit des cartes (source, licence).
 */
const PROPER_NAME_PATHS =
  /(?:^|\.)(?:starNames|galaxyNames|names)\.[^.]+$|(?:^|\.)links\.\d+\.label$|(?:^|\.)textures\.(?:source|license)\.label$/;

/** Textes écrits exactement comme en français, un à un : noms propres hors des tables de noms, mots communs. */
const SAME_AS_FRENCH: Readonly<Record<Translated, readonly string[]>> = {
  en: [
    // Noms propres : astres, sondes, ville de référence des saisons.
    "Neptune",
    "Kuiper",
    "Voyager 1",
    "Voyager 2",
    "Sirius",
    "Sagittarius A*",
    "Paris",
    // Mots qui s'écrivent pareil en français et en anglais.
    "Menu",
    "Distance",
    "Type",
    "Surface",
    "Volume",
    "Pause",
    "Date",
    // « Version » 1.1.0, titre de chaque version des notes de version.
    "Version",
  ],
  // « sem » abrège « semaine » comme « semana ».
  es: ["Kuiper", "Voyager 1", "Voyager 2", "1 sem/s"],
};

/** Phrases calculées qui se construisent comme en français, par source et chemin. */
const SAME_FUNCTIONS_AS_FRENCH: Readonly<Record<Translated, readonly string[]>> = {
  en: [],
  // « En 2026 » : même préposition en espagnol.
  es: ["SEASONS_STRINGS inYear"],
};

/** Vrai quand une traduction peut écrire ce texte comme le français, à cette place. */
function mayEqualFrench(locale: Translated, path: string, text: string): boolean {
  return isNumbersAndSymbols(text) || PROPER_NAME_PATHS.test(path) || SAME_AS_FRENCH[locale].includes(text);
}

describe("règles de la complétude", () => {
  it.each([
    ["sobre todo enanas", false],
    ["Dos veces y media más masivo que todos los demás planetas", false],
    ["TODO traduire", true],
    ["Texte FIXME", true],
  ])("devrait chercher les marqueurs de brouillon en capitales seulement (« %s » : %s)", (text, draft) => {
    expect(DRAFT_MARK.test(text)).toBe(draft);
  });

  it.each([
    ["en", "menu", "Menu"],
    ["en", "footer.textures.after", "."],
    ["es", "sections.1.links.1.label", "NASA, Planetary Fact Sheet"],
    ["en", "sections.1.links.11.label", "Three.js"],
    ["es", "starNames.ross-128", "Ross 128"],
    ["en", "galaxyNames.m32", "M32"],
    ["es", "names.rigel", "Rigel"],
    ["es", "solarRadius", "R☉"],
    ["es", "facts.0.note", "4,25 al"],
    ["en", "distance", "1 ly"],
    ["es", "facts.0.value", "0,39 UA"],
    ["en", "facts.4.value", "−65 °C"],
  ] as const)("devrait accepter en %s, à la place « %s », le texte français « %s »", (locale, path, text) => {
    expect(mayEqualFrench(locale, path, text)).toBe(true);
  });

  it.each([
    ["es", "menu", "Menu"],
    ["en", "plate.story", "Lire la fiche"],
    ["es", "bodies.sun.facts.0.label", "Diamètre"],
    ["en", "stops.stars.name", "Les étoiles voisines"],
    ["es", "pause", "Pause"],
  ] as const)("devrait refuser en %s, à la place « %s », le texte français « %s »", (locale, path, text) => {
    expect(mayEqualFrench(locale, path, text)).toBe(false);
  });
});

const tables = await loadStringTables();

/** Chaque source de textes, nommée (« content/voyage », « JOURNEY_STRINGS ») et lue dans une langue. */
const SOURCES: readonly { name: string; read: (locale: Locale) => unknown }[] = [
  ...Object.entries(SERVER_CONTENTS).map(([domain, getContent]) => ({ name: `content/${domain}`, read: getContent })),
  ...tables.map(({ name, strings }) => ({ name, read: (locale: Locale) => strings[locale] })),
];

/** Forme d'une source dans une langue : le chemin de chaque feuille et sa nature (chaîne ou phrase calculée). */
const shapeOf = (value: unknown) => textLeaves(value).map(({ path, value: leaf }) => `${path} (${typeof leaf})`);

describe("complétude des trois langues", () => {
  it("devrait lire les sept contenus serveur et toutes les tables client, chacune en trois langues exactement", () => {
    expect(SOURCES.length).toBeGreaterThanOrEqual(7 + 17);
    for (const { name, strings } of tables) expect(Object.keys(strings).sort(), name).toEqual([...LOCALES].sort());
    // Garde contre le test vide : un peu plus de 800 feuilles en français aujourd'hui.
    const leaves = SOURCES.reduce((sum, { read }) => sum + textLeaves(read("fr")).length, 0);
    expect(leaves).toBeGreaterThan(700);
  });

  describe.each(SOURCES)("$name", ({ name, read }) => {
    it("devrait donner en anglais et en espagnol les mêmes feuilles qu'en français, aux mêmes places", () => {
      const french = shapeOf(read("fr"));
      expect(french.length).toBeGreaterThan(0);
      for (const locale of TRANSLATED) expect(shapeOf(read(locale)), locale).toEqual(french);
    });

    it("ne devrait laisser aucun texte vide ni marqueur de brouillon, dans aucune langue", () => {
      for (const locale of LOCALES) {
        for (const { path, value } of textLeaves(read(locale))) {
          const text = typeof value === "string" ? value : value.toString();
          expect(text.trim(), `${locale} ${path}`).not.toBe("");
          expect(text, `${locale} ${path}`).not.toMatch(DRAFT_MARK);
        }
      }
    });

    it("devrait tout traduire : aucun texte recopié du français en anglais ni en espagnol", () => {
      const french = new Map(textLeaves(read("fr")).map(({ path, value }) => [path, value]));
      const copies = TRANSLATED.flatMap((locale) =>
        textLeaves(read(locale)).flatMap(({ path, value }) => {
          const original = french.get(path);
          if (typeof value === "string") {
            const copied = value === original && !mayEqualFrench(locale, path, value);
            return copied ? [`${locale} ${path} : « ${value} »`] : [];
          }
          const copied = typeof original === "function" && value.toString() === original.toString();
          const allowed = SAME_FUNCTIONS_AS_FRENCH[locale].includes(`${name} ${path}`);
          return copied && !allowed ? [`${locale} ${path} (fonction)`] : [];
        }),
      );
      expect(copies).toEqual([]);
    });
  });
});
