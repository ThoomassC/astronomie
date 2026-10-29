import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { StopsMenuView, type StopsMenuItem, type StopsMenuViewProps } from "@/components/journey/StopsMenuView";

/** Un menu quelconque : celui des étoiles de la page Tailles, réduit à trois escales. */
const ITEMS: readonly StopsMenuItem[] = [
  { key: "proxima-centauri", href: "#proxima-du-centaure", name: "Proxima du Centaure", sub: "0,154 R☉", color: "#E8775A" },
  { key: "sun", href: "#soleil", name: "Soleil", sub: "1 R☉", color: "#FFB13B" },
  { key: "betelgeuse", href: "#betelgeuse", name: "Bételgeuse", sub: "764 R☉", color: "#F2994A" },
];

const props = (over: Partial<StopsMenuViewProps> = {}): StopsMenuViewProps => ({
  items: ITEMS,
  current: "sun",
  homeKey: "intro",
  currentName: "Soleil",
  currentColor: "#FFB13B",
  labels: { nav: "Étoiles", home: "Étoiles", choose: "choisir une étoile", change: "changer d'étoile" },
  ...over,
});

const toggle = () => screen.getByRole("button", { name: "Soleil, changer d'étoile" });

afterEach(() => {
  cleanup();
  document.head.replaceChildren();
});

describe("StopsMenuView", () => {
  it("devrait nommer l'escale en cours sur son bouton, avec sa pastille, liste fermée", () => {
    render(<StopsMenuView {...props()} />);
    expect(screen.getByRole("navigation", { name: "Étoiles" })).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle().querySelector("i")).toHaveStyle({ background: "#FFB13B" });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("devrait ouvrir la liste des escales, avec leur ancre et leur précision, et marquer celle où l'on est", async () => {
    const user = userEvent.setup();
    render(<StopsMenuView {...props()} />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Bételgeuse/ })).toHaveAttribute("href", "#betelgeuse");
    expect(screen.getByRole("link", { name: /Bételgeuse/ })).toHaveTextContent("764 R☉");
    expect(screen.getByRole("link", { name: /Soleil/ })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: /Bételgeuse/ })).not.toHaveAttribute("aria-current");
  });

  it("devrait se refermer avec Échap, rendre le focus au bouton et ne fermer que lui", async () => {
    const user = userEvent.setup();
    render(<StopsMenuView {...props()} />);
    await user.click(toggle());
    // fireEvent renvoie false quand l'événement a été annulé : une autre couche ne se ferme pas avec lui.
    expect(fireEvent.keyDown(screen.getByRole("link", { name: /Bételgeuse/ }), { key: "Escape" })).toBe(false);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait laisser passer Échap quand la mise en page masque le menu (fenêtre élargie)", async () => {
    const user = userEvent.setup();
    render(<StopsMenuView {...props()} />);
    await user.click(toggle());
    const style = document.createElement("style");
    style.textContent = ".stops-menu { display: none; }";
    document.head.append(style);
    expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(true);
    // Masqué, le bouton sort de l'arbre d'accessibilité : on le cherche quand même.
    expect(screen.getByRole("button", { name: "Soleil, changer d'étoile", hidden: true })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("devrait se refermer quand on choisit une escale", async () => {
    const user = userEvent.setup();
    render(<StopsMenuView {...props()} />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: /Proxima/ }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait se refermer quand on touche ailleurs dans la page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <StopsMenuView {...props()} />
        <p>Ailleurs</p>
      </>,
    );
    await user.click(toggle());
    fireEvent.pointerDown(screen.getByText("Ailleurs"));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait dire ce qu'il ouvre à l'escale d'accueil, absente de la liste, sans pastille", () => {
    render(<StopsMenuView {...props({ current: "intro", currentName: "Introduction" })} />);
    const button = screen.getByRole("button", { name: "Étoiles, choisir une étoile" });
    expect(button.querySelector("i")).toBeNull();
  });

  it("devrait se refermer quand le focus quitte la liste (Tab après le dernier lien)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <StopsMenuView {...props()} />
        <button type="button">Comparer</button>
      </>,
    );
    await user.click(toggle());
    screen.getByRole("link", { name: /Bételgeuse/ }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Comparer" })).toHaveFocus();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });
});
