import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getReleasesContent } from "@/content/releases/content";
import { formatReleaseDate, RELEASES, releaseAnchor, releaseDate } from "@/content/releases/structure";
import type { ReleasesContent } from "@/content/releases/types";
import { LOCALES, type Locale } from "@/i18n/locales";

/** Langues traduites depuis le français. */
const TRANSLATED = ["en", "es"] as const satisfies readonly Locale[];

/** Version déclarée par `package.json`, lu depuis la racine du dépôt, d'où Vitest se lance. */
function packageVersion(): string {
  const { version } = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string };
  return version;
}

/** Chaque texte d'un contenu, avec son chemin (« releases.0.sections.1.items.2 »). */
function texts(content: ReleasesContent): { path: string; text: string }[] {
  return [
    { path: "title", text: content.title },
    { path: "intro", text: content.intro },
    { path: "toc", text: content.toc },
    { path: "version", text: content.version },
    { path: "latest", text: content.latest },
    ...content.releases.flatMap(({ summary, sections }, r) => [
      { path: `releases.${r}.summary`, text: summary },
      ...sections.flatMap(({ heading, items }, s) => [
        { path: `releases.${r}.sections.${s}.heading`, text: heading },
        ...items.map((text, i) => ({ path: `releases.${r}.sections.${s}.items.${i}`, text })),
      ]),
    ]),
  ];
}

/** Forme d'un contenu, sans ses textes : versions, puis nombre de points de chaque rubrique. */
function shape(locale: Locale) {
  return getReleasesContent(locale).releases.map(({ version, sections }) => ({
    version,
    sections: sections.map(({ items }) => items.length),
  }));
}

/** Toute une version d'une langue, en un seul texte. */
function releaseText(locale: Locale, version: string): string {
  const release = getReleasesContent(locale).releases.find((candidate) => candidate.version === version);
  if (!release) throw new Error(`Version ${version} absente en ${locale}`);
  return [release.summary, ...release.sections.flatMap(({ heading, items }) => [heading, ...items])].join("\n");
}

