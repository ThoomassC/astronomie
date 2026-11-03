import { describe, expect, it } from "vitest";
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

  // « TODO » en capitales seulement : l'espagnol dit « sobre todo ».
  it.each(LOCALES)("ne devrait laisser aucun texte vide ni à faire (%s)", (locale) => {
    const unfinished = leaves(getSizesContent(locale)).filter(([, text]) => text.trim() === "" || /\bTODO\b/.test(text));
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

  it.each([
    ["fr", "Commencer par la plus petite"],
    ["en", "Start with the smallest"],
    ["es", "Empezar por la más pequeña"],
  ] as const)("devrait proposer de commencer par la plus petite étoile (%s : %s)", (locale, start) => {
    expect(getSizesContent(locale).intro.start).toBe(start);
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
 * Rigel : à diamètre angulaire fixe (θ_LD = 2,606 mas, Baines et al. 2018), le rayon est proportionnel à la distance.
 * Si elle était à 1 170 al et non à 860, ses 74 R☉ deviendraient 74 × 1 170 / 860 ≈ 100,7 R☉.
 */
describe("mise en garde sur la distance de Rigel", () => {
  const rigel = COMPARED_STARS.find((star) => star.key === "rigel");
  const ALTERNATIVE_DISTANCE_LY = 1170;

  it("devrait tirer le rayon à 1 170 al du rayon et de la distance retenus : environ 101 R☉", () => {
    if (!rigel) throw new Error("Rigel absente du comparateur");
    expect(Math.round((rigel.radiusSolar * ALTERNATIVE_DISTANCE_LY) / rigel.distanceLy)).toBe(101);
  });

  it.each([
    ["fr", "environ 101 R☉"],
    ["en", "about 101 R☉"],
    ["es", "unos 101 R☉"],
  ] as const)("devrait l'écrire dans la mise en garde de la plaque (%s : « %s »)", (locale, radius) => {
    const caveat = getSizesContent(locale).stars.rigel.caveat ?? "";
    expect(caveat).toContain(radius);
    expect(caveat).not.toContain("106");
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
