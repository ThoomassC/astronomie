import { afterEach, describe, expect, it } from "vitest";
import { shownSceneLayout } from "@/components/sizes/sceneElements";

afterEach(() => {
  document.body.replaceChildren();
});

/*
 * Next 16 (`cacheComponents`) garde dans le DOM jusqu'à trois pages quittées, masquées par `display: none` : le
 * Voyage et Tailles peuvent y coexister, avec chacun sa barre, sa règle (`#rail`) et ses plaques, et une clé d'escale
 * commune (« sun »). La scène de Tailles ne doit cadrer que sur la page affichée.
 */
describe("shownSceneLayout", () => {
  function voyageHiddenThenSizes(): void {
    document.body.innerHTML = `
      <div style="display: none" data-page="voyage">
        <header class="bar" data-owner="voyage"></header>
        <nav id="rail" data-owner="voyage"></nav>
        <main>
          <section data-stop="intro" data-owner="voyage"><h1>Une introduction masquée</h1></section>
          <section data-stop="sun"><article class="plate" data-owner="voyage"></article></section>
          <section data-stop="saturn"><article class="plate" data-owner="voyage"></article></section>
        </main>
      </div>
      <div data-page="tailles">
        <header class="bar" data-owner="tailles"></header>
        <nav id="rail" data-owner="tailles"></nav>
        <main>
          <section data-stop="intro" data-owner="tailles"><h1>Étoiles et trous noirs</h1></section>
          <section data-stop="sun"><article class="plate" data-owner="tailles"></article></section>
          <section data-stop="betelgeuse"><article class="plate" data-owner="tailles"></article></section>
        </main>
      </div>`;
  }

  it("devrait prendre la barre et la règle de la page affichée, pas celles du Voyage masqué", () => {
    voyageHiddenThenSizes();
    const { bar, rail } = shownSceneLayout();
    expect(bar).toHaveAttribute("data-owner", "tailles");
    expect(rail).toHaveAttribute("data-owner", "tailles");
  });

  it("devrait garder la règle de la page affichée, même masquée par la feuille de style (écran bas ou étroit)", () => {
    document.body.innerHTML = `
      <style>#rail { display: none; }</style>
      <div data-page="tailles"><nav id="rail" data-owner="tailles"></nav></div>`;
    expect(shownSceneLayout().rail).toHaveAttribute("data-owner", "tailles");
  });

  it("devrait ne garder que les plaques de la page affichée, même sous une clé commune aux deux pages (« sun »)", () => {
    voyageHiddenThenSizes();
    const { plates } = shownSceneLayout();
    expect([...plates.keys()]).toEqual(["sun", "betelgeuse"]);
    expect(plates.get("sun")).toHaveAttribute("data-owner", "tailles");
  });

  it("devrait ignorer les escales qui ne sont pas des tailles", () => {
    document.body.innerHTML = `<section data-stop="saturn"><article class="plate"></article></section>`;
    expect(shownSceneLayout().plates.size).toBe(0);
  });

  /*
   * Le texte de l'introduction passe devant la scène : ses étiquettes ne s'affichent pas dessous. Celle d'une page
   * masquée, plus haut dans le document, n'y est pour rien.
   */
  it("devrait prendre l'introduction de la page affichée, pas celle d'une page masquée", () => {
    voyageHiddenThenSizes();
    expect(shownSceneLayout().intro).toHaveAttribute("data-owner", "tailles");
  });

  it("devrait se passer de barre, de règle et d'introduction quand la page n'en a pas", () => {
    expect(shownSceneLayout()).toEqual({ bar: null, rail: null, intro: null, plates: new Map() });
  });
});
