import { describe, expect, it } from "vitest";
import { COMPARED_OBJECTS, layoutInput, type SizeObjectKey } from "@/lib/sizes/objects";
import { placeObjects, SIZE_GAP_NEXT_RATIO, SIZE_GAP_RATIO, SIZE_GAP_REST_RATIO, type PlacedObject } from "@/lib/sizes/layout";

/*
 * Disposition de la scène des tailles : les astres sont alignés sur l'axe x, le plus petit à l'origine, chacun à
 * gauche du précédent. La mathématique est testée sur des astres fictifs, posés sous des clés réelles : la
 * disposition ne lit pas les données. Une étoile s'encombre de son rayon ; un trou noir, de bien plus que son ombre.
 */
const FIXTURE = [
  { key: "proxima-centauri", radiusSolar: 1, extentSolar: 1 },
  { key: "sun", radiusSolar: 2, extentSolar: 2 },
  { key: "sirius-a", radiusSolar: 8, extentSolar: 8 },
] as const satisfies readonly { key: SizeObjectKey; radiusSolar: number; extentSolar: number }[];

/** Vide bord à bord (encombrements) entre l'astre `index` et le précédent. */
const gapBefore = (placed: readonly PlacedObject[], index: number) =>
  placed[index - 1].x - placed[index - 1].extent - (placed[index].x + placed[index].extent);

describe("placeObjects", () => {
  it("devrait poser le plus petit à l'origine et les suivants vers les x négatifs (fixture 1, 2, 8 → x = 0 ; −7 ; −25)", () => {
    expect(placeObjects(FIXTURE)).toEqual([
      { key: "proxima-centauri", radius: 1, extent: 1, x: 0 },
      { key: "sun", radius: 2, extent: 2, x: expect.closeTo(-7, 12) },
      { key: "sirius-a", radius: 8, extent: 8, x: expect.closeTo(-25, 12) },
    ]);
  });

  it.each([1, 2])(
    "devrait laisser SIZE_GAP_RATIO encombrements du plus petit, bord à bord, entre deux voisins de tailles proches (%i)",
    (index) => {
      const placed = placeObjects(FIXTURE);
      expect(gapBefore(placed, index)).toBeCloseTo(SIZE_GAP_RATIO * placed[index - 1].extent, 12);
    },
  );

  it("devrait écarter le suivant de SIZE_GAP_REST_RATIO encombrements de l'astre au repos quand celui-ci encombre bien plus", () => {
    const placed = placeObjects([
      { key: "cygnus-x-1", radiusSolar: 1, extentSolar: 10 },
      { key: "proxima-centauri", radiusSolar: 2, extentSolar: 2 },
    ]);
    expect(gapBefore(placed, 1)).toBeCloseTo(SIZE_GAP_REST_RATIO * 10, 12);
  });

  it("devrait écarter un suivant immense de SIZE_GAP_NEXT_RATIO de son propre encombrement", () => {
    const placed = placeObjects([
      { key: "vy-canis-majoris", radiusSolar: 1, extentSolar: 1 },
      { key: "m87-star", radiusSolar: 50, extentSolar: 200 },
    ]);
    expect(gapBefore(placed, 1)).toBeCloseTo(SIZE_GAP_NEXT_RATIO * 200, 12);
  });

  it("devrait accepter un encombrement qui décroît d'un astre au suivant, pourvu que la taille comparée croisse", () => {
    expect(() =>
      placeObjects([
        { key: "sagittarius-a-star", radiusSolar: 1, extentSolar: 5 },
        { key: "rigel", radiusSolar: 2, extentSolar: 2 },
      ]),
    ).not.toThrow();
  });

  it("devrait poser un astre seul à l'origine", () => {
    expect(placeObjects([{ key: "betelgeuse", radiusSolar: 764, extentSolar: 764 }])).toEqual([
      { key: "betelgeuse", radius: 764, extent: 764, x: 0 },
    ]);
  });

  it("devrait renvoyer une liste vide quand il n'y a aucun astre", () => {
    expect(placeObjects([])).toEqual([]);
  });

  it("devrait lever une erreur quand les tailles comparées décroissent (fixture dans l'ordre inverse)", () => {
    expect(() => placeObjects([...FIXTURE].reverse())).toThrow(RangeError);
  });

  it("devrait lever une erreur quand deux voisins ont la même taille comparée (croissance non stricte)", () => {
    expect(() =>
      placeObjects([
        { key: "sun", radiusSolar: 2, extentSolar: 2 },
        { key: "sirius-a", radiusSolar: 2, extentSolar: 2 },
      ]),
    ).toThrow(RangeError);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "devrait lever une erreur quand une taille comparée n'est pas un nombre fini strictement positif (%f)",
    (radiusSolar) => {
      expect(() => placeObjects([{ key: "proxima-centauri", radiusSolar, extentSolar: 1 }])).toThrow(RangeError);
    },
  );

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "devrait lever une erreur quand l'encombrement ne contient pas la taille comparée, ou n'est pas fini (%f)",
    (extentSolar) => {
      expect(() => placeObjects([{ key: "m87-star", radiusSolar: 1, extentSolar }])).toThrow(RangeError);
    },
  );

  it("devrait lever une erreur quand le dernier astre a une taille infinie, même après des tailles valides", () => {
    const infinite = { key: "pollux", radiusSolar: Number.POSITIVE_INFINITY, extentSolar: Number.POSITIVE_INFINITY } as const;
    expect(() => placeObjects([...FIXTURE, infinite])).toThrow(RangeError);
  });
});

