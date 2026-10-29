import { describe, expect, it } from "vitest";
import { getAboutContent } from "@/content/about/content";
import { ABOUT_SECTION_IDS, ABOUT_URLS, ccByUrl, numberSample, type AboutSectionId } from "@/content/about/structure";
import type { AboutContent, AboutSection } from "@/content/about/types";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";

/** Langues traduites depuis le français. */
const TRANSLATED = ["en", "es"] as const satisfies readonly Locale[];

/** Section d'une langue, par son ancre (commune aux trois langues). */
function section(locale: Locale, id: AboutSectionId): AboutSection {
  const found = getAboutContent(locale).sections.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Section « ${id} » absente en ${locale}`);
  return found;
}

/** Tout le texte d'une section, d'un seul tenant (encart, paragraphes, définitions, liens). */
function sectionText(locale: Locale, id: AboutSectionId): string {
  const { note, paragraphs, entries = [], links = [] } = section(locale, id);
  return [
    note ?? "",
    ...paragraphs,
    ...entries.flatMap(({ term, text }) => [term, text]),
    ...links.flatMap(({ label, description }) => [label, description]),
  ].join(" ");
}

/**
 * Chaque texte d'un contenu avec son chemin (« sources.links.0.description »), pour les contrôles transversaux.
 * `translated` est faux pour les noms des liens : ce sont des noms propres (« NASA, Planetary Fact Sheet »).
 */
function leaves(content: AboutContent): { path: string; text: string; translated: boolean }[] {
  const all = [
    { path: "title", text: content.title, translated: true },
    { path: "intro", text: content.intro, translated: true },
    { path: "toc", text: content.toc, translated: true },
    { path: "external", text: content.external, translated: true },
  ];
  for (const { id, heading, note, paragraphs, entries = [], links = [] } of content.sections) {
    all.push({ path: `${id}.heading`, text: heading, translated: true });
    if (note !== undefined) all.push({ path: `${id}.note`, text: note, translated: true });
    paragraphs.forEach((text, i) => all.push({ path: `${id}.paragraphs.${i}`, text, translated: true }));
    entries.forEach(({ term, text }, i) => {
      all.push({ path: `${id}.entries.${i}.term`, text: term, translated: true });
      all.push({ path: `${id}.entries.${i}.text`, text, translated: true });
    });
    links.forEach(({ label, description }, i) => {
      all.push({ path: `${id}.links.${i}.label`, text: label, translated: false });
      all.push({ path: `${id}.links.${i}.description`, text: description, translated: true });
    });
  }
  return all;
}

/** Forme d'un contenu, sans ses textes : ancres, encart, nombres de paragraphes et de définitions, adresses. */
function shape(locale: Locale) {
  return getAboutContent(locale).sections.map(({ id, note, paragraphs, entries, links }) => ({
    id,
    note: note !== undefined,
    paragraphs: paragraphs.length,
    entries: entries?.length ?? 0,
    // Le résumé de la licence CC BY existe dans chaque langue : on le ramène à une même valeur pour comparer.
    links: links?.map(({ href }) => (href === ccByUrl(locale) ? "cc-by" : href)) ?? [],
  }));
}

describe("getAboutContent", () => {
  it.each(LOCALES)("devrait donner les neuf sections dans l'ordre de la page, aux ancres communes, en %s", (locale) => {
    expect(getAboutContent(locale).sections.map(({ id }) => id)).toEqual(ABOUT_SECTION_IDS);
  });

  it.each(LOCALES)("ne devrait laisser aucun texte vide en %s", (locale) => {
    for (const { path, text } of leaves(getAboutContent(locale))) {
      expect(text.trim(), path).not.toBe("");
    }
  });

  it.each(LOCALES)("devrait donner à chaque section un contenu sous son titre en %s", (locale) => {
    for (const { id, note, paragraphs, entries = [], links = [] } of getAboutContent(locale).sections) {
      expect(Number(note !== undefined) + paragraphs.length + entries.length + links.length, id).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("ne devrait répéter ni paragraphe, ni terme, ni nom de lien dans une section en %s", (locale) => {
    for (const { id, paragraphs, entries = [], links = [] } of getAboutContent(locale).sections) {
      expect(new Set(paragraphs).size, id).toBe(paragraphs.length);
      expect(new Set(entries.map(({ term }) => term)).size, id).toBe(entries.length);
      expect(new Set(links.map(({ label }) => label)).size, id).toBe(links.length);
    }
  });

  it.each(TRANSLATED)("devrait garder en %s la forme du français : encart, paragraphes, liens", (locale) => {
    expect(shape(locale)).toEqual(shape("fr"));
  });

  it.each(TRANSLATED)("devrait tout traduire en %s, sans recopier le français (noms propres à part)", (locale) => {
    const french = new Map(leaves(getAboutContent("fr")).map(({ path, text }) => [path, text]));
    for (const { path, text, translated } of leaves(getAboutContent(locale))) {
      if (translated) expect(text, path).not.toBe(french.get(path));
    }
  });
});

describe("liens de la page À propos", () => {
  it.each(LOCALES)("devrait n'employer que des adresses en https en %s", (locale) => {
    for (const { links = [] } of getAboutContent(locale).sections) {
      for (const { href } of links) expect(href).toMatch(/^https:\/\/\S+$/);
    }
  });

  it.each(LOCALES)("devrait citer les sources principales du site, dans l'ordre du voyage, en %s", (locale) => {
    expect(section(locale, "sources").links?.map(({ href }) => href)).toEqual([
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

  it.each(LOCALES)("devrait créditer cartes, polices et logiciels, la licence CC BY dans la langue (%s)", (locale) => {
    expect(section(locale, "credits").links?.map(({ href }) => href)).toEqual([
      ABOUT_URLS.solarSystemScope,
      ccByUrl(locale),
      ABOUT_URLS.bodoniModa,
      ABOUT_URLS.atkinsonHyperlegibleNext,
      ABOUT_URLS.threeJs,
      ABOUT_URLS.nextJs,
    ]);
  });

  it.each(LOCALES)("devrait écrire les licences en toutes lettres en %s : CC BY 4.0, OFL, MIT", (locale) => {
    const credits = sectionText(locale, "credits");
    for (const licence of ["CC BY 4.0", "SIL Open Font License", "OFL", "MIT"]) expect(credits).toContain(licence);
  });

  it.each(LOCALES)("devrait mener au code source et aux signalements sur GitHub en %s", (locale) => {
    expect(section(locale, "code-source").links?.map(({ href }) => href)).toEqual([
      ABOUT_URLS.repository,
      ABOUT_URLS.issues,
    ]);
    expect(section(locale, "accessibilite").links?.map(({ href }) => href)).toEqual([ABOUT_URLS.issues]);
  });
});

describe("textes de la page À propos", () => {
  it.each(LOCALES)("devrait décrire l'accessibilité en six points, du clavier aux limites connues, en %s", (locale) => {
    expect(section(locale, "accessibilite").entries).toHaveLength(6);
  });

  it.each(LOCALES)("devrait écrire le seuil de contraste comme Intl dans la langue en %s (4,5:1, 4.5:1)", (locale) => {
    expect(sectionText(locale, "accessibilite")).toContain(`${formatNumber(4.5, 1, locale)}:1`);
  });

  it.each(LOCALES)("devrait mettre la confidentialité en avant dans un encart, et nommer le cookie en %s", (locale) => {
    expect(section(locale, "confidentialite").note).toBeDefined();
    expect(sectionText(locale, "confidentialite")).toContain(LOCALE_COOKIE);
  });

  it.each(LOCALES)("devrait montrer le même nombre écrit à la manière de chaque langue en %s", (locale) => {
    const languages = sectionText(locale, "langues");
    for (const other of LOCALES) expect(languages).toContain(numberSample(other));
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

  it("devrait encadrer les guillemets français d'espaces insécables (U+00A0), et en poser une avant : ; ? !", () => {
    const french = allText("fr");
    expect(french).toContain("«");
    expect(french).not.toMatch(/«(?!\u00a0)|(?<!\u00a0)»/);
    expect(french).not.toMatch(/[ \u202f][:;?!]/);
    expect(french).not.toMatch(/[^\s\d][:;?!]/);
  });

  it("devrait employer les guillemets anglais “ ” en anglais, sans espace avant : ni ;", () => {
    const english = allText("en");
    expect(english).toContain("“");
    expect(english).not.toMatch(/[«»]/);
    expect(english).not.toMatch(/\s[:;]/);
  });

  it("devrait coller les guillemets espagnols « » au texte, sans espace avant : ni ;", () => {
    const spanish = allText("es");
    expect(spanish).toContain("«");
    expect(spanish).not.toMatch(/«\s|\s»/);
    expect(spanish).not.toMatch(/\s[:;]/);
  });
});
