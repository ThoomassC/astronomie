import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CosmicPlate } from "@/components/journey/CosmicPlate";
import { COSMIC_STOPS } from "@/content/cosmos";
import { NEARBY_STARS } from "@/lib/astro/stars";

afterEach(() => {
  cleanup();
});

/*
 * La plaque lit la liste des étoiles dans le fichier de données (pas d'injection possible) :
 * les attentes du tableau se règlent sur NEARBY_STARS.
 */

describe("CosmicPlate des étoiles voisines", () => {
  const renderStars = () => render(<CosmicPlate stop={COSMIC_STOPS.stars} sunHref="#soleil" starList />);

  /** Lignes de données du tableau des étoiles (sans la ligne d'en-tête), cellule par cellule. */
  function starRows(): string[][] {
    const [, ...rows] = within(screen.getByRole("table")).getAllByRole("row") as HTMLTableRowElement[];
    return rows.map((row) => Array.from(row.cells, (cell) => cell.textContent?.trim() ?? ""));
  }

  it("devrait poser la section de l'escale « stars » à l'ancre #etoiles-voisines, nommée par son titre", () => {
    renderStars();
    const section = screen.getByRole("region", { name: "Les étoiles voisines" });
    expect(section).toHaveAttribute("id", "etoiles-voisines");
    expect(section).toHaveAttribute("data-stop", "stars");
    expect(screen.getByRole("heading", { level: 2, name: "Les étoiles voisines" })).toBeInTheDocument();
  });

  it("devrait présenter la fiche en couples terme / définition", () => {
    renderStars();
    const terms = screen.getAllByRole("term");
    expect(terms.length).toBeGreaterThan(0);
    expect(screen.getAllByRole("definition")).toHaveLength(terms.length);
  });

  it("devrait proposer de revenir au Soleil", () => {
    renderStars();
    expect(screen.getByRole("link", { name: "Revenir au Soleil" })).toHaveAttribute("href", "#soleil");
  });

  it("devrait légender le tableau des étoiles (nom accessible)", () => {
    renderStars();
    expect(screen.getByRole("table")).toHaveAccessibleName();
  });

  it("devrait lister une ligne par étoile de la carte, sous une ligne d'en-tête", () => {
    renderStars();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(NEARBY_STARS.length + 1);
  });

  it("devrait nommer chaque étoile de la carte dans la première colonne", () => {
    renderStars();
    const names = starRows().map(([name]) => name);
    expect(names).toEqual(expect.arrayContaining(NEARBY_STARS.map((star) => expect.stringContaining(star.name))));
  });

  it("devrait donner chaque distance en années-lumière, à une décimale (« 4,2 al »)", () => {
    renderStars();
    const distances = starRows().map(([, distance]) => distance);
    expect(distances).toEqual(NEARBY_STARS.map(() => expect.stringMatching(/^\d+,\d\sal$/)));
  });
});

describe("CosmicPlate de la Voie lactée", () => {
  it("devrait poser la section de l'escale « galaxy » à l'ancre #voie-lactee, sans tableau d'étoiles", () => {
    render(<CosmicPlate stop={COSMIC_STOPS.galaxy} sunHref="#soleil" />);
    const section = screen.getByRole("region", { name: "La Voie lactée" });
    expect(section).toHaveAttribute("id", "voie-lactee");
    expect(section).toHaveAttribute("data-stop", "galaxy");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
