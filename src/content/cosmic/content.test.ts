import { describe, expect, it } from "vitest";
import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { COSMIC_CONTENT_KEYS, getCosmicContent } from "@/content/cosmic/content";
import { LOCALES, type Locale } from "@/i18n/locales";
import { LOCAL_GROUP } from "@/lib/astro/localGroup";
import { LOCAL_GROUP_MAGNIFICATION } from "@/lib/astro/scale";
import { spectralClass } from "@/lib/astro/starMap";
import { NEARBY_STARS } from "@/lib/astro/stars";

/*
 * Textes serveur des cinq escales lointaines (étoiles voisines, Voie lactée, Groupe local, Univers observable,
 * multivers) : complets dans les trois langues, traduits (pas recopiés du français), nombres écrits comme Intl.
 */

/** Chaînes d'un contenu avec leur chemin (« stops.universe.facts.2.value ») : les échecs disent où regarder. */
function leaves(value: unknown, path = ""): (readonly [string, string])[] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
}

const FRENCH = new Map(leaves(getCosmicContent("fr")));

/** Textes identiques d'une langue à l'autre, permis : noms propres, mots communs aux langues, nombres et leur unité. */
const SAME_IN_EVERY_LANGUAGE = new Set(["Sirius", "Sagittarius A*", "Distance", "Type"]);
const isNumberOnly = (text: string) => /^(≈ )?[\d\u00a0\u202f.,−]+( ?(%|al|ly|K|km\/s))?$/.test(text);

/** Naines rouges (classe M) parmi les étoiles de la carte. */
const RED_DWARFS = NEARBY_STARS.filter((star) => spectralClass(star.spectralType) === "M").length;

describe("getCosmicContent", () => {
  it("devrait décrire les cinq escales lointaines, dans l'ordre du voyage", () => {
    expect(COSMIC_CONTENT_KEYS).toEqual(["stars", "galaxy", "localGroup", "universe", "multiverse"]);
  });

  it.each(LOCALES)("devrait donner un texte à chacune des cinq escales (%s)", (locale) => {
    expect(Object.keys(getCosmicContent(locale).stops)).toEqual([...COSMIC_CONTENT_KEYS]);
  });

  // Marqueur en capitales seulement : l'espagnol écrit « sobre todo » (surtout).
  it.each(LOCALES)("ne devrait laisser aucun texte vide ni à faire (%s)", (locale) => {
    const unfinished = leaves(getCosmicContent(locale)).filter(([, text]) => text.trim() === "" || /\bTODO\b/.test(text));
    expect(unfinished).toEqual([]);
  });

  it.each(["en", "es"] as const)("devrait garder la même fiche qu'en français, ligne pour ligne (%s)", (locale) => {
    for (const key of COSMIC_CONTENT_KEYS) {
      const facts = getCosmicContent(locale).stops[key].facts;
      const french = getCosmicContent("fr").stops[key].facts;
      expect(facts.map((fact) => fact.note !== undefined)).toEqual(french.map((fact) => fact.note !== undefined));
    }
  });

  it.each(["en", "es"] as const)("devrait traduire chaque texte au lieu de recopier le français (%s)", (locale) => {
    const copied = leaves(getCosmicContent(locale)).filter(
      ([path, text]) => FRENCH.get(path) === text && !SAME_IN_EVERY_LANGUAGE.has(text) && !isNumberOnly(text),
    );
    expect(copied).toEqual([]);
  });

  it.each([
    ["fr", "Lire la fiche", "Revenir au Soleil"],
    ["en", "Read the fact sheet", "Back to the Sun"],
    ["es", "Leer la ficha", "Volver al Sol"],
  ] as const)("devrait nommer les boutons de la plaque selon le glossaire du site (%s)", (locale, story, back) => {
    const { plate } = getCosmicContent(locale);
    expect(plate.story).toBe(story);
    expect(plate.back).toBe(back);
  });
});

describe("l'escale du multivers", () => {
  it.each(LOCALES)("devrait annoncer en tête que le multivers est une hypothèse, jamais observée (%s)", (locale) => {
    const { hypothesis } = getCosmicContent(locale).stops.multiverse;
    expect(hypothesis?.trim()).toBeTruthy();
  });

  it.each([
    ["fr", "Hypothèse"],
    ["en", "Hypothesis"],
    ["es", "Hipótesis"],
  ] as const)("devrait ouvrir l'avertissement sur le mot hypothèse (%s)", (locale, word) => {
    expect(getCosmicContent(locale).stops.multiverse.hypothesis?.startsWith(word)).toBe(true);
  });

  it.each(LOCALES)("ne devrait mettre d'avertissement d'hypothèse qu'au multivers (%s)", (locale) => {
    const { stops } = getCosmicContent(locale);
    const warned = COSMIC_CONTENT_KEYS.filter((key) => stops[key].hypothesis !== undefined);
    expect(warned).toEqual(["multiverse"]);
  });
});

