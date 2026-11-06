import { describe, expect, it } from "vitest";
import { AU_KM } from "@/lib/astro/constants";
import { COMPARED_BLACK_HOLE_BY_KEY, type BlackHoleKey } from "@/lib/astro/blackHoles";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import { comparedRadiusSolar } from "@/lib/sizes/objects";
import {
  earthDiameters,
  orbitReached,
  pickBlackHoleComparison,
  pickComparison,
  radiusAu,
  radiusKm,
  roundSignificant,
  sunVolumes,
} from "@/lib/sizes/comparisons";

/** Rayon solaire nominal (UAI 2015, résolution B3), en km. */
const SOLAR_RADIUS_KM = 695_700;

describe("radiusKm", () => {
  it.each([
    [1, 695_700],
    [0.5, 347_850],
    [1420, 987_894_000],
  ])("devrait convertir %f R☉ en %f km (1 R☉ nominal = 695 700 km)", (radiusSolar, expected) => {
    expect(radiusKm(radiusSolar)).toBeCloseTo(expected, 6);
  });
});

describe("radiusAu", () => {
  it("devrait convertir 1 420 R☉ en 6,6037 UA (1 UA = 149 597 870,7 km)", () => {
    expect(radiusAu(1420)).toBeCloseTo(6.6037, 4);
  });

  it("devrait donner au Soleil un rayon de 0,004 650 UA", () => {
    expect(radiusAu(1)).toBeCloseTo(0.00465047, 8);
  });
});

describe("earthDiameters", () => {
  it("devrait aligner 109,0757 Terres sur le diamètre du Soleil (rayon équatorial terrestre : 6 378,137 km)", () => {
    expect(earthDiameters(1)).toBeCloseTo(109.0757, 4);
  });

  it("devrait croître comme le rayon de l'étoile (764 R☉ → 764 fois plus de Terres que pour le Soleil)", () => {
    expect(earthDiameters(764)).toBeCloseTo(764 * 109.07573794667628, 6);
  });
});

describe("sunVolumes", () => {
  it.each([
    [1, 1],
    [2, 8],
    [0.5, 0.125],
    [1420, 2_863_288_000],
  ])("devrait contenir le cube du rayon en volumes de Soleil (%f R☉ → %f)", (radiusSolar, expected) => {
    expect(sunVolumes(radiusSolar)).toBe(expected);
  });
});

describe("orbitReached", () => {
  it.each([
    [1420, "jupiter"],
    [764, "mars"],
    [680, "mars"],
    [10_000, "neptune"],
    [79, null],
    [1, null],
  ] as const)(
    "devrait renvoyer la plus lointaine des orbites atteintes par une étoile de %f R☉ mise à la place du Soleil (%s)",
    (radiusSolar, expected) => {
      expect(orbitReached(radiusSolar)).toBe(expected);
    },
  );

  /** Étoile dont la surface passerait par l'orbite de Mercure (demi-grand axe J2000 du JPL) : 83,24 R☉. */
  const MERCURY_ORBIT_SOLAR_RADII = (PLANET_BY_KEY.mercury.elements[0] * AU_KM) / SOLAR_RADIUS_KM;

  it("ne devrait atteindre aucune orbite quand la surface s'arrête juste avant celle de Mercure", () => {
    expect(orbitReached(MERCURY_ORBIT_SOLAR_RADII * (1 - 1e-9))).toBeNull();
  });

  it("devrait atteindre Mercure dès que la surface dépasse son orbite", () => {
    expect(orbitReached(MERCURY_ORBIT_SOLAR_RADII * (1 + 1e-9))).toBe("mercury");
  });
});

describe("roundSignificant", () => {
  it.each([
    [405_224, 2, 410_000],
    [721.734, 2, 720],
    [5.009, 2, 5],
    [531_514_800, 4, 531_500_000],
    [695_700, 4, 695_700],
    [107_137.8, 4, 107_100],
  ])("devrait arrondir %f à %i chiffres significatifs (%f)", (value, digits, expected) => {
    expect(roundSignificant(value, digits)).toBe(expected);
  });
});

