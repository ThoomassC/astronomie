import { describe, expect, it } from "vitest";
import { SIZES_STRINGS } from "@/components/sizes/sizes.strings";
import { getSizesContent } from "@/content/sizes/content";
import { LOCALES } from "@/i18n/locales";
import { COMPARED_STARS } from "@/lib/astro/starSizes";

/*
 * Textes serveur de la page « Tailles » : complets dans les trois langues, traduits (pas recopiés du français), et
 * nombres écrits comme Intl les écrit dans chaque langue.
 */

/** Chaînes d'un contenu avec leur chemin (« stars.rigel.caveat ») : les échecs disent où regarder. */
function leaves(value: unknown, path = ""): (readonly [string, string])[] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
}

const FRENCH = new Map(leaves(getSizesContent("fr")));

describe("getSizesContent", () => {
  it.each(LOCALES)("devrait donner un texte à chacune des dix étoiles du comparateur (%s)", (locale) => {
    expect(Object.keys(getSizesContent(locale).stars).sort()).toEqual(COMPARED_STARS.map((star) => star.key).sort());
  });

  it.each(LOCALES)("ne devrait laisser aucun texte vide ni à faire (%s)", (locale) => {
    const unfinished = leaves(getSizesContent(locale)).filter(([, text]) => text.trim() === "" || /TODO/i.test(text));
    expect(unfinished).toEqual([]);
  });

  it.each(LOCALES)("devrait mettre en garde sur les seuls rayons débattus, ceux qui ont une fourchette publiée (%s)", (locale) => {
    const cautioned = Object.entries(getSizesContent(locale).stars).filter(([, text]) => text.caveat).map(([key]) => key);
    expect(cautioned.sort()).toEqual(COMPARED_STARS.filter((star) => star.radiusRange).map((star) => star.key).sort());
  });

  it.each(["en", "es"] as const)("devrait traduire chaque texte au lieu de recopier le français (%s)", (locale) => {
    const copied = leaves(getSizesContent(locale)).filter(([path, text]) => FRENCH.get(path) === text);
    expect(copied).toEqual([]);
  });

  it.each(LOCALES)("devrait proposer de commencer par la plus petite étoile, sous son nom officiel (%s)", (locale) => {
    expect(getSizesContent(locale).intro.start).toContain(SIZES_STRINGS[locale].names["proxima-centauri"]);
  });

  it.each([
    ["fr", "Lire la fiche"],
    ["en", "Read the fact sheet"],
    ["es", "Leer la ficha"],
  ] as const)("devrait nommer le bouton de la fiche selon le glossaire du site (%s : %s)", (locale, story) => {
    expect(getSizesContent(locale).plate.story).toBe(story);
  });
});

/*
 * Typographie : les nombres des textes reprennent la sortie d'Intl (formatNumber) de leur langue. Les années (2012,
 * 2025) restent sans séparateur, d'où l'absence de règle sur les nombres de quatre chiffres en français et en anglais.
 */
describe("nombres des textes de la page « Tailles »", () => {
  it.each([
    ["fr", "milliers séparés par une espace ordinaire ou insécable (Intl : espace fine U+202F)", /\d[ \u00a0]\d{3}(?!\d)/],
    ["fr", "point décimal (Intl : virgule)", /\d\.\d/],
    ["en", "milliers séparés par une espace (Intl : virgule)", /\d[ \u00a0\u202f]\d{3}(?!\d)/],
    ["en", "virgule décimale (Intl : point)", /\d,\d{1,2}(?!\d)/],
    ["es", "milliers séparés par une espace (Intl : point)", /\d[ \u00a0\u202f]\d{3}(?!\d)/],
    ["es", "point dans un nombre de quatre chiffres (Intl ne groupe qu'à partir de cinq)", /(?<![\d.])\d\.\d{3}(?![\d.])/],
    ["es", "point décimal (Intl : virgule)", /\d\.\d{1,2}(?!\d)/],
    ["fr", "nombre de cinq chiffres ou plus sans séparateur", /\d{5,}/],
    ["en", "nombre de cinq chiffres ou plus sans séparateur", /\d{5,}/],
    ["es", "nombre de cinq chiffres ou plus sans séparateur", /\d{5,}/],
  ] as const)("devrait écrire les nombres comme Intl, sans %s (%s)", (locale, _rule, pattern) => {
    expect(leaves(getSizesContent(locale)).filter(([, text]) => pattern.test(text))).toEqual([]);
  });
});
