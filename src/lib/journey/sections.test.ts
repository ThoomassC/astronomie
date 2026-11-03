import { describe, expect, it } from "vitest";
import {
  clampToRest,
  restProgress,
  restRange,
  scrollState,
  sectionRanges,
  smootherstep,
  type SectionRange,
} from "@/lib/journey/sections";

describe("smootherstep", () => {
  it.each([
    [0, 0],
    [0.25, 0.103515625],
    [0.5, 0.5],
    [0.75, 0.896484375],
    [1, 1],
  ])("devrait suivre 6t⁵ − 15t⁴ + 10t³ (t = %f → %f)", (t, expected) => {
    expect(smootherstep(t)).toBeCloseTo(expected, 12);
  });

  it.each([
    [-0.5, 0],
    [1.5, 1],
  ])("devrait borner t à [0, 1] (t = %f → %f)", (t, expected) => {
    expect(smootherstep(t)).toBeCloseTo(expected, 12);
  });
});

describe("restRange", () => {
  it("devrait poser la caméra dès que la section arrive à 12 % du haut, jusqu'à ce que son bas atteigne le bas de l'écran", () => {
    expect(restRange({ top: 2000, height: 1340 }, 812)).toEqual({ arrive: 2000 - 0.12 * 812, depart: 2000 + 1340 - 812 });
  });

  it("ne devrait jamais partir avant d'être arrivée (section plus courte que l'écran)", () => {
    const range = restRange({ top: 2000, height: 300 }, 812);
    expect(range.depart).toBe(range.arrive);
  });
});

describe("clampToRest", () => {
  /** Vue de 800 px : caméra posée de 1904 (arrivée) à 2600 px de défilement (départ). */
  const BOX = { top: 2000, height: 1400 };

  it("devrait laisser tel quel un défilement déjà dans la plage de repos", () => {
    expect(clampToRest(2300, BOX, 800)).toBe(2300);
  });

  it("devrait s'arrêter au départ plutôt que de lancer le vol vers l'escale suivante", () => {
    expect(clampToRest(3000, BOX, 800)).toBe(2600);
  });

  it("devrait viser 2 px après l'arrivée, comme la navigation, plutôt que le vol précédent", () => {
    expect(clampToRest(100, BOX, 800)).toBe(1906);
  });

  it("devrait viser un pixel entier sous un départ fractionnaire (le navigateur arrondit le défilement)", () => {
    expect(clampToRest(3000, { top: 2000.4, height: 1400 }, 800)).toBe(2600);
  });

  it("devrait viser 2 px après l'arrivée quand la section est trop courte pour un repos", () => {
    expect(clampToRest(2500, { top: 2000, height: 500 }, 800)).toBe(1906);
  });
});

describe("restProgress", () => {
  const RANGE: SectionRange = { key: "mars", arrive: 1000, depart: 1600 };

  it("devrait aller de 0 à l'arrivée à 1 au départ", () => {
    expect(restProgress(RANGE, 1000)).toBe(0);
    expect(restProgress(RANGE, 1300)).toBe(0.5);
    expect(restProgress(RANGE, 1600)).toBe(1);
  });

  it("devrait rester borné avant l'arrivée et après le départ", () => {
    expect(restProgress(RANGE, 900)).toBe(0);
    expect(restProgress(RANGE, 1700)).toBe(1);
  });

  it("devrait valoir 1 pour une section sans repos (départ dès l'arrivée)", () => {
    expect(restProgress({ key: "mars", arrive: 1000, depart: 1000 }, 1000)).toBe(1);
  });
});

describe("sectionRanges", () => {
  const HERO = { key: "hero", top: 0, height: 900 } as const;
  const SUN = { key: "sun", top: 900, height: 1500 } as const;

  it("devrait faire arriver la première section à 0 et les suivantes 12 % de vue avant leur haut", () => {
    expect(sectionRanges([HERO, SUN], 800)).toEqual([
      { key: "hero", arrive: 0, depart: 100 },
      { key: "sun", arrive: expect.closeTo(804, 9), depart: 1600 },
    ]);
  });

  it("devrait repartir dès l'arrivée quand la section est plus courte que la vue", () => {
    const [, , short] = sectionRanges([HERO, SUN, { key: "mercury", top: 2400, height: 500 }], 800);
    expect(short).toEqual({ key: "mercury", arrive: expect.closeTo(2304, 9), depart: expect.closeTo(2304, 9) });
  });

  it("devrait faire arriver la première section à 0 même quand elle ne commence pas en haut du document", () => {
    expect(sectionRanges([{ key: "hero", top: 120, height: 900 }], 800)).toEqual([
      { key: "hero", arrive: 0, depart: 220 },
    ]);
  });

  it("devrait renvoyer une liste vide quand il n'y a aucune section", () => {
    expect(sectionRanges([], 800)).toEqual([]);
  });

  it("devrait garder les clés de la page, quelles qu'elles soient (« intro », « sun »)", () => {
    const ranges: SectionRange<"intro" | "sun">[] = sectionRanges(
      [
        { key: "intro", top: 0, height: 900 },
        { key: "sun", top: 900, height: 1500 },
      ],
      800,
    );
    expect(ranges).toEqual([
      { key: "intro", arrive: 0, depart: 100 },
      { key: "sun", arrive: expect.closeTo(804, 9), depart: 1600 },
    ]);
  });
});

describe("scrollState", () => {
  const RANGES: readonly SectionRange[] = [
    { key: "hero", arrive: 0, depart: 100 },
    { key: "sun", arrive: 804, depart: 1600 },
  ];

  it.each([[-40], [50], [100]])("devrait rester au repos sur la première escale quand y = %f ≤ depart", (y) => {
    expect(scrollState(RANGES, y)).toEqual({ from: 0, to: 0, t: 0 });
  });

  it("devrait voler à mi-chemin vers l'escale suivante quand y est au milieu de l'intervalle depart → arrive", () => {
    expect(scrollState(RANGES, 452)).toEqual({ from: 0, to: 1, t: 0.5 });
  });

  it("devrait commencer le vol dès que y dépasse depart", () => {
    expect(scrollState(RANGES, 101)).toEqual({ from: 0, to: 1, t: expect.closeTo(1 / 704, 12) });
  });

  it.each([[804], [900], [5000]])("devrait être au repos sur la dernière escale quand y = %f ≥ son arrivée", (y) => {
    expect(scrollState(RANGES, y)).toEqual({ from: 1, to: 1, t: 0 });
  });

  it("devrait voler depuis une escale intermédiaire vers la suivante", () => {
    const three: SectionRange[] = [...RANGES, { key: "mercury", arrive: 2304, depart: 2304 }];
    expect(scrollState(three, 1952)).toEqual({ from: 1, to: 2, t: 0.5 });
  });

  it("devrait diviser par au moins 1 px quand deux escales sont séparées de moins d'un pixel", () => {
    const tight: SectionRange[] = [
      { key: "hero", arrive: 0, depart: 100 },
      { key: "sun", arrive: 100.5, depart: 300 },
    ];
    expect(scrollState(tight, 100.25)).toEqual({ from: 0, to: 1, t: expect.closeTo(0.25, 12) });
  });

  it("devrait renvoyer {0, 0, 0} quand la liste est vide", () => {
    expect(scrollState([], 500)).toEqual({ from: 0, to: 0, t: 0 });
  });
});
