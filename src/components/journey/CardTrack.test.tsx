import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardTrack } from "@/components/journey/CardTrack";
import { Plate, type PlateSection } from "@/components/journey/Plate";
import { FIXED_CARD_QUERY } from "@/lib/journey/card";
import { createStopStore } from "@/lib/journey/store";

type Key = "intro" | "sun" | "sirius-a";

const SECTIONS: readonly PlateSection[] = [{ key: "fiche", label: "Lire la fiche", icon: "story", content: <p>Fiche</p> }];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Frontière navigateur : requête de la carte fixe, qui bascule (rotation) ; `turn` prévient les abonnés. */
function stubFixedCard(initial: boolean) {
  let fixed = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return fixed && query === FIXED_CARD_QUERY;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  return (next: boolean) => {
    fixed = next;
    act(() => listeners.forEach((listener) => listener()));
  };
}

const fixedCardOn = () => document.documentElement.hasAttribute("data-fixed-card");

/** Deux plaques d'un parcours qui part de l'introduction (sans carte), dans leur suivi. */
function renderTrack() {
  const store = createStopStore<Key>("intro");
  const ui = (
    <CardTrack store={store} cards={["sun", "sirius-a"]}>
      <section data-stop="sun">
        <Plate id="soleil" stop="sun" name="Soleil" color="#ffb547" titleId="soleil-titre" sections={SECTIONS} />
      </section>
      <section data-stop="sirius-a">
        <Plate id="sirius-a" stop="sirius-a" name="Sirius A" color="#cfe0ff" titleId="sirius-a-titre" sections={SECTIONS} />
      </section>
    </CardTrack>
  );
  return { store, ui };
}

const plateOf = (name: string) => screen.getByRole("heading", { level: 2, name }).closest("article");

/*
 * Carte fixe du téléphone : une seule plaque se voit, celle de l'escale courante (`data-current`, que lit la feuille de
 * style). Pendant le passage d'une escale à l'autre, aucune : le squelette prend sa place.
 */
describe("CardTrack", () => {
  it("ne devrait marquer aucune plaque au rendu serveur, le parcours partant de l'introduction", () => {
    const { ui } = renderTrack();
    expect(renderToString(ui)).not.toContain("data-current");
  });

  it("devrait marquer la plaque de l'escale au repos, puis aucune en plein vol, puis celle d'arrivée", () => {
    const { store, ui } = renderTrack();
    render(ui);
    expect(plateOf("Soleil")).not.toHaveAttribute("data-current");
    act(() => store.update("sun", "sun", 0));
    expect(plateOf("Soleil")).toHaveAttribute("data-current");
    expect(plateOf("Sirius A")).not.toHaveAttribute("data-current");
    act(() => store.update("sun", "sirius-a", 0.3));
    expect(plateOf("Soleil")).not.toHaveAttribute("data-current");
    expect(plateOf("Sirius A")).not.toHaveAttribute("data-current");
    act(() => store.update("sun", "sirius-a", 0.98));
    expect(plateOf("Sirius A")).toHaveAttribute("data-current");
  });

  /*
   * Saut par une flèche ou un lien : le focus est déjà sur l'escale visée. Sa carte se voit dès le départ, sans
   * squelette ; la carte quittée cède aussitôt.
   */
  it("devrait marquer la carte de l'escale visée dès le départ, sans squelette pendant le vol", () => {
    const { store, ui } = renderTrack();
    const { container } = render(ui);
    act(() => store.update("sun", "sun", 0));
    act(() => store.aim("sirius-a"));
    expect(plateOf("Sirius A")).toHaveAttribute("data-current");
    expect(plateOf("Soleil")).not.toHaveAttribute("data-current");
    act(() => store.update("sun", "sirius-a", 0.5));
    expect(container.querySelector(".plate-skeleton")).not.toHaveAttribute("data-shown");
    expect(plateOf("Sirius A")).toHaveAttribute("data-current");
  });

  /*
   * Squelette du passage : de la taille de la carte repliée, à sa place, décoratif (ni lu ni annoncé). Il ne paraît
   * qu'en plein vol, la carte d'arrivée revient dès le repos.
   */
  it("devrait montrer le squelette décoratif en plein vol seulement", () => {
    const { store, ui } = renderTrack();
    const { container } = render(ui);
    const skeleton = container.querySelector(".plate-skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).not.toHaveAttribute("data-shown");
    act(() => store.update("sun", "sirius-a", 0.3));
    expect(skeleton).toHaveAttribute("data-shown");
    // Aucun texte : rien à lire, rien à annoncer.
    expect(skeleton?.textContent).toBe("");
    act(() => store.update("sirius-a", "sirius-a", 0));
    expect(skeleton).not.toHaveAttribute("data-shown");
    expect(plateOf("Sirius A")).toHaveAttribute("data-current");
  });

  it("ne devrait pas montrer le squelette au rendu serveur", () => {
    const { ui } = renderTrack();
    const html = renderToString(ui);
    expect(html).toContain("plate-skeleton");
    expect(html).not.toContain("data-shown");
  });

  /*
   * La feuille de style n'active la carte fixe qu'une fois le client prêt : avant l'hydratation, ou si le script échoue,
   * la plaque reste entière, visible et lue (aucune n'a encore `data-current`).
   */
  it("devrait activer la carte fixe dans la feuille de style seulement côté client, tant que la requête correspond", () => {
    const turn = stubFixedCard(true);
    const { ui } = renderTrack();
    expect(renderToString(ui)).not.toContain("data-fixed-card");
    expect(fixedCardOn()).toBe(false);
    const { unmount } = render(ui);
    expect(fixedCardOn()).toBe(true);
    turn(false);
    expect(fixedCardOn()).toBe(false);
    turn(true);
    expect(fixedCardOn()).toBe(true);
    unmount();
    expect(fixedCardOn()).toBe(false);
  });

  it("ne devrait pas activer la carte fixe hors de sa requête (grand écran, paysage bas)", () => {
    stubFixedCard(false);
    render(renderTrack().ui);
    expect(fixedCardOn()).toBe(false);
  });

  it("hors de tout suivi, ne devrait marquer aucune plaque", () => {
    render(<Plate id="soleil" stop="sun" name="Soleil" color="#ffb547" titleId="soleil-titre" sections={SECTIONS} />);
    expect(plateOf("Soleil")).not.toHaveAttribute("data-current");
  });
});
