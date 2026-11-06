import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { CardTrack } from "@/components/journey/CardTrack";
import { Plate, type PlateSection } from "@/components/journey/Plate";
import { createStopStore } from "@/lib/journey/store";

type Key = "intro" | "sun" | "sirius-a";

const SECTIONS: readonly PlateSection[] = [{ key: "fiche", label: "Lire la fiche", icon: "story", content: <p>Fiche</p> }];

afterEach(cleanup);

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

  it("hors de tout suivi, ne devrait marquer aucune plaque", () => {
    render(<Plate id="soleil" stop="sun" name="Soleil" color="#ffb547" titleId="soleil-titre" sections={SECTIONS} />);
    expect(plateOf("Soleil")).not.toHaveAttribute("data-current");
  });
});
