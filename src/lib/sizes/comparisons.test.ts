import { describe, expect, it } from "vitest";
import { AU_KM } from "@/lib/astro/constants";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import {
  earthDiameters,
  orbitReached,
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
