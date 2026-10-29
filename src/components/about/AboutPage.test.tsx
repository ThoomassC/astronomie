import { cleanup, getDefaultNormalizer, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { AboutFooter, AboutPage } from "@/components/about/AboutPage";
import { MAIN_ID } from "@/components/journey/ids";
import { SITE_STRINGS } from "@/components/site/site.strings";
import { getAboutContent } from "@/content/about/content";
import { LANGUAGES_SECTION_ID, type AboutSectionId } from "@/content/about/structure";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";

afterEach(() => {
  cleanup();
  document.cookie = `${LOCALE_COOKIE}=; Path=/; Max-Age=0`;
});

/**
 * jsdom ne suit pas un lien vers une autre page : après les écouteurs de React, le test annule le suivi des liens.
 */
function interceptLinks(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest("a") !== null) event.preventDefault();
}

/** Noms de liens qui ne disent pas où ils mènent. */
const VAGUE_LINK_NAMES =
  /^(ici|là|here|aquí|cliquez ici|click here|haz clic aquí|en savoir plus|read more|leer más|lien|link|enlace)$/i;

describe.each(LOCALES)("AboutPage en %s", (locale) => {
  const content = getAboutContent(locale);
  /** Liens vers d'autres sites, tels que le contenu les donne (sources, crédits, signalements, code). */
  const outbound = content.sections.flatMap(({ links = [] }) => links);

  const renderPage = () => render(<AboutPage locale={locale} />);

  /** Sommaire de la page. */
  const toc = () => screen.getByRole("navigation", { name: content.toc });

  /** Section, nommée par son titre. */
  const region = (id: AboutSectionId) => {
    const found = content.sections.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`Section « ${id} » absente en ${locale}`);
    return screen.getByRole("region", { name: found.heading });
  };

  it("devrait poser un seul titre de niveau 1, celui de la page, puis un h2 par section (au moins sept)", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(content.title);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBeGreaterThanOrEqual(7);
    expect(headings.map((heading) => heading.textContent)).toEqual(content.sections.map(({ heading }) => heading));
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

  it("devrait ouvrir la page par un sommaire des sections, dans l'ordre, avant le titre", () => {
    renderPage();
    const nav = toc();
    expect(nav.compareDocumentPosition(screen.getByRole("heading", { level: 1 }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    // Deux rendus : replié (téléphone, tablette) et collant (grand écran) ; la feuille de style n'en montre qu'un.
    const lists = within(nav).getAllByRole("list");
    expect(lists).toHaveLength(2);
    for (const list of lists) {
      const links = within(list).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual(content.sections.map(({ id }) => `#${id}`));
      expect(links.map((link) => link.textContent)).toEqual(content.sections.map(({ heading }) => heading));
    }
  });

  it("devrait replier le sommaire dans un <details> natif, fermé au départ, qui s'ouvre sans JavaScript", () => {
    renderPage();
    const details = toc().querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details?.querySelector("summary")).toHaveTextContent(content.toc);
  });

  it("devrait mener chaque lien externe vers son site, en https, signalé à l'œil et à l'oreille", () => {
    renderPage();
    expect(outbound.length).toBeGreaterThan(0);
    for (const { label, href } of outbound) {
      expect(href).toMatch(/^https:\/\//);
      const link = screen.getByRole("link", { name: `${label}, ${content.external}` });
      expect(link).toHaveAttribute("href", href);
      // Même onglet : rien n'ouvre de fenêtre sans prévenir.
      expect(link).not.toHaveAttribute("target");
      expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent("↗");
    }
  });

  it("ne devrait poser aucun autre lien que le sommaire, les langues et les liens vers d'autres sites", () => {
    renderPage();
    const tocLinks = within(toc()).getAllByRole("link").length;
    const languageLinks = within(region(LANGUAGES_SECTION_ID)).getAllByRole("link").length;
    expect(screen.getAllByRole("link")).toHaveLength(tocLinks + languageLinks + outbound.length);
  });

  it("devrait donner à chaque lien vers un autre site un nom explicite et unique (jamais « cliquez ici »)", () => {
    const names = outbound.map(({ label }) => label);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).not.toMatch(VAGUE_LINK_NAMES);
  });

  it("devrait décrire l'accessibilité en couples terme / définition, du clavier aux limites connues", () => {
    renderPage();
    const accessibility = region("accessibilite");
    const terms = within(accessibility).getAllByRole("term");
    expect(terms).toHaveLength(6);
    expect(within(accessibility).getAllByRole("definition")).toHaveLength(terms.length);
  });

  it("devrait mettre la confidentialité en avant dans un encart, sous son titre", () => {
    renderPage();
    const note = content.sections.find(({ id }) => id === "confidentialite")?.note ?? "";
    // Sans réduire les espaces : l'encart français en contient d'insécables, que le texte attendu garde.
    const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
    expect(within(region("confidentialite")).getByText(note, exact)).toBeInTheDocument();
  });

  it("devrait proposer la page dans les trois langues, chaque nom dans sa langue, la langue courante marquée", () => {
    renderPage();
    const languages = region(LANGUAGES_SECTION_ID);
    for (const other of LOCALES) {
      const link = within(languages).getByRole("link", { name: LOCALE_NAMES[other] });
      expect(link).toHaveAttribute("href", pathFor("about", other));
      expect(link).toHaveAttribute("lang", other);
      expect(link).toHaveAttribute("hreflang", other);
      if (other === locale) expect(link).toHaveAttribute("aria-current", "true");
      else expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("devrait retenir la langue choisie dans la section des langues, comme partout sur le site", async () => {
    renderPage();
    const other = LOCALES.find((candidate) => candidate !== locale) ?? locale;
    document.addEventListener("click", interceptLinks);
    try {
      await userEvent.click(within(region(LANGUAGES_SECTION_ID)).getByRole("link", { name: LOCALE_NAMES[other] }));
    } finally {
      document.removeEventListener("click", interceptLinks);
    }
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=${other}`);
  });

  it("devrait être lisible sans JavaScript : tout le texte est dans le HTML du serveur, sans script", () => {
    const html = renderToStaticMarkup(<AboutPage locale={locale} />);
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
    expect(html).not.toContain("<script");
    for (const { heading, note, paragraphs, entries = [] } of content.sections) {
      for (const expected of [heading, note ?? "", ...paragraphs, ...entries.map(({ text: entry }) => entry)]) {
        expect(text).toContain(expected);
      }
    }
  });
});

describe.each(LOCALES)("AboutFooter en %s", (locale) => {
  it("devrait poser le plan du site en pied de page, hors du contenu principal", () => {
    render(<AboutFooter locale={locale} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("navigation", { name: SITE_STRINGS[locale].siteMap })).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: SITE_STRINGS[locale].tabs.about })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