describe("placeObjects sur les quatorze astres du comparateur", () => {
  const PLACED = placeObjects(COMPARED_OBJECTS.map(layoutInput));
  const index = (key: SizeObjectKey) => PLACED.findIndex((placed) => placed.key === key);
  /** Paires d'étoiles voisines : leur écart ne change pas avec l'arrivée des trous noirs. */
  const STAR_PAIRS = COMPARED_OBJECTS.slice(1)
    .map((object, i) => [COMPARED_OBJECTS[i], object] as const)
    .filter(([previous, next]) => previous.kind === "star" && next.kind === "star")
    .map(([previous, next]) => [previous.key, index(next.key)] as const);

  it("devrait poser le plus petit, Cygnus X-1, à l'origine et les suivants à x strictement décroissants", () => {
    const xs = PLACED.map((placed) => placed.x);
    expect(PLACED[0].key).toBe("cygnus-x-1");
    expect(xs[0]).toBe(0);
    xs.slice(1).forEach((x, i) => expect(x).toBeLessThan(xs[i]));
  });

  it("devrait garder entre deux étoiles voisines SIZE_GAP_RATIO rayons de la plus petite (huit paires)", () => {
    expect(STAR_PAIRS).toHaveLength(8);
    for (const [previous, i] of STAR_PAIRS) {
      expect(gapBefore(PLACED, i), previous).toBeCloseTo(SIZE_GAP_RATIO * PLACED[i - 1].extent, 9);
    }
  });

  it.each([
    ["cygnus-x-1", "proxima-centauri"],
    ["vy-canis-majoris", "m87-star"],
  ] as const)("devrait écarter %s de %s, bien plus grand, de SIZE_GAP_NEXT_RATIO de l'encombrement du suivant", (_previous, next) => {
    const i = index(next);
    expect(gapBefore(PLACED, i)).toBeCloseTo(SIZE_GAP_NEXT_RATIO * PLACED[i].extent, 6);
  });

  it.each([
    ["aldebaran", "sagittarius-a-star"],
    ["sagittarius-a-star", "rigel"],
    ["m87-star", "cosmic-horseshoe"],
  ] as const)("devrait écarter %s de %s, de tailles proches, de SIZE_GAP_RATIO encombrements du plus petit", (_previous, next) => {
    const i = index(next);
    expect(gapBefore(PLACED, i)).toBeCloseTo(SIZE_GAP_RATIO * Math.min(PLACED[i - 1].extent, PLACED[i].extent), 6);
  });
});
