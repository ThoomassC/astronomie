import { afterEach, describe, expect, it } from "vitest";
import { shownJourneyLayout } from "@/components/scene/sceneElements";

afterEach(() => {
  document.body.replaceChildren();
});

/*
 * Next 16 (`cacheComponents`) garde dans le DOM jusqu'à trois pages quittées, masquées par `display: none` : Tailles
 * et le Voyage peuvent y coexister, avec chacun sa barre, sa règle (`#rail`) et ses plaques, et une clé d'escale
 * commune (« sun »). La scène du Voyage ne doit cadrer que sur la page affichée.
 */
describe("shownJourneyLayout", () => {
  function sizesHiddenThenVoyage(): void {
    document.body.innerHTML = `
      <div style="display: none" data-page="tailles">
        <header class="bar" data-owner="tailles"></header>
        <nav id="rail" data-owner="tailles"></nav>
        <main>
          <section data-stop="sun"><article class="plate" data-owner="tailles"></article></section>
          <section data-stop="betelgeuse"><article class="plate" data-owner="tailles"></article></section>
        </main>
      </div>
      <div data-page="voyage">
        <header class="bar" data-owner="voyage"></header>
        <nav id="rail" data-owner="voyage"></nav>
        <main>
          <section data-stop="sun"><article class="plate" data-owner="voyage"></article></section>
          <section data-stop="saturn"><article class="plate" data-owner="voyage"></article></section>
        </main>
        <aside class="scale-note" data-owner="voyage"></aside>
      </div>`;
  }

  it("devrait prendre la barre, la règle et la note d'échelle de la page affichée, pas celles d'une page masquée", () => {
    sizesHiddenThenVoyage();
    const { bar, rail, note } = shownJourneyLayout();
    expect(bar).toHaveAttribute("data-owner", "voyage");
    expect(rail).toHaveAttribute("data-owner", "voyage");
    expect(note).toHaveAttribute("data-owner", "voyage");
  });

  it("devrait ne garder que les plaques de la page affichée, même sous une clé commune aux deux pages (« sun »)", () => {
    sizesHiddenThenVoyage();
    const { plates } = shownJourneyLayout();
    expect([...plates.keys()]).toEqual(["sun", "saturn"]);
    expect(plates.get("sun")).toHaveAttribute("data-owner", "voyage");
  });

  /*
   * Sur un écran bas ou étroit, la feuille de style masque la règle (la liste des escales la remplace) : elle reste
   * pourtant celle de la page affichée, et la scène en déduit que la zone libre va jusqu'au bord de l'écran.
   */
  it("devrait garder la règle et la note de la page affichée, même masquées par la feuille de style", () => {
    document.body.innerHTML = `
      <style>#rail, .scale-note { display: none; }</style>
      <div data-page="voyage">
        <nav id="rail" data-owner="voyage"></nav>
        <aside class="scale-note" data-owner="voyage"></aside>
      </div>`;
    const { rail, note } = shownJourneyLayout();
    expect(rail).toHaveAttribute("data-owner", "voyage");
    expect(note).toHaveAttribute("data-owner", "voyage");
  });

  it("devrait ignorer une note d'échelle restée dans une page masquée", () => {
    document.body.innerHTML = `<div style="display: none"><aside class="scale-note"></aside></div>`;
    expect(shownJourneyLayout().note).toBeNull();
  });

  it("devrait ignorer les escales qui ne sont pas celles du Voyage", () => {
    document.body.innerHTML = `<section data-stop="betelgeuse"><article class="plate"></article></section>`;
    expect(shownJourneyLayout().plates.size).toBe(0);
  });

  it("devrait se passer de barre, de règle et de note quand la page n'en a pas", () => {
    expect(shownJourneyLayout()).toEqual({ bar: null, rail: null, note: null, plates: new Map(), obstacles: [] });
  });

  /*
   * Les étiquettes de la scène ne se posent ni sur la règle ni dans les fondus sous la barre et sous le dock, où leur
   * texte serait voilé : ce sont les obstacles de la page affichée, mesurés par le moteur (boîte vide quand la feuille de
   * style masque un fondu).
   */
  it("devrait donner pour obstacles la règle et les deux fondus de la page affichée, pas ceux d'une page masquée", () => {
    document.body.innerHTML = `
      <div style="display: none" data-page="voyage-quitte">
        <nav id="rail" data-owner="ancienne"></nav>
        <div class="bar-fade" data-owner="ancienne"></div>
        <div class="dock-fade" data-owner="ancienne"></div>
      </div>
      <div data-page="voyage">
        <nav id="rail" data-owner="voyage"></nav>
        <div class="bar-fade" data-owner="voyage"></div>
        <div class="dock-fade" data-owner="voyage"></div>
      </div>`;
    const { obstacles } = shownJourneyLayout();
    expect(obstacles.map((element) => [element.id || element.className, element.getAttribute("data-owner")])).toEqual([
      ["rail", "voyage"],
      ["bar-fade", "voyage"],
      ["dock-fade", "voyage"],
    ]);
  });
});