describe("les fiches", () => {
  it("devrait reprendre telles quelles les fiches arrêtées des étoiles voisines et de la Voie lactée", () => {
    const { stops } = getCosmicContent("fr");
    expect(stops.stars.name).toBe("Les étoiles voisines");
    expect(stops.galaxy.name).toBe("La Voie lactée");
    expect(stops.stars.facts.map((fact) => fact.label)).toEqual([
      "Étoile la plus proche",
      "Sa lumière met",
      "En sonde Voyager 1",
      "La plus brillante du ciel",
      "Systèmes à moins de 10 al",
      "Naines rouges de la carte",
    ]);
    expect(stops.galaxy.facts.map((fact) => fact.label)).toEqual([
      "Diamètre du disque",
      "Épaisseur du disque",
      "Le Soleil est à",
      "Un tour du centre",
      "Étoiles",
      "Au centre",
      "Plus vieilles étoiles",
    ]);
  });

  it.each([
    ["fr", `${RED_DWARFS} sur ${NEARBY_STARS.length}`],
    ["en", `${RED_DWARFS} of ${NEARBY_STARS.length}`],
    ["es", `${RED_DWARFS} de ${NEARBY_STARS.length}`],
  ] as const)("devrait compter les naines rouges de la carte d'après les données (%s : %s)", (locale, expected) => {
    expect(getCosmicContent(locale).stops.stars.facts[5].value).toBe(expected);
  });

  it.each(LOCALES)("devrait nommer les étoiles et les galaxies des fiches comme les étiquettes de la scène (%s)", (locale) => {
    const { stops } = getCosmicContent(locale);
    const { starNames, galaxyNames } = DEEP_SKY_STRINGS[locale];
    expect(stops.stars.facts[0].value).toBe(starNames["proxima-centauri"]);
    expect(stops.stars.facts[3].value).toBe(starNames.sirius);
    expect(stops.localGroup.facts.map((fact) => fact.label)).toEqual(expect.arrayContaining([galaxyNames.andromeda, galaxyNames.triangulum]));
  });

  it.each([
    ["fr", "2,5 millions d'al"],
    ["en", "2.5 million ly"],
    ["es", "2,5 millones de al"],
  ] as const)("devrait placer Andromède à 2,5 millions d'années-lumière (%s)", (locale, distance) => {
    expect(leaves(getCosmicContent(locale).stops.localGroup.facts).some(([, text]) => text.includes(distance))).toBe(true);
  });

  it.each([
    ["fr", ["46", "93", "13,8", "2,725"]],
    ["en", ["46", "93", "13.8", "2.725"]],
    ["es", ["46", "93", "13.800", "2,725"]],
  ] as const)("devrait donner le rayon, le diamètre, l'âge et la température du fond diffus retenus (%s)", (locale, numbers) => {
    const text = leaves(getCosmicContent(locale).stops.universe).map(([, value]) => value).join(" ");
    for (const number of numbers) expect(text).toContain(number);
  });

  it.each(LOCALES)("devrait dire combien de galaxies la carte du Groupe local en montre (%s)", (locale) => {
    expect(getCosmicContent(locale).stops.localGroup.caveat).toContain(String(LOCAL_GROUP.length));
  });

  it.each([
    ["fr", /^Les distances sont à l'échelle, pas les galaxies\u00a0: elles sont grossies (\d+) fois/],
    ["en", /^Distances are to scale, galaxies are not: they are enlarged (\d+) times/],
    ["es", /^Las distancias están a escala, las galaxias no: están agrandadas (\d+) veces/],
  ] as const)("devrait dire que les galaxies du Groupe local sont grossies, et de combien (%s)", (locale, pattern) => {
    const match = pattern.exec(getCosmicContent(locale).stops.localGroup.caveat);
    expect(Number(match?.[1])).toBe(LOCAL_GROUP_MAGNIFICATION);
  });
});

describe("les tableaux", () => {
  it.each(LOCALES)("devrait décrire chaque type d'étoile, de O à M (%s)", (locale) => {
    expect(Object.keys(getCosmicContent(locale).starTable.types).sort()).toEqual(["A", "B", "F", "G", "K", "M", "O"]);
  });

  it.each(LOCALES)("devrait préciser les mêmes étoiles qu'en français, toutes sur la carte (%s)", (locale) => {
    const noted = (language: Locale) => Object.keys(getCosmicContent(language).starTable.notes).sort();
    expect(noted(locale)).toEqual(noted("fr"));
    expect(noted(locale).length).toBeGreaterThan(0);
    expect(noted(locale).filter((key) => !NEARBY_STARS.some((star) => star.key === key))).toEqual([]);
  });

  it.each(LOCALES)("devrait donner trois colonnes au tableau des galaxies : galaxie, distance, taille (%s)", (locale) => {
    expect(getCosmicContent(locale).galaxyTable.columns).toHaveLength(3);
  });
});

/*
 * Typographie : les nombres des textes reprennent la sortie d'Intl (formatNumber) de leur langue. Les années (2019,
 * 2025) restent sans séparateur, d'où l'absence de règle sur les nombres de quatre chiffres en français et en anglais.
 */
describe("nombres des textes des escales lointaines", () => {
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
    ["fr", "trait d'union au lieu du signe moins devant un nombre", /(?<![\w-])-\d/],
    ["en", "trait d'union au lieu du signe moins devant un nombre", /(?<![\w-])-\d/],
    ["es", "trait d'union au lieu du signe moins devant un nombre", /(?<![\w-])-\d/],
    ["en", "espace avant %", /\d %/],
  ] as const)("devrait écrire les nombres comme Intl, sans %s (%s)", (locale, _rule, pattern) => {
    expect(leaves(getCosmicContent(locale)).filter(([, text]) => pattern.test(text))).toEqual([]);
  });
});