describe("RELEASES", () => {
  it("devrait ranger les versions de la plus récente à la plus ancienne : 1.1.0, puis 1.0.0", () => {
    expect(RELEASES.map(({ version }) => version)).toEqual(["1.1.0", "1.0.0"]);
  });

  it("devrait dater chaque version d'un jour ISO valide, du plus récent au plus ancien", () => {
    const times = RELEASES.map(({ date }) => {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const time = Date.parse(`${date}T00:00:00Z`);
      expect(Number.isNaN(time), date).toBe(false);
      return time;
    });
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it("devrait dater la 1.1.0 du 6 novembre 2026 et la 1.0.0 du 3 novembre 2026", () => {
    expect(releaseDate("1.1.0")).toBe("2026-11-06");
    expect(releaseDate("1.0.0")).toBe("2026-11-03");
  });

  it("devrait donner à la version la plus récente le numéro de package.json", () => {
    expect(RELEASES[0].version).toBe(packageVersion());
  });
});

describe("releaseAnchor", () => {
  it.each([
    ["1.1.0", "v1-1-0"],
    ["1.0.0", "v1-0-0"],
  ] as const)("devrait ancrer la version %s à « #%s », sans point, en commençant par une lettre", (version, anchor) => {
    expect(releaseAnchor(version)).toBe(anchor);
  });
});

describe("formatReleaseDate", () => {
  it.each([
    ["fr", "6 novembre 2026"],
    ["en", "6 November 2026"],
    ["es", "6 de noviembre de 2026"],
  ] as const)("devrait écrire la date dans la langue de la page (%s : « %s »)", (locale, expected) => {
    expect(formatReleaseDate("2026-11-06", locale)).toBe(expected);
  });

  it("devrait garder le jour de la date ISO, quel que soit le fuseau du serveur", () => {
    expect(formatReleaseDate("2026-11-03", "fr")).toBe("3 novembre 2026");
  });
});

describe("getReleasesContent", () => {
  it.each(LOCALES)("devrait donner les versions de RELEASES, dans le même ordre, en %s", (locale) => {
    expect(getReleasesContent(locale).releases.map(({ version }) => version)).toEqual(
      RELEASES.map(({ version }) => version),
    );
  });

  it.each(TRANSLATED)("devrait donner en %s autant de rubriques et de points qu'en français", (locale) => {
    expect(shape(locale)).toEqual(shape("fr"));
  });

  it.each(LOCALES)("devrait tenir chaque version en 3 à 6 rubriques de 3 à 6 points, en %s", (locale) => {
    for (const { version, sections } of getReleasesContent(locale).releases) {
      expect(sections.length, version).toBeGreaterThanOrEqual(3);
      expect(sections.length, version).toBeLessThanOrEqual(6);
      for (const { heading, items } of sections) {
        expect(items.length, `${version} ${heading}`).toBeGreaterThanOrEqual(3);
        expect(items.length, `${version} ${heading}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it.each(LOCALES)("ne devrait laisser aucun texte vide ni d'espace en trop en %s", (locale) => {
    for (const { path, text } of texts(getReleasesContent(locale))) {
      expect(text, path).not.toBe("");
      expect(text, path).toBe(text.trim());
    }
  });

  it.each(LOCALES)("devrait donner des titres de rubrique distincts dans chaque version, en %s", (locale) => {
    for (const { version, sections } of getReleasesContent(locale).releases) {
      const headings = sections.map(({ heading }) => heading);
      expect(new Set(headings).size, version).toBe(headings.length);
    }
  });

  it.each(LOCALES)("devrait résumer chaque version en une seule phrase, en %s", (locale) => {
    for (const { version, summary } of getReleasesContent(locale).releases) {
      expect(summary, version).toMatch(/[.…]$/);
      expect(summary.slice(0, -1), version).not.toMatch(/[.!?]\s/);
    }
  });

  /** Mots des trous noirs et de la nouvelle page, dans chaque langue. */
  const BLACK_HOLES: Readonly<Record<Locale, RegExp>> = {
    fr: /trous? noirs?/i,
    en: /black holes?/i,
    es: /agujeros? negros?/i,
  };
  const HORSESHOE: Readonly<Record<Locale, RegExp>> = {
    fr: /Fer à cheval cosmique/,
    en: /Cosmic Horseshoe/,
    es: /Herradura Cósmica/,
  };
  const RELEASE_NOTES_PAGE: Readonly<Record<Locale, RegExp>> = {
    fr: /Notes de version/,
    en: /Release notes/i,
    es: /Notas de la versión/,
  };

  it.each(LOCALES)(
    "devrait annoncer en 1.1.0 les quatre trous noirs, dont celui du Fer à cheval cosmique, et la page elle-même (%s)",
    (locale) => {
      const text = releaseText(locale, "1.1.0");
      expect(text).toMatch(BLACK_HOLES[locale]);
      expect(text).toMatch(HORSESHOE[locale]);
      expect(text).toMatch(RELEASE_NOTES_PAGE[locale]);
    },
  );

  it.each(LOCALES)("ne devrait prêter à la 1.0.0 ni trou noir ni notes de version, venus avec la 1.1.0 (%s)", (locale) => {
    const text = releaseText(locale, "1.0.0");
    expect(text).not.toMatch(BLACK_HOLES[locale]);
    expect(text).not.toMatch(RELEASE_NOTES_PAGE[locale]);
  });

  it("ne devrait parler ni d'ADR, ni de tests, ni de shader : la page s'adresse au public du site", () => {
    for (const locale of LOCALES) {
      for (const { path, text } of texts(getReleasesContent(locale))) {
        expect(text, `${locale} ${path}`).not.toMatch(/\bADR\b|\bshader|\btests?\b|\bWebGL\b|\bSVG\b|\bCSS\b/i);
      }
    }
  });
});
