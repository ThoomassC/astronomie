import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE_STRINGS } from "@/components/site/site.strings";

afterEach(() => {
  cleanup();
});

/** Onglets de la barre, dans l'ordre : libellé et adresse. */
function tabs(navName: string): [string | null, string | null][] {
  return within(screen.getByRole("navigation", { name: navName }))
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("SiteHeader", () => {
  it("devrait mener chaque onglet à sa page en anglais, quand la page est en anglais", () => {
    render(<SiteHeader locale="en" page="voyage" />);
    expect(tabs("Sections")).toEqual([
      ["Home", "/en"],
      ["Journey", "/en/voyage"],
      ["Sizes", "/en/tailles"],
      ["About", "/en/a-propos"],
    ]);
  });

  it("devrait nommer les onglets en français, quand la page est en français", () => {
    render(<SiteHeader locale="fr" page="home" />);
    expect(tabs("Rubriques")).toEqual([
      ["Accueil", "/fr"],
      ["Voyage", "/fr/voyage"],
      ["Tailles", "/fr/tailles"],
      ["À propos", "/fr/a-propos"],
    ]);
  });

  it("devrait nommer les onglets en espagnol, quand la page est en espagnol", () => {
    render(<SiteHeader locale="es" page="about" />);
    expect(tabs("Secciones")).toEqual([
      ["Inicio", "/es"],
      ["Viaje", "/es/voyage"],
      ["Tamaños", "/es/tailles"],
      ["Acerca de", "/es/a-propos"],
    ]);
  });

  it("devrait marquer l'onglet de la page affichée comme page courante", () => {
    render(<SiteHeader locale="es" page="sizes" />);
    const nav = screen.getByRole("navigation", { name: "Secciones" });
    expect(within(nav).getByRole("link", { name: "Tamaños" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["Inicio", "Viaje", "Acerca de"])("ne devrait pas marquer l'onglet « %s » d'une autre page", (name) => {
    render(<SiteHeader locale="es" page="sizes" />);
    const nav = screen.getByRole("navigation", { name: "Secciones" });
    expect(within(nav).getByRole("link", { name })).not.toHaveAttribute("aria-current");
  });

  it("devrait ramener la marque à l'accueil, dans la langue de la page", () => {
    render(<SiteHeader locale="es" page="about" />);
    expect(screen.getByRole("link", { name: "Astronomie, inicio" })).toHaveAttribute("href", "/es");
  });

  it("devrait s'effacer pendant l'exploration (data-hide-on-explore)", () => {
    render(<SiteHeader locale="fr" page="voyage" />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-hide-on-explore");
  });

  it("devrait placer dans la barre les commandes propres à la page", () => {
    render(
      <SiteHeader locale="fr" page="voyage">
        <button type="button">Tourner autour</button>
      </SiteHeader>,
    );
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Tourner autour" })).toBeInTheDocument();
  });

  it("devrait signaler à la mise en page la page affichée (data-page)", () => {
    render(<SiteHeader locale="fr" page="about" />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-page", "about");
  });

  it("devrait signaler à la mise en page que la barre porte des commandes (data-controls)", () => {
    render(
      <SiteHeader locale="fr" page="voyage">
        <button type="button">Tourner autour</button>
      </SiteHeader>,
    );
    expect(screen.getByRole("banner")).toHaveAttribute("data-controls");
  });

  it("ne devrait pas signaler de commandes quand la page n'en a pas", () => {
    render(<SiteHeader locale="fr" page="home" />);
    expect(screen.getByRole("banner")).not.toHaveAttribute("data-controls");
  });

  /*
   * Au Voyage et à Tailles, la scène occupe l'écran et la page est longue : la barre reste fixe en haut de l'écran
   * (`data-pinned`), toujours à portée. À l'Accueil et à À propos, elle suit la page.
   */
  it.each(["voyage", "sizes"] as const)("devrait rester fixe sur la page « %s », commandes comprises", (page) => {
    render(
      <SiteHeader locale="fr" page={page}>
        <button type="button">Tourner autour</button>
      </SiteHeader>,
    );
    const banner = screen.getByRole("banner");
    expect(banner).toHaveAttribute("data-pinned");
    expect(banner).toHaveClass("bar");
    expect(banner).toHaveAttribute("data-page", page);
    expect(banner).toHaveAttribute("data-controls");
    expect(banner).toHaveAttribute("data-hide-on-explore");
    expect(within(banner).getByRole("button", { name: "Tourner autour" })).toBeInTheDocument();
  });

  it.each(["home", "about"] as const)("ne devrait pas être fixée sur la page « %s »", (page) => {
    render(<SiteHeader locale="fr" page={page} />);
    expect(screen.getByRole("banner")).not.toHaveAttribute("data-pinned");
  });

  /*
   * La mise en page centre les onglets (grille de trois colonnes) : l'ordre du DOM, qui est l'ordre de tabulation, ne
   * doit pas en dépendre. Marque, onglets, commandes de la page, langue, puis menu replié.
   */
  it("devrait garder l'ordre de tabulation : marque, onglets, commandes de la page, langue, menu replié", () => {
    render(
      <SiteHeader locale="fr" page="voyage">
        <button type="button">Tourner autour</button>
      </SiteHeader>,
    );
    const banner = within(screen.getByRole("banner"));
    const order = [
      banner.getByRole("link", { name: SITE_STRINGS.fr.brandHome }),
      banner.getByRole("link", { name: "Accueil" }),
      banner.getByRole("link", { name: "À propos" }),
      banner.getByRole("button", { name: "Tourner autour" }),
      banner.getByRole("button", { name: `FR, ${SITE_STRINGS.fr.currentLanguage}` }),
      banner.getByRole("button", { name: SITE_STRINGS.fr.menu }),
    ];
    for (const [before, after] of order.slice(1).map((element, i) => [order[i], element])) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("devrait proposer le menu des langues et le menu replié des petits écrans, fermés", () => {
    render(<SiteHeader locale="fr" page="home" />);
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "FR, langue\u00a0: français" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(banner).getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
