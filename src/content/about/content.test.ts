import { describe, expect, it } from "vitest";
import { getAboutContent } from "@/content/about/content";
import { ABOUT_URLS, type AboutSectionId } from "@/content/about/structure";
import type { AboutContent, AboutSection } from "@/content/about/types";
import { LOCALES, type Locale } from "@/i18n/locales";

/** Langues traduites depuis le français. */
const TRANSLATED = ["en", "es"] as const satisfies readonly Locale[];

/** Section d'une langue, par son ancre (commune aux trois langues). */
function section(locale: Locale, id: AboutSectionId): AboutSection {
  const found = getAboutContent(locale).sections.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Section « ${id} » absente en ${locale}`);
  return found;
}

/**
 * Chaque texte d'un contenu avec son chemin (« sources.links.0.description »), pour les contrôles transversaux.
 * `translated` est faux pour les noms des liens : ce sont des noms propres (« NASA, Planetary Fact Sheet »).
 */
function leaves(content: AboutContent): { path: string; text: string; translated: boolean }[] {
  const all = [
    { path: "title", text: content.title, translated: true },
    { path: "intro", text: content.intro, translated: true },
    { path: "external", text: content.external, translated: true },
  ];
  for (const { id, heading, paragraphs, links = [] } of content.sections) {
    all.push({ path: `${id}.heading`, text: heading, translated: true });
    paragraphs.forEach((text, i) => all.push({ path: `${id}.paragraphs.${i}`, text, translated: true }));
    links.forEach(({ label, description }, i) => {
      all.push({ path: `${id}.links.${i}.label`, text: label, translated: false });
      all.push({ path: `${id}.links.${i}.description`, text: description, translated: true });
    });
  }
  return all;
}

/** Forme d'un contenu, sans ses textes : ancres, nombre de paragraphes, adresses des liens. */
function shape(locale: Locale) {
  return getAboutContent(locale).sections.map(({ id, paragraphs, links }) => ({
    id,
    paragraphs: paragraphs.length,
    links: links?.map(({ href }) => href) ?? [],
  }));
}

/** Les sources du site, dans l'ordre du voyage : du Soleil à l'Univers observable. */
const SOURCES = [
  ABOUT_URLS.nasaSunFactSheet,
  ABOUT_URLS.nasaFactSheet,
  ABOUT_URLS.iauResolutions,
  ABOUT_URLS.jplApproximatePositions,
  ABOUT_URLS.gaiaDr3,
  ABOUT_URLS.simbad,
  ABOUT_URLS.wittkowski2012,
  ABOUT_URLS.gravity2022,
  ABOUT_URLS.reid2019,
  ABOUT_URLS.mcConnachie2012,
  ABOUT_URLS.planck2018,
];

describe("getAboutContent", () => {
  it.each(LOCALES)("devrait donner deux sections seulement, pourquoi ce site puis les sources, en %s", (locale) => {
    expect(getAboutContent(locale).sections.map(({ id }) => id)).toEqual(["pourquoi", "sources"]);
  });

  it.each(LOCALES)("ne devrait laisser aucun texte vide en %s", (locale) => {
    for (const { path, text } of leaves(getAboutContent(locale))) {
      expect(text.trim(), path).not.toBe("");
    }
  });

  it.each(LOCALES)("devrait donner à chaque section au moins un paragraphe sous son titre en %s", (locale) => {
    for (const { id, paragraphs } of getAboutContent(locale).sections) {
      expect(paragraphs.length, id).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("ne devrait répéter ni paragraphe ni nom de lien dans une section en %s", (locale) => {
    for (const { id, paragraphs, links = [] } of getAboutContent(locale).sections) {
      expect(new Set(paragraphs).size, id).toBe(paragraphs.length);
      expect(new Set(links.map(({ label }) => label)).size, id).toBe(links.length);
    }
  });

  it.each(TRANSLATED)("devrait garder en %s la forme du français : paragraphes, liens", (locale) => {
    expect(shape(locale)).toEqual(shape("fr"));
  });

  it.each(TRANSLATED)("devrait tout traduire en %s, sans recopier le français (noms propres à part)", (locale) => {
    const french = new Map(leaves(getAboutContent("fr")).map(({ path, text }) => [path, text]));
    for (const { path, text, translated } of leaves(getAboutContent(locale))) {
      if (translated) expect(text, path).not.toBe(french.get(path));
    }
  });
});

describe("sources de la page À propos", () => {
  it.each(LOCALES)("devrait n'employer que des adresses en https en %s", (locale) => {
    for (const { links = [] } of getAboutContent(locale).sections) {
      for (const { href } of links) expect(href).toMatch(/^https:\/\/\S+$/);
    }
  });

  it.each(LOCALES)("devrait citer toutes les sources du site, dans l'ordre du voyage, en %s", (locale) => {
    expect(section(locale, "sources").links?.map(({ href }) => href)).toEqual(SOURCES);
  });

  it.each(LOCALES)("ne devrait poser aucun lien dans « Pourquoi ce site » en %s", (locale) => {
    expect(section(locale, "pourquoi").links).toBeUndefined();
  });

  /*
   * Titre laissé dans sa langue (« Sun Fact Sheet ») : la page le marque pour la synthèse vocale (critère 3.1.2). C'est
   * une propriété de la source, pas de la traduction : la même dans les trois langues, au même titre recopié.
   */
  it.each(TRANSLATED)("devrait dire en %s, comme en français, quels titres de sources sont anglais", (locale) => {
    const titles = (from: Locale) =>
      (section(from, "sources").links ?? []).map(({ label, lang }) => ({ label: lang ? label : null, lang }));
    expect(titles(locale)).toEqual(titles("fr"));
  });

  it("devrait marquer en anglais les titres anglais des sources", () => {
    const english = (section("fr", "sources").links ?? []).filter(({ lang }) => lang === "en").map(({ label }) => label);
    expect(english).toEqual([
      "NASA, Sun Fact Sheet",
      "NASA, Planetary Fact Sheet",
      "JPL, Approximate Positions of the Planets",
    ]);
  });

  /*
   * Les chiffres clés de l'accueil renvoient ici pour leurs sources : chacun figure dans la description de la sienne,
   * écrit comme l'accueil l'écrit (formateurs du site : l'espagnol ne groupe pas quatre chiffres).
   */
  it.each([
    ["fr", "4,2 al", "1\u202f420 R☉"],
    ["en", "4.2 ly", "1,420 R☉"],
    ["es", "4,2 al", "1420 R☉"],
  ] as const)("devrait sourcer les quatre chiffres clés de l'accueil en %s", (locale, proxima, vyCanisMajoris) => {
    const source = (href: string) => {
      const found = section(locale, "sources").links?.find((link) => link.href === href);
      if (!found) throw new Error(`Source ${href} absente en ${locale}`);
      return found;
    };
    // 109 Terres dans la largeur du Soleil : NASA, diamètres du Soleil et de la Terre.
    expect(source(ABOUT_URLS.nasaSunFactSheet).label).toContain("NASA");
    expect(source(ABOUT_URLS.nasaSunFactSheet).description).toContain("109");
    expect(source(ABOUT_URLS.nasaFactSheet).label).toContain("NASA");
    // 8 min 19 s de trajet pour la lumière du Soleil : l'unité astronomique de l'UAI (2012).
    expect(source(ABOUT_URLS.iauResolutions).label).toMatch(/\b(UAI|IAU)\b.*\b2012\b/);
    expect(source(ABOUT_URLS.iauResolutions).description).toContain("8 min 19 s");
    // Proxima du Centaure à 4,2 al : ESA, Gaia DR3.
    expect(source(ABOUT_URLS.gaiaDr3).label).toContain("Gaia DR3");
    expect(source(ABOUT_URLS.gaiaDr3).description).toContain(proxima);
    // VY Canis Majoris, 1 420 R☉ : Wittkowski et al. (2012).
    expect(source(ABOUT_URLS.wittkowski2012).label).toMatch(/^Wittkowski et al\., 2012$/);
    expect(source(ABOUT_URLS.wittkowski2012).description).toContain(vyCanisMajoris);
  });
});

describe("typographie de la page À propos", () => {
  /** Tout le texte d'une langue, d'un seul tenant. */
  const allText = (locale: Locale) =>
    leaves(getAboutContent(locale))
      .map(({ text }) => text)
      .join("\n");

  it.each(LOCALES)("ne devrait employer ni guillemet droit ni points de suspension en trois points en %s", (locale) => {
    expect(allText(locale)).not.toMatch(/"|\.\.\./);
  });

  it("devrait poser en français une espace insécable (U+00A0) avant : et dans « », une espace fine (U+202F) avant ; ? !", () => {
    const french = allText("fr");
    expect(french).toMatch(/\u00a0:/);
    expect(french).toMatch(/\u202f;/);
    expect(french).not.toMatch(/[ \u202f]:|[ \u00a0][;?!]/);
    expect(french).not.toMatch(/[^\s\d][:;?!]/);
    expect(french).not.toMatch(/«(?!\u00a0)|(?<!\u00a0)»/);
  });

  it("ne devrait employer en anglais ni guillemets « », ni espace avant : ou ;", () => {
    const english = allText("en");
    expect(english).toMatch(/\S:/);
    expect(english).not.toMatch(/[«»]/);
    expect(english).not.toMatch(/\s[:;]/);
  });

  it("devrait coller au texte les : et ; espagnols, comme les guillemets « »", () => {
    const spanish = allText("es");
    expect(spanish).toMatch(/\S:/);
    expect(spanish).not.toMatch(/«\s|\s»/);
    expect(spanish).not.toMatch(/\s[:;]/);
  });
});
