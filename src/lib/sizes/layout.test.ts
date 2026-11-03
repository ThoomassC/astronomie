import { describe, expect, it } from "vitest";
import { COMPARED_STARS, type SizeStarKey } from "@/lib/astro/starSizes";
import { placeStars, SIZE_GAP_RATIO } from "@/lib/sizes/layout";

/*
 * Disposition de la scène des tailles : les étoiles sont alignées sur l'axe x, la plus petite à l'origine,
 * chacune à gauche de la précédente. La mathématique est testée sur trois étoiles fictives (rayons 1, 2
 * et 8 R☉), posées sous des clés réelles : la disposition ne lit pas les données.
 */
const FIXTURE = [
  { key: "proxima-centauri", radiusSolar: 1 },
  { key: "sun", radiusSolar: 2 },
  { key: "sirius-a", radiusSolar: 8 },
] as const satisfies readonly { key: SizeStarKey; radiusSolar: number }[];

describe("placeStars", () => {
  it("devrait poser la plus petite à l'origine et les suivantes vers les x négatifs (fixture 1, 2, 8 → x = 0 ; −7 ; −25)", () => {
    expect(placeStars(FIXTURE)).toEqual([
      { key: "proxima-centauri", radius: 1, x: 0 },
      { key: "sun", radius: 2, x: expect.closeTo(-7, 12) },
      { key: "sirius-a", radius: 8, x: expect.closeTo(-25, 12) },
    ]);
  });

  it.each([
    [0, 1],
    [1, 2],
  ])(
    "devrait laisser SIZE_GAP_RATIO rayons de la plus petite, bord à bord, entre les voisines %i et %i",
    (smaller, larger) => {
      const placed = placeStars(FIXTURE);
      const leftEdgeOfSmaller = placed[smaller].x - placed[smaller].radius;
      const rightEdgeOfLarger = placed[larger].x + placed[larger].radius;
      expect(leftEdgeOfSmaller - rightEdgeOfLarger).toBeCloseTo(SIZE_GAP_RATIO * placed[smaller].radius, 12);
    },
  );

  it("devrait poser une étoile seule à l'origine", () => {
    expect(placeStars([{ key: "betelgeuse", radiusSolar: 764 }])).toEqual([{ key: "betelgeuse", radius: 764, x: 0 }]);
  });

  it("devrait renvoyer une liste vide quand il n'y a aucune étoile", () => {
    expect(placeStars([])).toEqual([]);
  });

  it("devrait lever une erreur quand les rayons décroissent (fixture dans l'ordre inverse)", () => {
    expect(() => placeStars([...FIXTURE].reverse())).toThrow(RangeError);
  });

  it("devrait lever une erreur quand deux voisines ont le même rayon (croissance non stricte)", () => {
    expect(() =>
      placeStars([
        { key: "sun", radiusSolar: 2 },
        { key: "sirius-a", radiusSolar: 2 },
      ]),
    ).toThrow(RangeError);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "devrait lever une erreur quand un rayon n'est pas un nombre fini strictement positif (%f)",
    (radiusSolar) => {
      expect(() => placeStars([{ key: "proxima-centauri", radiusSolar }])).toThrow(RangeError);
    },
  );

  it("devrait lever une erreur quand la dernière étoile a un rayon infini, même après des rayons valides", () => {
    expect(() => placeStars([...FIXTURE, { key: "pollux", radiusSolar: Number.POSITIVE_INFINITY }])).toThrow(RangeError);
  });
});

describe("placeStars sur les dix étoiles du comparateur", () => {
  it("devrait poser la plus petite, Proxima du Centaure, à l'origine et les suivantes à x strictement décroissants", () => {
    const xs = placeStars(COMPARED_STARS).map((star) => star.x);
    expect(xs[0]).toBe(0);
    expect(xs).toEqual([...xs].sort((a, b) => b - a));
    expect(new Set(xs).size).toBe(xs.length);
  });

  it.each(COMPARED_STARS.slice(1).map((star, i) => [i, i + 1, star.key] as const))(
    "devrait laisser SIZE_GAP_RATIO rayons de la plus petite, bord à bord, entre les étoiles %i et %i (%s)",
    (smaller, larger) => {
      const placed = placeStars(COMPARED_STARS);
      const leftEdgeOfSmaller = placed[smaller].x - placed[smaller].radius;
      const rightEdgeOfLarger = placed[larger].x + placed[larger].radius;
      expect(leftEdgeOfSmaller - rightEdgeOfLarger).toBeCloseTo(SIZE_GAP_RATIO * placed[smaller].radius, 9);
    },
  );
});
