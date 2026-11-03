import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StarPlate } from "@/components/sizes/StarPlate";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";

afterEach(() => {
  cleanup();
});

/*
 * Plaque d'une étoile de la page « Tailles » (composant serveur, langue en prop), fiche du design v2 § 4.4. Les
 * valeurs viennent des données : Bételgeuse 764 R☉ (fourchette 640 à 1 010), 3 600 K, 548 al ; le Soleil 1 R☉, 5 772 K.
 */

/** Étoile des données, par sa clé. */
function star(key: SizeStarKey): ComparedStar {
  const found = COMPARED_STARS.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Étoile absente des données : ${key}`);
  return found;
}

/** Valeur (dd) du fait de la fiche dont le libellé (dt) est `label`. */
function fact(label: string): HTMLElement {
  const value = screen.getByText(label, { selector: "dt" }).nextElementSibling;
  if (!(value instanceof HTMLElement) || value.tagName !== "DD") throw new Error(`Aucune valeur pour « ${label} »`);
  return value;
}

/** Paragraphe dont tout le texte vaut `text` (le rang mêle texte et exposant). */
const paragraph = (text: string) => screen.getByText((_, element) => element?.tagName === "P" && element.textContent === text);

/** Réglette des températures : décorative, elle porte les mots de ses deux bouts. */
const thermometer = (cooler: string) => {
  const scale = screen.getByText(cooler).closest<HTMLElement>('[aria-hidden="true"]');
  if (!scale) throw new Error("Réglette absente ou lue par les lecteurs d'écran");
  return scale;
};

describe("StarPlate de Bételgeuse, en anglais", () => {
  const renderBetelgeuse = () => render(<StarPlate star={star("betelgeuse")} locale="en" />);

  it("devrait poser la section à l'ancre #betelgeuse, avec sa clé d'escale, nommée par son titre", () => {
    renderBetelgeuse();
    const section = screen.getByRole("region", { name: "Betelgeuse" });
    expect(section).toHaveAttribute("id", "betelgeuse");
    expect(section).toHaveAttribute("data-stop", "betelgeuse");
    expect(screen.getByRole("heading", { level: 2, name: "Betelgeuse" })).toBeInTheDocument();
  });

  it("devrait dire son rang parmi les quatorze astres et sa catégorie au-dessus du nom (« 11th of 14 · red supergiant »)", () => {
    renderBetelgeuse();
    expect(paragraph("11th of 14 · red supergiant")).toBeInTheDocument();
  });

  it.each([
    ["Radius", "764 R☉"],
    ["Radius", "531,500,000 km"],
    ["Star type", "red supergiant"],
    ["Star type", "M1–M2Ia–ab"],
    ["Surface temperature", "3,600 K"],
    ["Surface temperature", "orange, cooler than the Sun (5,772 K)"],
    ["Distance from Earth", "548 light-years"],
    ["For scale", "In the Sun's place, its surface would reach beyond the orbit of Mars."],
  ])("devrait donner dans la fiche, au fait « %s » : %s", (label, value) => {
    renderBetelgeuse();
    expect(fact(label)).toHaveTextContent(value);
  });

  it("devrait citer la fourchette publiée sous le rayon retenu", () => {
    renderBetelgeuse();
    expect(within(fact("Radius")).getByText("640–1,010 R☉, depending on the study")).toBeInTheDocument();
  });

  it("devrait placer l'étoile sur la réglette des températures, décorative, avec le repère du Soleil", () => {
    renderBetelgeuse();
    const scale = thermometer("cooler");
    expect(within(scale).getByText("hotter")).toBeInTheDocument();
    expect(within(scale).getByText("Sun")).toBeInTheDocument();
  });

  it("devrait mettre en garde sur le rayon débattu, puis citer les sources des valeurs", () => {
    renderBetelgeuse();
    expect(screen.getByText("Its size depends on its distance, which is still debated.")).toBeInTheDocument();
    expect(screen.getByText("Sources: Joyce et al. 2020, Levesque & Massey 2020, Harper et al. 2017.")).toBeInTheDocument();
  });

  it("devrait faire suivre le bouton de la fiche du nom de l'étoile, pour les lecteurs d'écran", () => {
    renderBetelgeuse();
    expect(screen.getByRole("button", { name: "Read the fact sheet, Betelgeuse" })).toBeInTheDocument();
  });

  it("ne devrait proposer aucun lien de retour quand la page n'en donne pas", () => {
    renderBetelgeuse();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("StarPlate de Bételgeuse, en espagnol", () => {
  it.each([
    ["Radio", "764 R☉"],
    ["Radio", "531.500.000 km"],
    ["Tipo", "supergigante roja"],
    ["Temperatura de la superficie", "3600 K"],
    ["Temperatura de la superficie", "anaranjada, más fría que el Sol (5772 K)"],
    ["Distancia a la Tierra", "548 años luz"],
    ["Para comparar", "En el lugar del Sol, su superficie llegaría más allá de la órbita de Marte."],
  ])("devrait donner dans la fiche, au fait « %s » : %s", (label, value) => {
    render(<StarPlate star={star("betelgeuse")} locale="es" />);
    expect(fact(label)).toHaveTextContent(value);
  });

  it("devrait écrire le rang à l'espagnole, au féminin (« 11.ª de 14 · supergigante roja »)", () => {
    render(<StarPlate star={star("betelgeuse")} locale="es" />);
    expect(paragraph("11.ª de 14 · supergigante roja")).toBeInTheDocument();
  });

  it("devrait nommer Sirius A de son nom espagnol officiel, Sirio A", () => {
    render(<StarPlate star={star("sirius-a")} locale="es" />);
    expect(screen.getByRole("heading", { level: 2, name: "Sirio A" })).toBeInTheDocument();
  });
});

describe("StarPlate du Soleil, en français", () => {
  const renderSun = () => render(<StarPlate star={star("sun")} locale="fr" />);

  it("devrait poser la section à l'ancre #soleil, avec la clé d'escale « sun », au 3ᵉ rang", () => {
    renderSun();
    const section = screen.getByRole("region", { name: "Soleil" });
    expect(section).toHaveAttribute("id", "soleil");
    expect(section).toHaveAttribute("data-stop", "sun");
    expect(paragraph("3e sur 14 · naine jaune")).toBeInTheDocument();
  });

  it.each([
    ["Rayon", "1 R☉"],
    ["Rayon", "695\u202f700 km"],
    ["Type", "naine jaune"],
    ["Type", "G2V"],
    ["Température de surface", "5\u202f772 K"],
    ["Température de surface", "blanche, notre référence"],
    ["Distance de la Terre", "8,3 minutes-lumière"],
    ["Pour comparer", "Il faudrait environ 109 Terres côte à côte pour égaler son diamètre."],
  ])("devrait donner dans la fiche, au fait « %s » : %s", (label, value) => {
    renderSun();
    expect(fact(label)).toHaveTextContent(value, { normalizeWhitespace: false });
  });

  it("ne devrait ni donner de fourchette ni mettre en garde quand le rayon n'est pas débattu", () => {
    const { container } = renderSun();
    expect(within(fact("Rayon")).queryByText(/selon les études/)).toBeNull();
    expect(container.querySelector(".fact-caveat")).toBeNull();
  });

  it("ne devrait pas poser le repère du Soleil sur sa propre réglette", () => {
    renderSun();
    expect(within(thermometer("plus froide")).queryByText("Soleil")).toBeNull();
  });
});

describe("StarPlate, arrondis et lien de retour", () => {
  it("devrait arrondir le rayon en kilomètres à quatre chiffres significatifs (Proxima : 107 138 → 107 100 km)", () => {
    render(<StarPlate star={star("proxima-centauri")} locale="fr" />);
    expect(fact("Rayon")).toHaveTextContent("107\u202f100 km", { normalizeWhitespace: false });
  });

  it("devrait écrire avec une décimale les distances de moins de 10 années-lumière (Proxima : 4,2)", () => {
    render(<StarPlate star={star("proxima-centauri")} locale="fr" />);
    expect(fact("Distance de la Terre")).toHaveTextContent("4,2 années-lumière");
  });

  it("devrait proposer de revenir au plus petit astre quand la page le demande", () => {
    render(<StarPlate star={star("vy-canis-majoris")} locale="fr" restartTo="cygnus-x-1" />);
    expect(screen.getByRole("link", { name: "Revenir au plus petit" })).toHaveAttribute("href", "#cygnus-x-1");
  });
});
