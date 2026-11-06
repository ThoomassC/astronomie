import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { CosmicStops } from "@/components/journey/CosmicStops";
import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { getCosmicContent } from "@/content/cosmic/content";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/i18n/locales";
import { LOCAL_GROUP } from "@/lib/astro/localGroup";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { COSMIC_STOPS } from "@/lib/journey/camera";
import { STOP_IDS } from "@/lib/journey/stopIds";

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Rendu serveur des escales lointaines, comme au build (aucun effet ne s'exécute), sous le fournisseur de langue que
 * pose le layout `[lang]`, inséré dans le document pour l'interroger par rôles.
 */
function renderStops(locale: Locale): void {
  document.body.innerHTML = renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <CosmicStops locale={locale} sunHref="#soleil" />
    </LocaleProvider>,
  );
}

/** Section d'une escale, par son ancre. */
function section(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Section #${id} absente`);
  return found;
}

/** Lignes de données d'un tableau (sans la ligne d'en-tête), cellule par cellule. */
function rowsOf(table: HTMLElement): string[][] {
  const [, ...rows] = within(table).getAllByRole("row") as HTMLTableRowElement[];
  return rows.map((row) => Array.from(row.cells, (cell) => cell.textContent?.trim() ?? ""));
}

describe("CosmicStops", () => {
  it.each(LOCALES)("devrait poser les cinq escales lointaines, dans l'ordre du voyage, à leurs ancres (%s)", (locale) => {
    renderStops(locale);
    expect(Array.from(document.body.children, (child) => [child.tagName, child.id, child.getAttribute("data-stop")])).toEqual(
      COSMIC_STOPS.map((key) => ["SECTION", STOP_IDS[key], key]),
    );
  });

  it.each(LOCALES)("devrait nommer chaque section par son titre, dans la langue de la page (%s)", (locale) => {
    renderStops(locale);
    const { stops } = getCosmicContent(locale);
    for (const key of COSMIC_STOPS) {
      const region = screen.getByRole("region", { name: stops[key].name });
      expect(region).toHaveAttribute("id", STOP_IDS[key]);
      expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent(stops[key].name);
    }
  });

  it.each(LOCALES)("devrait présenter chaque fiche en couples terme / définition, avec ses sources (%s)", (locale) => {
    renderStops(locale);
    const { stops, plate } = getCosmicContent(locale);
    for (const key of COSMIC_STOPS) {
      const region = section(STOP_IDS[key]);
      expect(within(region).getAllByRole("term")).toHaveLength(stops[key].facts.length);
      expect(within(region).getAllByRole("definition")).toHaveLength(stops[key].facts.length);
      expect(region.querySelector(".fact-source")?.textContent).toBe(`${plate.sources} ${stops[key].source}.`);
    }
  });

  it.each(LOCALES)("devrait proposer de lire chaque fiche, le nom de l'escale lu après le bouton (%s)", (locale) => {
    renderStops(locale);
    const { stops, plate } = getCosmicContent(locale);
    for (const key of COSMIC_STOPS) {
      const region = section(STOP_IDS[key]);
      expect(within(region).getByRole("button", { name: `${plate.story}, ${stops[key].name}` })).toBeInTheDocument();
    }
  });

  it.each(LOCALES)("devrait proposer de revenir au Soleil depuis chaque escale (%s)", (locale) => {
    renderStops(locale);
    const { plate } = getCosmicContent(locale);
    for (const key of COSMIC_STOPS) {
      expect(within(section(STOP_IDS[key])).getByRole("link", { name: plate.back })).toHaveAttribute("href", "#soleil");
    }
  });
});

