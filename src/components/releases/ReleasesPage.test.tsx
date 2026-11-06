import { cleanup, getDefaultNormalizer, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { MAIN_ID } from "@/components/journey/ids";
import { ReleasesFooter, ReleasesPage } from "@/components/releases/ReleasesPage";
import { getReleasesContent } from "@/content/releases/content";
import { formatReleaseDate, RELEASES, releaseAnchor } from "@/content/releases/structure";
import { LOCALES } from "@/i18n/locales";

afterEach(() => {
  cleanup();
});

/** Textes comparés tels quels : les espaces insécables du français ne se confondent pas avec des espaces ordinaires. */
const EXACT = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

describe.each(LOCALES)("ReleasesPage en %s", (locale) => {
  const content = getReleasesContent(locale);
  const renderPage = () => render(<ReleasesPage locale={locale} />);
  /** Titre d'une version, tel que la page le pose : « Version 1.1.0 ». */
  const versionTitle = (version: string) => `${content.version} ${version}`;

  it("devrait hiérarchiser les titres : la page en h1, chaque version en h2, chaque rubrique en h3", () => {
    renderPage();
    const expected = [
      ["H1", content.title],
      ...content.releases.flatMap(({ version, sections }) => [
        ["H2", versionTitle(version)],
        ...sections.map(({ heading }) => ["H3", heading]),
      ]),
    ];
    expect(screen.getAllByRole("heading").map((heading) => [heading.tagName, heading.textContent])).toEqual(expected);
  });

  it("devrait poser le contenu dans main#contenu, cible du lien d'évitement", () => {
    renderPage();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_ID);
  });

  it("devrait ouvrir la page sur un sommaire des versions, de la plus récente à la plus ancienne, par leurs ancres", () => {
    renderPage();
    const toc = screen.getByRole("navigation", { name: content.toc });
    expect(within(toc).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual(
      RELEASES.map(({ version }) => [versionTitle(version), `#${releaseAnchor(version)}`]),
    );
  });

  it("devrait faire de chaque version une région nommée par son titre, à l'ancre du sommaire", () => {
    renderPage();
    for (const { version } of RELEASES) {
      expect(screen.getByRole("region", { name: versionTitle(version) })).toHaveAttribute("id", releaseAnchor(version));
    }
  });

  it("devrait dater chaque version dans la langue de la page, avec sa date ISO en dateTime", () => {
    renderPage();
    for (const { version, date } of RELEASES) {
      const region = screen.getByRole("region", { name: versionTitle(version) });
      const time = within(region).getByText(formatReleaseDate(date, locale));
      expect(time.tagName).toBe("TIME");
      expect(time).toHaveAttribute("dateTime", date);
    }
  });

  it("devrait marquer la seule version la plus récente comme dernière version", () => {
    renderPage();
    const [latest, ...older] = RELEASES;
    expect(within(screen.getByRole("region", { name: versionTitle(latest.version) })).getByText(content.latest)).toBeVisible();
    for (const { version } of older) {
      expect(within(screen.getByRole("region", { name: versionTitle(version) })).queryByText(content.latest)).toBeNull();
    }
  });

  it("devrait poser le résumé, puis chaque rubrique en liste de ses changements", () => {
    renderPage();
    for (const { version, summary, sections } of content.releases) {
      const region = within(screen.getByRole("region", { name: versionTitle(version) }));
      expect(region.getByText(summary, EXACT)).toBeVisible();
      const lists = region.getAllByRole("list");
      expect(lists.map((list) => within(list).getAllByRole("listitem").map((item) => item.textContent))).toEqual(
        sections.map(({ items }) => [...items]),
      );
    }
  });

  it("devrait se rendre sans aucun script : la page se lit entière sans JavaScript", () => {
    expect(renderToStaticMarkup(<ReleasesPage locale={locale} />)).not.toContain("<script");
  });
});

describe("ReleasesFooter", () => {
  it("devrait poser le pied de page commun, dans la langue de la page", () => {
    render(<ReleasesFooter locale="es" />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
