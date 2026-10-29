import { describe, expect, it } from "vitest";
import { railDistanceLabel, stopColor, stopName } from "@/components/journey/stopMeta";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import { STOP_ORDER } from "@/lib/journey/camera";

/** Unités astronomiques par année-lumière (UAI). */
const AU_PER_LY = 63_241.077;

describe("stopName", () => {
  it.each(STOP_ORDER)("devrait donner un nom affichable à l'escale %s", (key) => {
    expect(stopName(key).trim()).not.toBe("");
  });

  it("devrait nommer les escales en français, dans l'ordre du voyage", () => {
    expect(STOP_ORDER.map((key) => stopName(key))).toEqual([
      "Vue d'ensemble",
      "Soleil",
      "Mercure",
      "Vénus",
      "Terre",
      "Mars",
      "Astéroïdes",
      "Jupiter",
      "Saturne",
      "Uranus",
      "Neptune",
      "Au-delà",
      "Étoiles voisines",
      "Voie lactée",
    ]);
  });

  it("devrait donner un nom différent à chaque escale", () => {
    const names = STOP_ORDER.map((key) => stopName(key));
    expect(new Set(names).size).toBe(STOP_ORDER.length);
  });
});

describe("stopColor", () => {
  it.each(STOP_ORDER)("devrait donner une couleur hexadécimale #RRGGBB à l'escale %s", (key) => {
    expect(stopColor(key)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("devrait reprendre la couleur de la planète pour une escale planétaire", () => {
    expect(stopColor("mars")).toBe(PLANET_BY_KEY.mars.color);
  });

  it("devrait distinguer chaque escale par sa propre couleur", () => {
    const colors = STOP_ORDER.map((key) => stopColor(key).toUpperCase());
    expect(new Set(colors).size).toBe(STOP_ORDER.length);
  });
});

describe("railDistanceLabel", () => {
  it.each([["hero"], ["sun"]] as const)("devrait dire « le centre » quand la distance est nulle (%s)", (key) => {
    expect(railDistanceLabel(key, 0)).toBe("le centre");
  });

  it("devrait donner l'étendue de la ceinture plutôt qu'une distance unique", () => {
    expect(railDistanceLabel("belt", 2.7)).toBe("2,1 à 3,3 UA");
  });

  it("devrait situer l'au-delà après Neptune", () => {
    expect(railDistanceLabel("beyond", 45)).toBe("plus de 30 UA");
  });

  it.each([
    ["mercury", 0.387],
    ["jupiter", 5.2],
    ["neptune", 30.07],
  ] as const)("devrait écrire la distance de %s en UA avec une virgule décimale", (key, au) => {
    expect(railDistanceLabel(key, au)).toMatch(/^\d+,\d+ UA$/);
  });

  it("devrait écrire une distance entière sans décimales, comme la fiche (la Terre à 1 UA)", () => {
    expect(railDistanceLabel("earth", 1)).toBe("1 UA");
  });

  it("devrait situer les étoiles voisines à partir de Proxima du Centaure, en années-lumière à une décimale", () => {
    expect(railDistanceLabel("stars", 4.2465 * AU_PER_LY)).toBe("dès 4,2 al");
  });

  it("devrait situer la Voie lactée par la distance de son centre, en années-lumière entières", () => {
    // formatNumber sépare les milliers par une espace fine insécable (U+202F).
    expect(railDistanceLabel("galaxy", 27_000 * AU_PER_LY)).toBe("centre à 27\u202f000 al");
  });
});
