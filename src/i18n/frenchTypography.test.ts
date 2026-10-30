import { describe, expect, it } from "vitest";
import {
  loadStringTables,
  SERVER_CONTENTS,
  sourceFiles,
  sourceLiterals,
  stringLeaves,
  type SourceLiteral,
} from "@/i18n/testUtils";

/*
 * Typographie française, sur tout le site : contenus serveur, tables de chaînes client, textes dessinés sur les
 * canevas (tables des modules). Règle :
 * - espace fine insécable (U+202F) entre les milliers, comme l'écrit Intl, et avant « ; », « ! », « ? » ;
 * - espace insécable (U+00A0) avant « : » et à l'intérieur des guillemets « » ;
 * - jamais d'espace ordinaire à ces places : la ligne pourrait s'y couper, et le site doit parler d'une seule voix.
 * Les messages pour les développeurs (exceptions, console) n'en sont pas : ils ne s'affichent pas.
 */

const NBSP = "\u00a0";
const NNBSP = "\u202f";

/** Nom lisible d'une espace, pour les messages d'échec. */
const SPACE_NAMES: Readonly<Record<string, string>> = {
  " ": "espace ordinaire",
  [NBSP]: "espace insécable (U+00A0)",
  [NNBSP]: "espace fine insécable (U+202F)",
};

/** Une place de la règle : où elle s'applique, l'espace attendue, les espaces fautives. */
interface SpacingPlace {
  name: string;
  expected: string;
  /** Espace fautive à cette place, capturée par le premier groupe. */
  wrong: RegExp;
  /** Ponctuation sans l'espace attendue, dans un texte entier seulement (un morceau de gabarit ignore ses voisins). */
  missing?: RegExp;
}

/* `\s` comprend U+00A0 et U+202F : « \S » est un caractère visible. */
const PLACES: readonly SpacingPlace[] = [
  { name: "entre les milliers", expected: NNBSP, wrong: /(?<=\d)([ \u00a0])(?=\d{3}(?!\d))/g },
  // « ?! » se suit sans espace.
  { name: "avant ; ! ?", expected: NNBSP, wrong: /([ \u00a0])(?=[;!?])/g, missing: /(?<=[^\s;!?])[;!?]/g },
  // Ni « 12:30 » ni « https:// » n'appellent d'espace.
  { name: "avant :", expected: NBSP, wrong: /([ \u202f])(?=:)/g, missing: /(?<=[^\s\d]):(?!\/\/)|(?<=\d):(?!\d)/g },
  { name: "après «", expected: NBSP, wrong: /(?<=«)([ \u202f])/g, missing: /«(?=\S)/g },
  { name: "avant »", expected: NBSP, wrong: /([ \u202f])(?=»)/g, missing: /(?<=\S)»/g },
];

/** Contexte d'une faute : dix caractères de part et d'autre, espaces spéciales rendues visibles. */
function around(text: string, index: number): string {
  return text
    .slice(Math.max(0, index - 10), index + 10)
    .replaceAll(NBSP, "⍽")
    .replaceAll(NNBSP, "‿");
}

/**
 * Fautes d'espacement d'un texte français. `whole` : le texte est entier (une valeur affichée) ; un littéral du code
 * peut n'être qu'un morceau (« Vitesse : » avant `${speed}`), seules ses espaces sont alors jugées.
 */
function frenchSpacingFaults(text: string, whole: boolean): string[] {
  return PLACES.flatMap(({ name, expected, wrong, missing }) => [
    ...Array.from(
      text.matchAll(wrong),
      (match) => `${SPACE_NAMES[match[1]]} ${name}, ${SPACE_NAMES[expected]} attendue : « ${around(text, match.index)} »`,
    ),
    ...(whole && missing
      ? Array.from(text.matchAll(missing), (match) => `aucune espace ${name}, ${SPACE_NAMES[expected]} attendue : « ${around(text, match.index)} »`)
      : []),
  ]);
}

