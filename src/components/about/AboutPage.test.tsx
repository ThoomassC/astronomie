import { cleanup, getDefaultNormalizer, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { AboutFooter, AboutPage } from "@/components/about/AboutPage";
import { MAIN_ID } from "@/components/journey/ids";
import { SITE_STRINGS } from "@/components/site/site.strings";
import { getAboutContent } from "@/content/about/content";
import type { AboutSectionId } from "@/content/about/structure";
import { LOCALES } from "@/i18n/locales";

afterEach(() => {
  cleanup();
});

/** Noms de liens qui ne disent pas où ils mènent. */
const VAGUE_LINK_NAMES =
  /^(ici|là|here|aquí|cliquez ici|click here|haz clic aquí|en savoir plus|read more|leer más|lien|link|enlace)$/i;

describe.each(LOCALES)("AboutPage en %s", (locale) => {
  const content = getAboutContent(locale);
  /** Liens vers d'autres sites, tels que le contenu les donne : les sources. */
  const outbound = content.sections.flatMap(({ links = [] }) => links);

  const renderPage = () => render(<AboutPage locale={locale} />);

  /** Section du contenu, par son ancre. */
  const sectionOf = (id: AboutSectionId) => {
    const found = content.sections.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`Section « ${id} » absente en ${locale}`);
    return found;
  };

  /** Section de la page, nommée par son titre. */
  const region = (id: AboutSectionId) => screen.getByRole("region", { name: sectionOf(id).heading });

  it("devrait poser le titre de la page en h1, puis un h2 par section : pourquoi ce site, puis les sources", () => {
    renderPage();
    expect(screen.getAllByRole("heading").map((heading) => [heading.tagName, heading.textContent])).toEqual([
      ["H1", content.title],
      ["H2", sectionOf("pourquoi").heading],
      ["H2", sectionOf("sources").heading],
    ]);
  });

  it("ne devrait proposer aucun sommaire : ni navigation dans la page, ni liste repliée", () => {
    const { container } = renderPage();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(container.querySelector("details")).toBeNull();
  });

  it("devrait être le contenu principal que vise le lien d'évitement", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", MAIN_ID);
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("devrait poser l'accroche sous le titre", () => {
    renderPage();
    expect(screen.getByText(content.intro)).toBeInTheDocument();
  });

  it("devrait nommer chaque section par son titre, à l'ancre commune aux trois langues", () => {
    renderPage();
    for (const { id } of content.sections) expect(region(id)).toHaveAttribute("id", id);
  });

  it("devrait citer toutes les sources dans la section Sources, chacune vers son site", () => {
    renderPage();
    const sources = sectionOf("sources").links ?? [];
    expect(sources.length).toBeGreaterThan(0);
    expect(within(region("sources")).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      sources.map(({ href }) => href),
    );
  });

  it("devrait signaler chaque lien vers un autre site à l'œil et à l'oreille, et l'ouvrir dans le même onglet", () => {
    renderPage();
    for (const { label, href } of outbound) {
      expect(href).toMatch(/^https:\/\//);
      const link = screen.getByRole("link", { name: `${label}, ${content.external}` });
      expect(link).toHaveAttribute("href", href);
      // Même onglet : rien n'ouvre de fenêtre sans prévenir.
      expect(link).not.toHaveAttribute("target");
      expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent("↗");
    }
  });

  it("ne devrait poser aucun autre lien que les sources", () => {
    renderPage();
    expect(screen.getAllByRole("link")).toHaveLength(outbound.length);
  });

  it("devrait donner à chaque source un nom explicite et unique (jamais « cliquez ici »)", () => {
    const names = outbound.map(({ label }) => label);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).not.toMatch(VAGUE_LINK_NAMES);
  });

  it("devrait être lisible sans JavaScript : tout le texte est dans le HTML du serveur, sans script", () => {
    const html = renderToStaticMarkup(<AboutPage locale={locale} />);
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
    expect(html).not.toContain("<script");
    for (const { heading, paragraphs, links = [] } of content.sections) {
      for (const expected of [heading, ...paragraphs, ...links.flatMap(({ label, description }) => [label, description])]) {
        expect(text).toContain(expected);
      }
    }
  });
});

describe.each(LOCALES)("AboutFooter en %s", (locale) => {
  it("devrait poser le pied de page commun, aux contacts de l'auteur, hors du contenu principal", () => {
    render(<AboutFooter locale={locale} />);
    const footer = screen.getByRole("contentinfo");
    // Sans réduire les espaces : la signature garde une espace insécable avant le tiret.
    const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
    expect(within(footer).getByText(SITE_STRINGS[locale].signature, exact)).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: "caronthomas27@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:caronthomas27@gmail.com",
    );
    expect(within(footer).queryByRole("navigation")).not.toBeInTheDocument();
  });
});
