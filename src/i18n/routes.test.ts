import { describe, expect, it } from "vitest";
import { LOCALES, isLocale } from "@/i18n/locales";
import { PAGE_SEGMENTS, PAGES, negotiatedPathFor, parsePath, pathFor, switchLocale } from "@/i18n/routes";

describe("PAGE_SEGMENTS", () => {
  it("devrait donner à chacune des 4 pages un segment distinct", () => {
    expect(PAGES).toHaveLength(4);
    expect(new Set(Object.values(PAGE_SEGMENTS)).size).toBe(PAGES.length);
  });

  it("devrait laisser l'accueil à la racine de la langue", () => {
    expect(PAGE_SEGMENTS.home).toBe("");
  });

  it.each(Object.values(PAGE_SEGMENTS))(
    "ne devrait jamais prendre un code de langue pour segment (« %s ») : le proxy lit la langue au premier segment",
    (segment) => {
      expect(isLocale(segment)).toBe(false);
    },
  );
});

describe("pathFor", () => {
  it.each([
    ["home", "fr", "/fr"],
    ["voyage", "en", "/en/voyage"],
    ["sizes", "es", "/es/tailles"],
    ["about", "fr", "/fr/a-propos"],
  ] as const)("devrait placer la page %s en %s à « %s »", (page, locale, expected) => {
    expect(pathFor(page, locale)).toBe(expected);
  });
});

describe("negotiatedPathFor", () => {
  it.each([
    ["home", "/"],
    ["voyage", "/voyage"],
    ["sizes", "/tailles"],
    ["about", "/a-propos"],
  ] as const)("devrait donner à la page %s un chemin sans langue, que le proxy négocie (« %s »)", (page, expected) => {
    expect(negotiatedPathFor(page)).toBe(expected);
  });
});

describe("parsePath", () => {
  it.each([
    { pathname: "/en/tailles", expected: { locale: "en", page: "sizes" } },
    { pathname: "/fr", expected: { locale: "fr", page: "home" } },
    { pathname: "/fr/", expected: { locale: "fr", page: "home" } },
    { pathname: "/es/voyage/", expected: { locale: "es", page: "voyage" } },
    { pathname: "/en/a-propos", expected: { locale: "en", page: "about" } },
  ])("devrait lire la langue et la page de « $pathname »", ({ pathname, expected }) => {
    expect(parsePath(pathname)).toEqual(expected);
  });

  it.each([
    { why: "langue inconnue", pathname: "/de/voyage" },
    { why: "page inconnue", pathname: "/fr/inconnu" },
    { why: "langue en majuscules", pathname: "/FR/voyage" },
    { why: "sans langue", pathname: "/voyage" },
    { why: "racine", pathname: "/" },
    { why: "vide", pathname: "" },
    { why: "sous-chemin d'une page", pathname: "/fr/voyage/saturne" },
    { why: "sans barre initiale", pathname: "fr/voyage" },
  ])("devrait rendre null quand le chemin n'est pas une page du site ($why : « $pathname »)", ({ pathname }) => {
    expect(parsePath(pathname)).toBeNull();
  });

  it.each(LOCALES.flatMap((locale) => PAGES.map((page) => ({ locale, page }))))(
    "devrait relire le chemin de pathFor (page $page en $locale)",
    ({ locale, page }) => {
      expect(parsePath(pathFor(page, locale))).toEqual({ locale, page });
    },
  );
});

describe("switchLocale", () => {
  it.each([
    ["/fr/voyage", "en", "/en/voyage"],
    ["/fr", "es", "/es"],
    ["/en/a-propos", "fr", "/fr/a-propos"],
    ["/es/tailles/", "en", "/en/tailles/"],
  ] as const)("devrait passer « %s » en %s (« %s ») en gardant le reste du chemin", (pathname, locale, expected) => {
    expect(switchLocale(pathname, locale)).toBe(expected);
  });
});
