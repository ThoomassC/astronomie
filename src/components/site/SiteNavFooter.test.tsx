import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SiteNavFooter } from "@/components/site/SiteNavFooter";
import { setFragmentSource } from "@/lib/site/fragment";

/**
 * jsdom ne sait pas suivre un lien vers une autre page : après les écouteurs de React, le test annule le suivi des
 * liens pour lire l'adresse finale.
 */
function interceptLinks(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest("a") !== null) event.preventDefault();
}

/** Retrait de la source de fragment déclarée par un test. */
let removeSource: (() => void) | undefined;

beforeEach(() => {
  document.addEventListener("click", interceptLinks);
});

afterEach(() => {
  cleanup();
  document.removeEventListener("click", interceptLinks);
  removeSource?.();
  removeSource = undefined;
  document.cookie = "lang=; Path=/; Max-Age=0";
});

/** Libellé et adresse de chaque lien d'une liste nommée. */
function links(listName: string): (string | null)[][] {
  return within(screen.getByRole("list", { name: listName }))
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("SiteNavFooter", () => {
  it.each([
    { locale: "fr", name: "Plan du site" },
    { locale: "en", name: "Site map" },
    { locale: "es", name: "Mapa del sitio" },
  ] as const)("devrait poser le plan du site à l'ancre #plan-du-site, nommé en $locale", ({ locale, name }) => {
    render(<SiteNavFooter locale={locale} page="home" />);
    expect(screen.getByRole("navigation", { name })).toHaveAttribute("id", "plan-du-site");
  });

  it("devrait lister les quatre rubriques vers leur page, dans la langue de la page", () => {
    render(<SiteNavFooter locale="en" page="about" />);
    expect(links("Sections")).toEqual([
      ["Home", "/en"],
      ["Journey", "/en/voyage"],
      ["Sizes", "/en/tailles"],
      ["About", "/en/a-propos"],
    ]);
  });

  it("devrait marquer la rubrique affichée comme page courante", () => {
    render(<SiteNavFooter locale="en" page="about" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  it("devrait lister les trois langues vers la même page, chacune annoncée dans sa langue", () => {
    render(<SiteNavFooter locale="es" page="sizes" />);
    const languages = within(screen.getByRole("list", { name: "Idioma" })).getAllByRole("link");
    expect(languages.map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("lang")])).toEqual([
      ["Français", "/fr/tailles", "fr"],
      ["English", "/en/tailles", "en"],
      ["Español", "/es/tailles", "es"],
    ]);
  });

  it("devrait marquer la langue affichée comme langue courante", () => {
    render(<SiteNavFooter locale="es" page="sizes" />);
    expect(screen.getByRole("link", { name: "Español" })).toHaveAttribute("aria-current", "true");
  });

  it("devrait garder la position et retenir la langue quand on en change depuis le pied de page", async () => {
    removeSource = setFragmentSource(() => "#voie-lactee");
    const user = userEvent.setup();
    render(<SiteNavFooter locale="fr" page="voyage" />);
    const spanish = screen.getByRole("link", { name: "Español" });
    await user.click(spanish);
    expect(spanish).toHaveAttribute("href", "/es/voyage#voie-lactee");
    expect(document.cookie).toContain("lang=es");
  });
});
