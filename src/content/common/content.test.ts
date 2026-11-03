import { describe, expect, it } from "vitest";
import { getCommonContent } from "@/content/common/content";
import type { CommonContent } from "@/content/common/types";
import { LOCALES } from "@/i18n/locales";
import { PAGES } from "@/i18n/routes";

/** Chaque texte du contenu commun, avec son chemin (« pages.voyage.title »). */
function texts(content: CommonContent): (readonly [path: string, text: string])[] {
  return [
    ["description", content.description],
    ...PAGES.flatMap((page) => [
      [`pages.${page}.title`, content.pages[page].title] as const,
      [`pages.${page}.description`, content.pages[page].description] as const,
    ]),
    ["notFound.title", content.notFound.title],
    ["notFound.text", content.notFound.text],
    ["notFound.back", content.notFound.back],
  ];
}

const CASES = LOCALES.flatMap((locale) => texts(getCommonContent(locale)).map(([path, text]) => ({ locale, path, text })));
const FRENCH = new Map(texts(getCommonContent("fr")));
const TRANSLATED = CASES.filter(({ locale }) => locale !== "fr");
const DESCRIPTIONS = CASES.filter(({ path }) => path.endsWith("description"));
const HOME_TITLES = LOCALES.map((locale) => ({ locale, title: getCommonContent(locale).pages.home.title }));
const PAGE_TITLES = LOCALES.flatMap((locale) =>
  PAGES.filter((page) => page !== "home").map((page) => ({ locale, page, title: getCommonContent(locale).pages[page].title })),
);

describe("getCommonContent", () => {
  it("devrait couvrir les quatre pages dans chaque langue", () => {
    expect(LOCALES.map((locale) => Object.keys(getCommonContent(locale).pages).sort())).toEqual(
      LOCALES.map(() => [...PAGES].sort()),
    );
  });

  it.each(CASES)("devrait remplir $path en $locale, sans espace en trop", ({ text }) => {
    expect(text).not.toBe("");
    expect(text).toBe(text.trim());
  });

  it.each(TRANSLATED)("ne devrait pas recopier le texte français dans $path en $locale", ({ path, text }) => {
    expect(text).not.toBe(FRENCH.get(path));
  });

  it.each(DESCRIPTIONS)(
    "devrait tenir $path en $locale entre 50 et 160 caractères, au-delà desquels les moteurs de recherche le coupent",
    ({ text }) => {
      expect(text.length).toBeGreaterThanOrEqual(50);
      expect(text.length).toBeLessThanOrEqual(160);
    },
  );

  it.each(HOME_TITLES)(
    "devrait nommer le site dans le titre de l'accueil en $locale, que le gabarit ne complète pas, en 60 caractères au plus",
    ({ title }) => {
      expect(title).toContain("Astronomie");
      expect(title.length).toBeLessThanOrEqual(60);
    },
  );

  it.each(PAGE_TITLES)(
    "devrait tenir le titre de la page $page en $locale en 60 caractères au plus, nom du site compris",
    ({ title }) => {
      expect(`${title} · Astronomie`.length).toBeLessThanOrEqual(60);
    },
  );
});
