import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Activity, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoHideBar } from "@/components/site/AutoHideBar";
import { CONCEAL_AFTER_PX, REVEAL_AFTER_PX } from "@/lib/site/barSlide";

/*
 * Barre haute du Voyage et de Tailles : elle suit le défilement de la page (glisse hors de l'écran en descendant,
 * revient en remontant), revient quand le focus y entre ou que la fenêtre change de taille, et laisse tout en place
 * quand la page est masquée. La feuille de style décide où elle glisse vraiment (mise en page compacte, écran bas) et
 * la garde tant qu'elle a le focus clavier ou un menu ouvert.
 */

/** Vue de 800 px sur une page de 10 000 px : on défile de 0 à 9 200 px. */
const VIEW_HEIGHT = 800;
const PAGE_HEIGHT = 10_000;
const BOTTOM = PAGE_HEIGHT - VIEW_HEIGHT;
/** Hauteur de la barre. */
const BAR_HEIGHT = 64;

let scrollY = 0;

/** La page défile jusqu'à `y` px ; le navigateur prévient par un événement `scroll`. */
const scrollPageTo = (y: number) => {
  scrollY = y;
  fireEvent.scroll(window);
};

beforeEach(() => {
  scrollY = 0;
  // Frontière navigateur : jsdom ne fait ni défiler ni mesurer.
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.stubGlobal("innerHeight", VIEW_HEIGHT);
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(PAGE_HEIGHT);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(BAR_HEIGHT);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Bar({ children }: { children?: ReactNode }) {
  return (
    <AutoHideBar className="bar header" page="voyage" controls>
      <button type="button">Escales</button>
      {children}
    </AutoHideBar>
  );
}

const banner = () => screen.getByRole("banner");

describe("AutoHideBar", () => {
  it("devrait poser la barre de la page : classes, page, commandes, effacée pendant l'exploration, masquable", () => {
    render(<Bar />);
    expect(banner()).toHaveClass("bar", "header");
    expect(banner()).toHaveAttribute("data-page", "voyage");
    expect(banner()).toHaveAttribute("data-controls");
    expect(banner()).toHaveAttribute("data-hide-on-explore");
    expect(banner()).toHaveAttribute("data-autohide");
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("ne devrait pas signaler de commandes quand la page n'en a pas", () => {
    render(<AutoHideBar className="bar" page="sizes" controls={false} />);
    expect(banner()).not.toHaveAttribute("data-controls");
  });

  it("devrait glisser hors de l'écran quand on descend, et revenir dès qu'on remonte", () => {
    render(<Bar />);
    scrollPageTo(1000);
    scrollPageTo(1000 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
    scrollPageTo(1000 + CONCEAL_AFTER_PX - REVEAL_AFTER_PX);
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("devrait rester affichée en haut de la page, à moins de sa hauteur du haut", () => {
    render(<Bar />);
    scrollPageTo(BAR_HEIGHT);
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("ne devrait pas revenir sur le rebond du bas de la page (défilement au-delà du bas, puis retour)", () => {
    render(<Bar />);
    scrollPageTo(BOTTOM - 100);
    scrollPageTo(BOTTOM);
    scrollPageTo(BOTTOM + 60);
    scrollPageTo(BOTTOM);
    expect(banner()).toHaveAttribute("data-concealed");
  });

  it("devrait revenir quand le focus y entre", () => {
    render(<Bar />);
    scrollPageTo(2000);
    expect(banner()).toHaveAttribute("data-concealed");
    act(() => screen.getByRole("button", { name: "Escales" }).focus());
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("devrait repartir de la position du focus : descendre ensuite la cache de nouveau", () => {
    render(<Bar />);
    scrollPageTo(2000);
    act(() => screen.getByRole("button", { name: "Escales" }).focus());
    scrollPageTo(2000 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
  });

  it("devrait revenir quand la fenêtre change de largeur (rotation du téléphone)", () => {
    render(<Bar />);
    scrollPageTo(2000);
    vi.stubGlobal("innerWidth", 844);
    fireEvent(window, new Event("resize"));
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  /* La barre d'adresse du navigateur se replie quand on descend : la hauteur de la vue change, pas sa largeur. */
  it("ne devrait pas revenir quand seule la hauteur de la vue change", () => {
    render(<Bar />);
    scrollPageTo(2000);
    vi.stubGlobal("innerHeight", VIEW_HEIGHT + 56);
    fireEvent(window, new Event("resize"));
    expect(banner()).toHaveAttribute("data-concealed");
  });

  /*
   * Next garde la page quittée, masquée sous <Activity> : elle ne suit plus le défilement de la page affichée, et
   * revient affichée à son retour, quel que soit l'état où on l'avait laissée.
   */
  it("devrait cesser de suivre le défilement quand la page est masquée, et revenir affichée à son retour", () => {
    const { rerender } = render(
      <Activity mode="visible">
        <Bar />
      </Activity>,
    );
    scrollPageTo(2000);
    expect(banner()).toHaveAttribute("data-concealed");
    rerender(
      <Activity mode="hidden">
        <Bar />
      </Activity>,
    );
    const bar = document.querySelector("header");
    scrollPageTo(0);
    scrollPageTo(3000);
    expect(bar).not.toHaveAttribute("data-concealed");
    rerender(
      <Activity mode="visible">
        <Bar />
      </Activity>,
    );
    expect(banner()).not.toHaveAttribute("data-concealed");
    scrollPageTo(3000 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
  });
});
