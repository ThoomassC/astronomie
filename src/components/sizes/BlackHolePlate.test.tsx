import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BlackHolePlate } from "@/components/sizes/BlackHolePlate";
import { COMPARED_BLACK_HOLE_BY_KEY } from "@/lib/astro/blackHoles";

afterEach(() => {
  cleanup();
});

/*
 * Plaque d'un trou noir de la page « Tailles » (composant serveur, langue en prop), sur le squelette de celle des
 * étoiles : rang et catégorie, nom, accroche ; fiche (ombre, horizon, masse, type, distance, comparaison), mise en
 * garde, ce que la vue simplifie, sources. Valeurs des données : M87* 6,5 milliards de M☉ à 55 millions d'al.
 */

/** Valeur (dd) du fait de la fiche dont le libellé (dt) est `label`. */
function fact(label: string): HTMLElement {
  const value = screen.getByText(label, { selector: "dt" }).nextElementSibling;
  if (!(value instanceof HTMLElement) || value.tagName !== "DD") throw new Error(`Aucune valeur pour « ${label} »`);
  return value;
}

/** Paragraphe dont tout le texte vaut `text` (le rang mêle texte et exposant). */
const paragraph = (text: string) => screen.getByText((_, element) => element?.tagName === "P" && element.textContent === text);

describe("BlackHolePlate de M87*, en anglais", () => {
  const renderM87 = () => render(<BlackHolePlate hole={COMPARED_BLACK_HOLE_BY_KEY["m87-star"]} locale="en" />);

  it("devrait poser la section à l'ancre #m87-etoile, avec sa clé d'escale, nommée par son titre", () => {
    renderM87();
    const section = screen.getByRole("region", { name: "M87*" });
    expect(section).toHaveAttribute("id", "m87-etoile");
    expect(section).toHaveAttribute("data-stop", "m87-star");
    expect(screen.getByRole("heading", { level: 2, name: "M87*" })).toBeInTheDocument();
  });

  it("devrait dire son rang parmi les quatorze astres et sa catégorie (« 13th of 14 · supermassive black hole »)", () => {
    renderM87();
    expect(paragraph("13th of 14 · supermassive black hole")).toBeInTheDocument();
  });

  it.each([
    ["Shadow radius", "72,000 R☉"],
    ["Shadow radius", "50 billion km"],
    ["Event horizon radius", "28,000 R☉"],
    ["Event horizon radius", "19 billion km"],
    ["Mass", "6.5 billion solar masses"],
    ["Mass", "5.4–7.2 billion solar masses, depending on the study"],
    ["Black hole type", "supermassive black hole"],
    ["Distance from Earth", "55 million light-years"],
    ["For scale", "In the Sun's place, its shadow would swallow the whole Solar System, out to 11 times Neptune's orbit."],
  ])("devrait donner dans la fiche, au fait « %s » : %s", (label, value) => {
    renderM87();
    expect(fact(label)).toHaveTextContent(value);
  });

  it("devrait mettre en garde sur la masse débattue, dire que le rendu est calculé, en fausses couleurs, puis citer les sources", () => {
    const { container } = renderM87();
    const lines = Array.from(container.querySelectorAll(".fact-caveat, .fact-source"), (line) => line.textContent);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^Its mass depends on the method/);
    expect(lines[1]).toMatch(/^Computed rendering: .*false colours/);
    expect(lines[2]).toBe("Sources: EHT Collaboration 2019, Liepold et al. 2023.");
  });

  it("devrait faire suivre le bouton de la fiche du nom du trou noir, pour les lecteurs d'écran", () => {
    renderM87();
    expect(screen.getByRole("button", { name: "Read the fact sheet, M87*" })).toBeInTheDocument();
  });

  it("ne devrait proposer aucun lien de retour quand la page n'en donne pas", () => {
    renderM87();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("BlackHolePlate de Cygnus X-1, en français", () => {
  const renderCygnus = () => render(<BlackHolePlate hole={COMPARED_BLACK_HOLE_BY_KEY["cygnus-x-1"]} locale="fr" />);

  it("devrait accorder son rang au masculin : « 1er sur 14 · trou noir stellaire »", () => {
    renderCygnus();
    expect(paragraph("1er sur 14 · trou noir stellaire")).toBeInTheDocument();
  });

  it.each([
    ["Rayon de l'ombre", "163 km"],
    ["Rayon de l'ombre", "0,000234 R☉"],
    ["Rayon de l'horizon", "62,6 km"],
    ["Rayon de l'horizon", "0,0000900 R☉"],
    ["Masse", "21,2 masses solaires"],
    ["Masse", "de 12,7 à 23,4 masses solaires selon les études"],
    ["Distance de la Terre", "7\u202f200 années-lumière"],
    ["Pour comparer", "Son ombre ne mesure qu'environ 330 km de diamètre."],
  ])("devrait donner en kilomètres les tailles d'un trou noir minuscule, puis en R☉ (« %s » : %s)", (label, value) => {
    renderCygnus();
    expect(fact(label)).toHaveTextContent(value, { normalizeWhitespace: false });
  });
});

describe("BlackHolePlate, distance cosmologique, mise en garde et lien de retour", () => {
  it("devrait dire, sous la distance du Fer à cheval cosmique, depuis quand voyage sa lumière (es)", () => {
    render(<BlackHolePlate hole={COMPARED_BLACK_HOLE_BY_KEY["cosmic-horseshoe"]} locale="es" />);
    const distance = fact("Distancia a la Tierra");
    expect(distance).toHaveTextContent("5,7 mil millones de años luz");
    expect(within(distance).getByText("luz que partió hace 4,8 mil millones de años")).toBeInTheDocument();
  });

  it("ne devrait ni donner de fourchette ni mettre en garde quand la masse n'est pas débattue (Sagittarius A*)", () => {
    const { container } = render(<BlackHolePlate hole={COMPARED_BLACK_HOLE_BY_KEY["sagittarius-a-star"]} locale="fr" />);
    expect(within(fact("Masse")).queryByText(/selon les études/)).toBeNull();
    expect(Array.from(container.querySelectorAll(".fact-caveat"), (line) => line.textContent)).toEqual([
      expect.stringMatching(/^Rendu calculé/),
    ]);
  });

  it("devrait proposer de revenir au plus petit astre quand la page le demande", () => {
    render(<BlackHolePlate hole={COMPARED_BLACK_HOLE_BY_KEY["cosmic-horseshoe"]} locale="fr" restartTo="cygnus-x-1" />);
    expect(screen.getByRole("link", { name: "Revenir au plus petit" })).toHaveAttribute("href", "#cygnus-x-1");
  });
});