describe("pickComparison", () => {
  it.each([
    [1420, "jupiter"],
    [764, "mars"],
    [680, "mars"],
  ] as const)("devrait citer l'orbite engloutie quand l'étoile en atteint une (%f R☉ : %s)", (radiusSolar, planet) => {
    expect(pickComparison(radiusSolar)).toEqual({ kind: "orbit", planet });
  });

  it.each([
    [74, 410_000],
    [45.1, 92_000],
    [25.4, 16_000],
    [8.97, 720],
    [1.711, 5],
  ])(
    "devrait compter, à deux chiffres significatifs, les Soleils que contiendrait le volume d'une étoile plus grande que le Soleil qui n'atteint pas Mercure (%f R☉ : %f)",
    (radiusSolar, count) => {
      expect(pickComparison(radiusSolar)).toEqual({ kind: "suns", count });
    },
  );

  it.each([
    [1, 109],
    [0.154, 17],
  ])(
    "devrait compter, à l'unité, les Terres alignées sur le diamètre d'une étoile pas plus grande que le Soleil (%f R☉ : %f)",
    (radiusSolar, count) => {
      expect(pickComparison(radiusSolar)).toEqual({ kind: "earths", count });
    },
  );
});

/*
 * Un trou noir se compare par son ombre, ce que l'on voit de lui : son diamètre en kilomètres quand elle est plus
 * petite que la Terre ; sinon l'orbite de la planète la plus proche du Soleil qui la contiendrait, mise à la place du
 * Soleil ; au-delà de Neptune, combien de fois l'orbite de Neptune elle couvrirait.
 */
describe("pickBlackHoleComparison", () => {
  const shadow = (key: BlackHoleKey) => comparedRadiusSolar(COMPARED_BLACK_HOLE_BY_KEY[key]);
  /** Rayon, en R☉, d'une orbite de demi-grand axe `au`. */
  const orbit = (au: number) => (au * AU_KM) / SOLAR_RADIUS_KM;
  const EARTH_RADIUS_SOLAR = 6_378.137 / SOLAR_RADIUS_KM;
  const NEPTUNE_AU = PLANET_BY_KEY.neptune.elements[0];

  it.each([
    ["cygnus-x-1", { kind: "km", diameterKm: 330 }],
    ["sagittarius-a-star", { kind: "insideOrbit", planet: "mercury" }],
    ["m87-star", { kind: "beyondNeptune", times: 11 }],
    ["cosmic-horseshoe", { kind: "beyondNeptune", times: 61 }],
  ] as const)("devrait comparer l'ombre de %s", (key, comparison) => {
    expect(pickBlackHoleComparison(shadow(key))).toEqual(comparison);
  });

  it("devrait donner en kilomètres, à deux chiffres significatifs, le diamètre d'une ombre plus petite que la Terre", () => {
    expect(pickBlackHoleComparison(EARTH_RADIUS_SOLAR * (1 - 1e-9))).toEqual({ kind: "km", diameterKm: 13_000 });
  });

  it("devrait passer à l'orbite de Mercure dès que l'ombre dépasse la Terre, et jusqu'à cette orbite comprise", () => {
    expect(pickBlackHoleComparison(EARTH_RADIUS_SOLAR * (1 + 1e-9))).toEqual({ kind: "insideOrbit", planet: "mercury" });
    expect(pickBlackHoleComparison(orbit(PLANET_BY_KEY.mercury.elements[0]))).toEqual({ kind: "insideOrbit", planet: "mercury" });
  });

  it("devrait prendre la planète suivante dès que l'ombre dépasse une orbite (Vénus, juste après Mercure)", () => {
    expect(pickBlackHoleComparison(orbit(PLANET_BY_KEY.mercury.elements[0]) * (1 + 1e-9))).toEqual({
      kind: "insideOrbit",
      planet: "venus",
    });
  });

  it("devrait compter les orbites de Neptune au-delà de la sienne, à l'unité", () => {
    expect(pickBlackHoleComparison(orbit(NEPTUNE_AU))).toEqual({ kind: "insideOrbit", planet: "neptune" });
    expect(pickBlackHoleComparison(orbit(NEPTUNE_AU) * (1 + 1e-9))).toEqual({ kind: "beyondNeptune", times: 1 });
    expect(pickBlackHoleComparison(orbit(2.6 * NEPTUNE_AU))).toEqual({ kind: "beyondNeptune", times: 3 });
  });
});
