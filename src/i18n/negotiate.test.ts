import { describe, expect, it } from "vitest";
import { negotiateLocale, parseAcceptLanguage, preferredLocale } from "@/i18n/negotiate";

describe("parseAcceptLanguage", () => {
  it("devrait réduire chaque étiquette à sa langue principale, en minuscules", () => {
    expect(parseAcceptLanguage("en-US, DE-de, Es-419")).toEqual(["en", "de", "es"]);
  });

  it("devrait trier par poids décroissant, dans l'ordre de l'en-tête à poids égal", () => {
    expect(parseAcceptLanguage("de;q=0.5, es;q=0.8, it;q=0.8, fr")).toEqual(["fr", "es", "it", "de"]);
  });

  it("devrait ignorer une langue refusée (q = 0) ou au poids illisible", () => {
    expect(parseAcceptLanguage("fr;q=0, en;q=abc, de;q=1.5, it;q=.5, pt;q=0.0001, es;q=0.001")).toEqual(["es"]);
  });

  it("devrait lire le poids malgré la casse de q et les espaces autour des séparateurs", () => {
    expect(parseAcceptLanguage("en ; Q=0.5 , es; q = 0.8")).toEqual(["es", "en"]);
  });

  it("devrait garder « * » tel quel", () => {
    expect(parseAcceptLanguage("fr-CH, *;q=0.5")).toEqual(["fr", "*"]);
  });

  it("devrait ignorer une étiquette illisible", () => {
    expect(parseAcceptLanguage("en_US, 12, ;q=0.9, es")).toEqual(["es"]);
  });

  it("devrait garder chaque langue une fois, à son meilleur poids", () => {
    expect(parseAcceptLanguage("fr-CA;q=0.3, en;q=0.5, fr;q=0.9")).toEqual(["fr", "en"]);
  });

  it.each([
    { label: "null", header: null },
    { label: "undefined", header: undefined },
    { label: "vide", header: "" },
    { label: "séparateurs seuls", header: " , ," },
  ])("devrait rendre une liste vide quand l'en-tête est absent ou vide ($label)", ({ header }) => {
    expect(parseAcceptLanguage(header)).toEqual([]);
  });
});

describe("negotiateLocale", () => {
  it.each([
    { why: "la première langue du site", header: "en-US,en;q=0.9,fr;q=0.8", expected: "en" },
    { why: "aucune langue du site", header: "de-DE,de;q=0.9", expected: null },
    { why: "une langue absente sautée", header: "de;q=1, es;q=0.5", expected: "es" },
    { why: "une langue refusée (q = 0)", header: "fr;q=0, en", expected: "en" },
    { why: "« * » ne choisit rien", header: "*", expected: null },
    { why: "en-tête vide", header: "", expected: null },
    { why: "en-tête absent", header: null, expected: null },
    { why: "majuscules", header: "ES", expected: "es" },
    { why: "région numérique", header: "es-419", expected: "es" },
    { why: "ordre de l'en-tête à poids égal", header: "en;q=0.5, fr;q=0.5", expected: "en" },
    { why: "poids illisible", header: "en;q=abc, es", expected: "es" },
  ])("devrait choisir $expected pour « $header » ($why)", ({ header, expected }) => {
    expect(negotiateLocale(header)).toBe(expected);
  });
});

describe("preferredLocale", () => {
  it("devrait préférer le cookie à l'en-tête", () => {
    expect(preferredLocale({ cookie: "es", acceptLanguage: "en" })).toBe("es");
  });

  it("devrait ignorer un cookie qui n'est pas une langue du site", () => {
    expect(preferredLocale({ cookie: "de", acceptLanguage: "en" })).toBe("en");
  });

  it("devrait parler français quand ni cookie ni en-tête ne choisissent", () => {
    expect(preferredLocale({})).toBe("fr");
  });

  it("devrait parler français quand l'en-tête ne propose aucune langue du site", () => {
    expect(preferredLocale({ cookie: null, acceptLanguage: "de-DE,de;q=0.9" })).toBe("fr");
  });
});
