import { describe, expect, it } from "vitest";
import {
  ABOUT_SECTION_IDS,
  ABOUT_URLS,
  ccByUrl,
  LANGUAGES_SECTION_ID,
  numberSample,
  sourcedFigures,
} from "@/content/about/structure";
import { LOCALES } from "@/i18n/locales";

describe("ABOUT_SECTION_IDS", () => {
  it("devrait poser les neuf sections dans l'ordre de la page", () => {
    expect(ABOUT_SECTION_IDS).toEqual([
      "pourquoi",
      "pour-qui",
      "demarche",
      "sources",
      "credits",
      "accessibilite",
      "confidentialite",
      "langues",
      "code-source",
    ]);
  });

  it("devrait donner des ancres uniques, en minuscules, sans accent ni espace", () => {
    expect(new Set(ABOUT_SECTION_IDS).size).toBe(ABOUT_SECTION_IDS.length);
    for (const id of ABOUT_SECTION_IDS) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("devrait compter la section des langues parmi elles", () => {
    expect(ABOUT_SECTION_IDS).toContain(LANGUAGES_SECTION_ID);
  });
});

describe("ABOUT_URLS", () => {
  it("devrait n'employer que des adresses en https, sans espace", () => {
    for (const url of Object.values(ABOUT_URLS)) expect(url).toMatch(/^https:\/\/\S+$/);
  });

  it("devrait donner une adresse différente à chaque lien", () => {
    const urls = Object.values(ABOUT_URLS);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("ccByUrl", () => {
  it.each(LOCALES)("devrait renvoyer le résumé de la licence CC BY 4.0 en %s", (locale) => {
    expect(ccByUrl(locale)).toBe(`https://creativecommons.org/licenses/by/4.0/deed.${locale}`);
  });
});

describe("numberSample", () => {
  // Milliers : espace fine insécable (U+202F) en français, virgule en anglais, point en espagnol ; puis une espace
  // ordinaire avant l'unité, dans les trois langues (ADR 0003).
  it.each([
    ["fr", "1\u202f392\u202f700 km"],
    ["en", "1,392,700 km"],
    ["es", "1.392.700 km"],
  ] as const)("devrait écrire le diamètre du Soleil comme le reste du site en %s : %s", (locale, expected) => {
    expect(numberSample(locale)).toBe(expected);
  });
});

describe("sourcedFigures", () => {
  // Les chiffres clés de l'accueil, tels qu'il les écrit : 109 Terres, 8 min 19 s, Proxima, VY Canis Majoris.
  it.each([
    ["fr", { sunInEarths: "109", sunlight: "8 min 19 s", nearestStar: "4,2 al", vyCanisMajoris: "1\u202f420 R☉" }],
    ["en", { sunInEarths: "109", sunlight: "8 min 19 s", nearestStar: "4.2 ly", vyCanisMajoris: "1,420 R☉" }],
    ["es", { sunInEarths: "109", sunlight: "8 min 19 s", nearestStar: "4,2 al", vyCanisMajoris: "1420 R☉" }],
  ] as const)("devrait écrire les chiffres clés de l'accueil en %s", (locale, expected) => {
    expect(sourcedFigures(locale)).toEqual(expected);
  });
});
