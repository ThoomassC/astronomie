import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { getVoyageContent } from "@/content/voyage/content";
import { LOCALES } from "@/i18n/locales";

afterEach(() => {
  cleanup();
});

/** Paragraphes du pied de page, hors pied de page commun : sources, avertissement d'échelle, crédit des cartes. */
const paragraphs = (footer: HTMLElement) => Array.from(footer.querySelectorAll(":scope > p"), (p) => p.textContent);

describe("SiteFooter", () => {
  it.each([
    [
      "fr",
      "Cartes des astres\u00a0: Solar System Scope, d'après des données de la NASA, redimensionnées pour le site. Licence CC BY 4.0.",
      "https://creativecommons.org/licenses/by/4.0/deed.fr",
    ],
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

  it.each([
    ["fr", "GitHub, site externe"],
    ["en", "GitHub, external site"],
    ["es", "GitHub, sitio externo"],
  ] as const)("devrait finir par le pied de page commun, après le crédit des cartes, sans plan du site (%s)", (locale, github) => {
    render(<SiteFooter locale={locale} />);
    const footer = screen.getByRole("contentinfo");
    const credit = within(footer).getByRole("link", { name: "CC BY 4.0" });
    const contact = within(footer).getByRole("link", { name: github });
    expect(contact).toHaveAttribute("href", "https://github.com/ThoomassC");
    expect(credit.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(footer).queryByRole("navigation")).not.toBeInTheDocument();
  });

  it.each(LOCALES)("devrait s'effacer pendant l'exploration, comme le reste de la page (%s)", (locale) => {
    render(<SiteFooter locale={locale} />);
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-hide-on-explore");
  });
});