describe("frenchSpacingFaults", () => {
  it.each([
    ["1 392 700 km", 2],
    [`1${NBSP}392 km`, 1],
    [`Soleil : Terre`, 1],
    [`Soleil${NNBSP}: Terre`, 1],
    ["vraiment ?", 1],
    [`vraiment${NBSP}!`, 1],
    [`ici ; là`, 1],
    ["« réelles »", 2],
    [`«${NNBSP}réelles${NNBSP}»`, 2],
  ])("devrait relever chaque espace fautive de « %s » (%i)", (text, count) => {
    expect(frenchSpacingFaults(text, false)).toHaveLength(count);
  });

  it.each([
    ["Soleil: Terre", 1],
    ["vraiment?", 1],
    ["«réelles»", 2],
    [`«${NBSP}réelles»`, 1],
  ])("devrait relever l'espace absente d'un texte entier « %s » (%i)", (text, count) => {
    expect(frenchSpacingFaults(text, true)).toHaveLength(count);
    expect(frenchSpacingFaults(text, false)).toEqual([]);
  });

  it.each([
    `1${NNBSP}392${NNBSP}700 km`,
    `Soleil${NBSP}: Terre`,
    `vraiment${NNBSP}?! oui${NNBSP}; non${NNBSP}!`,
    `«${NBSP}distances réelles${NBSP}»`,
    "de 1800 à 2050, 4 h 10, 8 min 19 s, M5.5Ve, 2039-2040",
    "12:30, https://example.org",
  ])("devrait accepter « %s »", (text) => {
    expect(frenchSpacingFaults(text, true)).toEqual([]);
  });
});

const tables = await loadStringTables();

/** Textes français affichés : chaque chaîne des contenus serveur et des tables client, avec sa provenance. */
const FRENCH_TEXTS = [
  ...Object.entries(SERVER_CONTENTS).flatMap(([domain, getContent]) =>
    stringLeaves(getContent("fr")).map(({ path, text }) => ({ origin: `content/${domain}`, path, text })),
  ),
  ...tables.flatMap(({ name, strings }) =>
    stringLeaves(strings.fr).map(({ path, text }) => ({ origin: name, path, text })),
  ),
];

/** Littéraux du code écrits en français : fichiers `fr.ts`, propriétés `fr`, déclarations `_FR` et `Fr`. */
const FRENCH_LITERALS: readonly SourceLiteral[] = sourceFiles()
  .flatMap(sourceLiterals)
  .filter(({ language }) => language === "fr");

describe("typographie française des textes affichés", () => {
  it("devrait lire tous les contenus serveur et toutes les tables client, en français", () => {
    const origins = new Set(FRENCH_TEXTS.map(({ origin }) => origin));
    expect(tables.length).toBeGreaterThanOrEqual(17);
    for (const domain of Object.keys(SERVER_CONTENTS)) expect(origins).toContain(`content/${domain}`);
    for (const { name } of tables) expect(origins).toContain(name);
    expect(FRENCH_TEXTS.length).toBeGreaterThan(600);
  });

  it.each([
    ["milliers", new RegExp(`\\d${NNBSP}\\d{3}`)],
    ["avant ;", new RegExp(`${NNBSP};`)],
    ["avant ?", new RegExp(`${NNBSP}\\?`)],
    ["avant :", new RegExp(`${NBSP}:`)],
    ["guillemets", new RegExp(`«${NBSP}[^»]+${NBSP}»`)],
  ])("devrait trouver la règle appliquée au moins une fois : %s", (_place, pattern) => {
    expect(FRENCH_TEXTS.some(({ text }) => pattern.test(text))).toBe(true);
  });

  it("ne devrait laisser aucune espace fautive, ni manquante, dans un texte affiché", () => {
    const faults = FRENCH_TEXTS.flatMap(({ origin, path, text }) =>
      frenchSpacingFaults(text, true).map((fault) => `${origin} ${path} : ${fault}`),
    );
    expect(faults).toEqual([]);
  });
});

describe("typographie française du code qui écrit les textes", () => {
  it("devrait lire les littéraux français des contenus, des tables et de leurs fonctions", () => {
    const files = new Set(FRENCH_LITERALS.map(({ file }) => file));
    expect(FRENCH_LITERALS.length).toBeGreaterThan(800);
    expect(files).toContain("src/content/voyage/fr.ts");
    expect(files).toContain("src/components/modules/neptuneYear.strings.ts");
    expect(files).toContain("src/components/journey/explore.strings.ts");
  });

  /*
   * Les fonctions des tables (pluriels, phrases calculées, lectures des canevas) écrivent leur texte par morceaux de
   * gabarit, que la lecture des valeurs ne voit pas : leurs espaces sont jugées ici, dans le code.
   */
  it("ne devrait laisser aucune espace fautive dans un littéral français, morceaux de gabarit compris", () => {
    const faults = FRENCH_LITERALS.flatMap(({ file, line, text }) =>
      frenchSpacingFaults(text, false).map((fault) => `${file}:${line} : ${fault}`),
    );
    expect(faults).toEqual([]);
  });
});
