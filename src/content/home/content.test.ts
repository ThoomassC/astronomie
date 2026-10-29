import { describe, expect, it } from "vitest";
import { getHomeContent } from "@/content/home/content";
import { LOCALES, type Locale } from "@/i18n/locales";
import { KEY_FIGURES, keyFigureParts } from "@/lib/home/keyFigures";

/** Feuilles de texte d'un contenu, avec leur chemin (« cards.items.voyage.text »). */
function textLeaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => textLeaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

const OTHER_LOCALES: readonly Exclude<Locale, "fr">[] = ["en", "es"];

describe("getHomeContent", () => {
  it.each(LOCALES)("devrait donner des textes tous écrits, sans reste de brouillon (%s)", (locale) => {
    const leaves = textLeaves(getHomeContent(locale));
    expect(leaves.length).toBeGreaterThan(20);
    leaves.forEach(([path, text]) => {
      expect(text.trim(), path).not.toBe("");
      expect(text, path).not.toMatch(/TODO|FIXME|XXX/);
    });
  });

  it.each(OTHER_LOCALES)("devrait traduire chaque texte du français, mêmes clés, aucun mot recopié (%s)", (locale) => {
    const french = new Map(textLeaves(getHomeContent("fr")));
    const leaves = textLeaves(getHomeContent(locale));
    expect(leaves.map(([path]) => path)).toEqual([...french.keys()]);
    // La ponctuation seule (« . » après le lien vers À propos) est la même partout.
    leaves
      .filter(([, text]) => /\p{L}/u.test(text))
      .forEach(([path, text]) => expect(text, path).not.toBe(french.get(path)));
  });

  it.each(LOCALES)("devrait ouvrir une carte vers chaque autre page, dans l'ordre des onglets (%s)", (locale) => {
    expect(Object.keys(getHomeContent(locale).cards.items)).toEqual(["voyage", "sizes", "about"]);
  });

  it.each(LOCALES)("devrait légender chacun des quatre chiffres clés (%s)", (locale) => {
    expect(Object.keys(getHomeContent(locale).figures.items)).toEqual([...KEY_FIGURES]);
  });

  it.each(LOCALES)("devrait lire à voix haute les nombres affichés de « 8 min 19 s » (%s)", (locale) => {
    const { spoken } = getHomeContent(locale).figures.items.sunlight;
    const numbers = keyFigureParts("sunlight", locale)
      .filter((part) => part.kind === "number")
      .map((part) => part.text);
    expect(spoken?.match(/\d+/g)).toEqual(numbers);
  });

  it.each(LOCALES)("devrait écrire une unité en mots pour la seule étoile la plus proche (%s)", (locale) => {
    const { items } = getHomeContent(locale).figures;
    expect(KEY_FIGURES.filter((key) => items[key].unit !== undefined)).toEqual(["proxima"]);
  });
});
