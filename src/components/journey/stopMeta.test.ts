import { describe, expect, it } from "vitest";
import { railDistanceLabel, stopColor, stopName } from "@/components/journey/stopMeta";
import { LOCALES } from "@/i18n/locales";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import { RAIL_STOPS, STOP_ORDER, type StopKey } from "@/lib/journey/camera";

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
      "Groupe local",
      "Univers observable",
      "Multivers",
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

  it.each([
    ["localGroup", "#A9B8E8"],
    ["universe", "#E7A6C1"],
    ["multiverse", "#7FD8C8"],
  ] as const)("devrait donner sa couleur à l'escale %s (%s), contrastée sur le fond de nuit (≥ 3:1)", (key, color) => {
    expect(stopColor(key)).toBe(color);
    expect(contrast(color, "#060B18")).toBeGreaterThanOrEqual(3);
  });
});

/** Luminance relative WCAG d'une couleur #RRGGBB. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Rapport de contraste WCAG entre deux couleurs. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Distance d'un repère de la règle, en UA. */
const railAu = (key: StopKey) => RAIL_STOPS.find((stop) => stop.key === key)?.au ?? Number.NaN;

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

  it("devrait situer le Groupe local par Andromède, en millions d'années-lumière écrits en toutes lettres", () => {
    expect(railDistanceLabel("localGroup", railAu("localGroup"))).toBe("Andromède à 2,5 millions d'al");
  });

  it("devrait donner le rayon de l'Univers observable, en milliards d'années-lumière", () => {
    expect(railDistanceLabel("universe", railAu("universe"))).toBe("rayon de 46 milliards d'al");
  });

  it("devrait présenter le multivers, à l'infini, comme une hypothèse plutôt que par une distance", () => {
    expect(railDistanceLabel("multiverse", railAu("multiverse"))).toBe("hypothèse");
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
      "Local Group",
      "Observable Universe",
      "Multiverse",
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
      "Grupo Local",
      "Universo observable",
      "Multiverso",
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
    ["localGroup", railAu("localGroup"), "Andromeda at 2.5 million ly", "Andrómeda a 2,5 millones de al"],
    ["universe", railAu("universe"), "46 billion ly in radius", "radio de 46 mil millones de al"],
    ["multiverse", railAu("multiverse"), "hypothesis", "hipótesis"],
  ] as const)("devrait situer l'escale %s, à %s UA, dans la langue (« %s », « %s »)", (key, au, en, es) => {
    expect(railDistanceLabel(key, au, "en")).toBe(en);
    expect(railDistanceLabel(key, au, "es")).toBe(es);
  });

  it("devrait garder le français par défaut, tant que la langue reste facultative", () => {
    expect(railDistanceLabel("mars", 1.524)).toBe(railDistanceLabel("mars", 1.524, "fr"));
    expect(stopName("hero")).toBe(stopName("hero", "fr"));
  });
});
