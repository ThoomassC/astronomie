import { describe, expect, it } from "vitest";
import { COMPARED_BLACK_HOLE_BY_KEY, COMPARED_BLACK_HOLES } from "@/lib/astro/blackHoles";
import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { COMPARED_STAR_BY_KEY } from "@/lib/astro/starSizes";
import {
  BLACK_HOLE_EXTENT_RS,
  BLACK_HOLE_VISIBLE_RS,
  COMPARED_OBJECT_BY_KEY,
  COMPARED_OBJECTS,
  comparedRadiusSolar,
  extentSolar,
  isSizeObjectKey,
  layoutInput,
  visibleShare,
} from "@/lib/sizes/objects";

/*
 * Ce que l'onglet « Tailles » compare : dix étoiles par leur rayon, quatre trous noirs par le rayon de leur ombre
 * (√27/2 ≈ 2,6 fois l'horizon, ce que l'on voit d'eux), rangés en une seule suite d'escales.
 */

describe("COMPARED_OBJECTS", () => {
  it("devrait ranger les quatorze astres par taille comparée, de Cygnus X-1 au Fer à cheval cosmique", () => {
    expect(COMPARED_OBJECTS.map((object) => object.key)).toEqual([
      "cygnus-x-1", "proxima-centauri", "sun", "sirius-a", "pollux", "arcturus", "aldebaran", "sagittarius-a-star",
      "rigel", "antares-a", "betelgeuse", "vy-canis-majoris", "m87-star", "cosmic-horseshoe",
    ]);
  });

  it("devrait faire croître strictement la taille comparée d'une escale à la suivante", () => {
    const sizes = COMPARED_OBJECTS.map(comparedRadiusSolar);
    sizes.slice(1).forEach((size, i) => expect(size, COMPARED_OBJECTS[i + 1].key).toBeGreaterThan(sizes[i]));
  });

  it("devrait retrouver chaque astre par sa clé, les quatorze", () => {
    for (const object of COMPARED_OBJECTS) expect(COMPARED_OBJECT_BY_KEY[object.key]).toBe(object);
    expect(Object.keys(COMPARED_OBJECT_BY_KEY)).toHaveLength(14);
  });
});

describe("comparedRadiusSolar", () => {
  it("devrait comparer une étoile par son rayon (Bételgeuse : 764 R☉)", () => {
    expect(comparedRadiusSolar(COMPARED_STAR_BY_KEY.betelgeuse)).toBe(764);
  });

  it("devrait comparer un trou noir par le rayon de son ombre, √27/2 fois son horizon", () => {
    const hole = COMPARED_BLACK_HOLE_BY_KEY["m87-star"];
    expect(comparedRadiusSolar(hole)).toBe(SHADOW_RADIUS_RS * hole.radiusSolar);
  });

  it("devrait placer l'ombre de Sagittarius A* (47,4 R☉) entre Aldébaran (45,1) et Rigel (74)", () => {
    expect(comparedRadiusSolar(COMPARED_BLACK_HOLE_BY_KEY["sagittarius-a-star"])).toBeCloseTo(47.39, 2);
  });

  it("devrait donner à l'ombre de Cygnus X-1 environ 163 km de rayon, sous Proxima du Centaure", () => {
    expect(comparedRadiusSolar(COMPARED_BLACK_HOLE_BY_KEY["cygnus-x-1"]) * 695_700).toBeCloseTo(162.7, 1);
  });
});

describe("extentSolar", () => {
  it("devrait donner à une étoile son rayon pour encombrement", () => {
    expect(extentSolar(COMPARED_STAR_BY_KEY.rigel)).toBe(74);
  });

  it.each(Object.entries(BLACK_HOLE_EXTENT_RS))(
    "devrait donner au trou noir %s un encombrement de %f rayons d'horizon",
    (key, extentRs) => {
      const hole = COMPARED_OBJECT_BY_KEY[key as keyof typeof BLACK_HOLE_EXTENT_RS];
      expect(extentSolar(hole)).toBe(extentRs * hole.radiusSolar);
    },
  );

  it.each(COMPARED_OBJECTS.map((object) => [object.key, object] as const))(
    "devrait contenir la taille comparée de %s dans son encombrement",
    (_key, object) => {
      expect(extentSolar(object)).toBeGreaterThanOrEqual(comparedRadiusSolar(object));
    },
  );
});

