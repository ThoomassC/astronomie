import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { FOOTER } from "@/content/site";
import { getVoyageContent } from "@/content/voyage/content";
import { LOCALES } from "@/i18n/locales";

afterEach(() => {
  cleanup();
});

/** Paragraphes du pied de page, hors plan du site : sources, avertissement d'échelle, crédit des cartes. */
const paragraphs = (footer: HTMLElement) => Array.from(footer.querySelectorAll(":scope > p"), (p) => p.textContent);

describe("SiteFooter", () => {
  /*
   * Garde de migration : en français, le pied de page dit mot pour mot ce que disait l'ancien contenu, gelé jusqu'à la
   * clôture (`src/content/site.ts`), qui supprime ce cas avec lui.
   */
  it("devrait garder en français les sources, l'avertissement d'échelle et le crédit des cartes d'origine", () => {
    render(<SiteFooter locale="fr" />);
    const footer = screen.getByRole("contentinfo");
    const { before, source, between, license, after } = FOOTER.textures;
    expect(paragraphs(footer)).toEqual([
      FOOTER.sources,
      FOOTER.scale,
      `${before}${source.label}${between}${license.label}${after}`,
    ]);
    expect(within(footer).getByRole("link", { name: source.label })).toHaveAttribute("href", source.href);
    expect(within(footer).getByRole("link", { name: license.label })).toHaveAttribute("href", license.href);
  });

  it.each([
    [
      "en",
      "Maps of the planets and the Moon: Solar System Scope, based on NASA data, resized for this site. Licence: CC BY 4.0.",
      "https://creativecommons.org/licenses/by/4.0/deed.en",
    ],
    [
      "es",
      "Mapas de los planetas y de la Luna: Solar System Scope, a partir de datos de la NASA, redimensionados para el sitio. Licencia CC BY 4.0.",
      "https://creativecommons.org/licenses/by/4.0/deed.es",
    ],
  ] as const)("devrait citer ses sources et créditer les cartes dans la langue de la page (%s)", (locale, credits, deed) => {
    render(<SiteFooter locale={locale} />);
    const footer = screen.getByRole("contentinfo");
    const { sources, scale } = getVoyageContent(locale).footer;
    expect(paragraphs(footer)).toEqual([sources, scale, credits]);
    expect(within(footer).getByRole("link", { name: "Solar System Scope" })).toHaveAttribute(
      "href",
      "https://www.solarsystemscope.com/textures/",
    );
    expect(within(footer).getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", deed);
  });

  it.each(LOCALES)("devrait s'effacer pendant l'exploration, comme le reste de la page (%s)", (locale) => {
    render(<SiteFooter locale={locale} />);
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-hide-on-explore");
  });
});
