import { describe, expect, it } from "vitest";
import { railDistanceLabel, stopColor, stopName } from "@/components/journey/stopMeta";
import { LOCALES } from "@/i18n/locales";
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

describe("stopName dans les trois langues", () => {
  it.each(LOCALES)("devrait donner à chaque escale un nom affichable et distinct (%s)", (locale) => {
    const names = STOP_ORDER.map((key) => stopName(key, locale));
    expect(names.every((name) => name.trim() !== "")).toBe(true);
    expect(new Set(names).size).toBe(STOP_ORDER.length);
  });

  it("devrait nommer les escales en anglais, dans l'ordre du voyage", () => {
    expect(STOP_ORDER.map((key) => stopName(key, "en"))).toEqual([
      "Overview",
      "Sun",
      "Mercury",
      "Venus",
      "Earth",
      "Mars",
      "Asteroids",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Beyond",
      "Nearby stars",
      "Milky Way",
    ]);
  });

  it("devrait nommer les escales en espagnol, dans l'ordre du voyage", () => {
    expect(STOP_ORDER.map((key) => stopName(key, "es"))).toEqual([
      "Vista general",
      "Sol",
      "Mercurio",
      "Venus",
      "Tierra",
      "Marte",
      "Asteroides",
      "Júpiter",
      "Saturno",
      "Urano",
      "Neptuno",
      "Más allá",
      "Estrellas vecinas",
      "Vía Láctea",
    ]);
  });
});

describe("railDistanceLabel en anglais et en espagnol", () => {
  it.each([
    ["sun", 0, "the centre", "el centro"],
    ["belt", 2.7, "2.1 to 3.3 AU", "de 2,1 a 3,3 UA"],
    ["beyond", 45, "over 30 AU", "más de 30 UA"],
    ["earth", 1, "1 AU", "1 UA"],
    ["mars", 1.524, "1.52 AU", "1,52 UA"],
    ["neptune", 30.07, "30.1 AU", "30,1 UA"],
    ["stars", 4.2465 * AU_PER_LY, "from 4.2 ly", "desde 4,2 al"],
    ["galaxy", 27_000 * AU_PER_LY, "centre at 27,000 ly", "centro a 27.000 al"],
  ] as const)("devrait situer l'escale %s, à %s UA, dans la langue (« %s », « %s »)", (key, au, en, es) => {
    expect(railDistanceLabel(key, au, "en")).toBe(en);
    expect(railDistanceLabel(key, au, "es")).toBe(es);
  });

  it("devrait garder le français par défaut, tant que la langue reste facultative", () => {
    expect(railDistanceLabel("mars", 1.524)).toBe(railDistanceLabel("mars", 1.524, "fr"));
    expect(stopName("hero")).toBe(stopName("hero", "fr"));
  });
});