describe("BLACK_HOLE_EXTENT_RS", () => {
  it("devrait réserver 10 r_s au disque de Cygnus X-1 et au jet de M87*, 3,2 r_s à l'anneau ténu de Sagittarius A*", () => {
    expect(BLACK_HOLE_EXTENT_RS["cygnus-x-1"]).toBe(10);
    expect(BLACK_HOLE_EXTENT_RS["sagittarius-a-star"]).toBe(3.2);
    expect(BLACK_HOLE_EXTENT_RS["m87-star"]).toBe(10);
  });

  it("devrait réserver au moins 10 r_s au Fer à cheval cosmique, pour la lumière déviée de sa galaxie", () => {
    expect(BLACK_HOLE_EXTENT_RS["cosmic-horseshoe"]).toBeGreaterThanOrEqual(10);
  });
});

/*
 * Ce qui se voit d'un trou noir, que l'étiquette ne coupe pas : bien moins que son encombrement, au-delà de son ombre.
 * Les valeurs sont vérifiées sur les aspects et le modèle de la lumière (sizesObjects.test.ts).
 */
describe("BLACK_HOLE_VISIBLE_RS", () => {
  const HOLES = COMPARED_BLACK_HOLES.map(({ key }) => key);

  it.each(HOLES)("devrait borner ce qui se voit de %s entre son ombre et son encombrement", (key) => {
    const { up, down } = BLACK_HOLE_VISIBLE_RS[key];
    for (const reach of [up, down]) {
      expect(reach).toBeGreaterThan(SHADOW_RADIUS_RS);
      expect(reach).toBeLessThanOrEqual(BLACK_HOLE_EXTENT_RS[key]);
    }
  });
});

describe("visibleShare", () => {
  it("devrait donner tout le disque d'une étoile, au-dessus comme au-dessous de son centre", () => {
    expect(visibleShare(COMPARED_STAR_BY_KEY.rigel)).toEqual({ up: 1, down: 1 });
  });

  it("devrait donner la part de l'encombrement que l'on voit d'un trou noir (M87* : son anneau, 3,7 r_s sur 10)", () => {
    const share = visibleShare(COMPARED_BLACK_HOLE_BY_KEY["m87-star"]);
    expect(share.up).toBeCloseTo(0.37, 12);
    expect(share.down).toBeCloseTo(0.37, 12);
  });

  it("devrait suivre BLACK_HOLE_VISIBLE_RS pour chaque trou noir", () => {
    for (const hole of COMPARED_BLACK_HOLES) {
      const { up, down } = BLACK_HOLE_VISIBLE_RS[hole.key];
      const extent = BLACK_HOLE_EXTENT_RS[hole.key];
      expect(visibleShare(hole)).toEqual({ up: up / extent, down: down / extent });
    }
  });
});

describe("layoutInput", () => {
  it("devrait donner à la disposition la taille comparée et l'encombrement d'un astre", () => {
    const hole = COMPARED_BLACK_HOLE_BY_KEY["sagittarius-a-star"];
    expect(layoutInput(hole)).toEqual({
      key: "sagittarius-a-star",
      radiusSolar: comparedRadiusSolar(hole),
      extentSolar: extentSolar(hole),
    });
  });
});

describe("isSizeObjectKey", () => {
  it.each(COMPARED_OBJECTS.map((object) => object.key))("devrait reconnaître l'astre %s", (key) => {
    expect(isSizeObjectKey(key)).toBe(true);
  });

  it.each([undefined, "", "intro", "Sun", "ton-618", "saturn"])("devrait refuser %s", (value) => {
    expect(isSizeObjectKey(value)).toBe(false);
  });
});
