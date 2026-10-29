import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SiteMenu } from "@/components/site/SiteMenu";

/**
 * jsdom ne sait pas suivre un lien vers une autre page. Après les écouteurs de React, le test note pour chaque clic
 * sur un lien si la page a laissé le navigateur le suivre (rien d'annulé), puis l'annule lui-même.
 */
let followed: boolean[] = [];
function interceptLinks(event: MouseEvent) {
  if (!(event.target instanceof Element) || event.target.closest("a") === null) return;
  followed.push(!event.defaultPrevented);
  event.preventDefault();
}

beforeEach(() => {
  followed = [];
  document.addEventListener("click", interceptLinks);
});

afterEach(() => {
  cleanup();
  document.removeEventListener("click", interceptLinks);
  document.cookie = "lang=; Path=/; Max-Age=0";
});

const toggle = () => screen.getByRole("button", { name: "Menu" });

/** Libellés des liens d'un repère de navigation, dans l'ordre. */
function linkNames(navName: string): (string | null)[] {
  return within(screen.getByRole("navigation", { name: navName }))
    .getAllByRole("link")
    .map((link) => link.textContent);
}

describe("SiteMenu", () => {
  it("devrait se présenter fermé, sans lien visible", () => {
    render(<SiteMenu locale="fr" page="voyage" />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("devrait nommer son bouton dans la langue de la page (« Menú » en espagnol)", () => {
    render(<SiteMenu locale="es" page="voyage" />);
    expect(screen.getByRole("button", { name: "Menú" })).toBeInTheDocument();
  });

  it("devrait garder, pour les navigateurs sans JavaScript, un lien « Menu » vers le plan du site en pied de page", () => {
    render(<SiteMenu locale="fr" page="voyage" />);
    expect(screen.getByRole("link", { name: "Menu", hidden: true })).toHaveAttribute("href", "#plan-du-site");
  });

  it("devrait masquer ce lien tant que le script tourne, le bouton faisant foi", () => {
    render(<SiteMenu locale="fr" page="voyage" />);
    expect(screen.getByRole("link", { name: "Menu", hidden: true })).not.toBeVisible();
  });

  it("devrait titrer les deux groupes du panneau, rubriques puis langue", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="es" page="voyage" />);
    await user.click(screen.getByRole("button", { name: "Menú" }));
    expect(screen.getByText("Secciones")).toBeVisible();
    expect(screen.getByText("Idioma")).toBeVisible();
  });

  it("devrait déplier les quatre onglets et les trois langues", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="en" page="sizes" />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(linkNames("Sections")).toEqual(["Home", "Journey", "Sizes", "About"]);
    expect(linkNames("Language")).toEqual(["Français", "English", "Español"]);
  });

  it("devrait relier son bouton au panneau qu'il déplie", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="en" page="sizes" />);
    await user.click(toggle());
    const panel = document.getElementById(toggle().getAttribute("aria-controls") ?? "");
    expect(panel).toContainElement(screen.getByRole("navigation", { name: "Sections" }));
    expect(panel).toContainElement(screen.getByRole("navigation", { name: "Language" }));
  });

  it("devrait marquer l'onglet de la page et la langue affichées", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="en" page="sizes" />);
    await user.click(toggle());
    expect(screen.getByRole("link", { name: "Sizes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");
  });

  it("devrait se refermer avec Échap, rendre le focus au bouton et ne fermer que lui", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="en" page="sizes" />);
    await user.click(toggle());
    const journey = screen.getByRole("link", { name: "Journey" });
    act(() => journey.focus());
    expect(fireEvent.keyDown(journey, { key: "Escape" })).toBe(false);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait se refermer quand on choisit un onglet, et rendre le focus au bouton", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="en" page="sizes" />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait rester sur la page quand on choisit la langue affichée, et se refermer", async () => {
    const user = userEvent.setup();
    render(<SiteMenu locale="en" page="voyage" />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: "English" }));
    expect(followed).toEqual([false]);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait se refermer quand on touche ailleurs dans la page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SiteMenu locale="fr" page="voyage" />
        <p>Ailleurs</p>
      </>,
    );
    await user.click(toggle());
    fireEvent.pointerDown(screen.getByText("Ailleurs"));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait se refermer quand le focus quitte le panneau (Tab après le dernier lien)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SiteMenu locale="fr" page="voyage" />
        <button type="button">Partir du Soleil</button>
      </>,
    );
    await user.click(toggle());
    act(() => screen.getByRole("link", { name: "Español" }).focus());
    await user.tab();
    expect(screen.getByRole("button", { name: "Partir du Soleil" })).toHaveFocus();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });
});