describe("l'escale du multivers", () => {
  it.each(LOCALES)("devrait annoncer l'hypothèse avant tout le reste, rang et titre compris (%s)", (locale) => {
    renderStops(locale);
    const region = section(STOP_IDS.multiverse);
    const warning = region.querySelector(".hypothesis");
    expect(warning?.textContent).toBe(getCosmicContent(locale).stops.multiverse.hypothesis);
    expect(region.querySelector("p, h2")).toBe(warning);
  });

  it("devrait ne mener qu'à l'Univers observable, avant « Revenir au Soleil » : c'est la dernière escale", () => {
    renderStops("fr");
    const region = section(STOP_IDS.multiverse);
    // Autour du nom (plaque compacte), la précédente seule ; ses pilules (ailleurs) au bout de la rangée des sections.
    const title = region.querySelector<HTMLElement>(".plate-title");
    if (!title) throw new Error("Rangée du nom absente");
    expect(within(title).getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Escale précédente\u00a0: Univers observable",
    ]);
    expect(region.querySelector(".plate-sections > .stop-steps")).not.toBeNull();
    expect(within(region).getAllByRole("link", { name: getCosmicContent("fr").plate.back })).toHaveLength(1);
    expect(within(region).queryByRole("link", { name: /^Escale suivante/ })).toBeNull();
  });

  it.each(LOCALES)("ne devrait afficher d'avertissement d'hypothèse qu'au multivers (%s)", (locale) => {
    renderStops(locale);
    expect(document.querySelectorAll(".hypothesis")).toHaveLength(1);
  });
});

describe("le tableau des étoiles de la carte", () => {
  it.each(LOCALES)("devrait lister une ligne par étoile, dans la plaque des étoiles voisines seulement (%s)", (locale) => {
    renderStops(locale);
    const table = within(section(STOP_IDS.stars)).getByRole("table", { name: getCosmicContent(locale).starTable.caption });
    expect(rowsOf(table)).toHaveLength(NEARBY_STARS.length);
  });

  it.each([
    ["fr", /^\d+,\d al$/],
    ["en", /^\d+\.\d ly$/],
    ["es", /^\d+,\d al$/],
  ] as const)("devrait nommer chaque étoile et donner sa distance à une décimale (%s)", (locale, distance) => {
    renderStops(locale);
    const rows = rowsOf(within(section(STOP_IDS.stars)).getByRole("table"));
    expect(rows.map(([name]) => name)).toEqual(NEARBY_STARS.map((star) => DEEP_SKY_STRINGS[locale].starNames[star.key]));
    expect(rows.map(([, value]) => value)).toEqual(NEARBY_STARS.map(() => expect.stringMatching(distance)));
  });

  it.each(LOCALES)("devrait traduire la précision des étoiles qui en ont une (%s)", (locale) => {
    renderStops(locale);
    const rows = rowsOf(within(section(STOP_IDS.stars)).getByRole("table"));
    const { notes } = getCosmicContent(locale).starTable;
    expect(Object.keys(notes).length).toBeGreaterThan(0);
    NEARBY_STARS.forEach((star, i) => {
      const note = notes[star.key];
      if (note) expect(rows[i][2]).toContain(note);
    });
  });
});

describe("le tableau des galaxies de la carte", () => {
  it.each(LOCALES)("devrait lister une ligne par galaxie du Groupe local, dans sa plaque seulement (%s)", (locale) => {
    renderStops(locale);
    const { galaxyTable } = getCosmicContent(locale);
    const table = within(section(STOP_IDS.localGroup)).getByRole("table", { name: galaxyTable.caption });
    expect(rowsOf(table)).toHaveLength(LOCAL_GROUP.length);
    expect(within(section(STOP_IDS.galaxy)).queryByRole("table")).not.toBeInTheDocument();
  });

  it.each(LOCALES)("devrait donner le nom, la distance et la taille de chaque galaxie, dans la langue (%s)", (locale) => {
    renderStops(locale);
    const { galaxyNames, galaxyDistance, galaxySize } = DEEP_SKY_STRINGS[locale];
    expect(rowsOf(within(section(STOP_IDS.localGroup)).getByRole("table"))).toEqual(
      LOCAL_GROUP.map((galaxy) => [galaxyNames[galaxy.key], galaxyDistance(galaxy.distanceMly), galaxySize(galaxy.diameterLy)]),
    );
  });

  it.each(LOCALES)("devrait nommer les colonnes du tableau des galaxies (%s)", (locale) => {
    renderStops(locale);
    const table = within(section(STOP_IDS.localGroup)).getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      ...getCosmicContent(locale).galaxyTable.columns,
    ]);
  });
});
