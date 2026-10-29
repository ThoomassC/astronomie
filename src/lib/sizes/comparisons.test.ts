import { describe, expect, it } from "vitest";
import { AU_KM } from "@/lib/astro/constants";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import { earthDiameters, orbitReached, radiusAu, radiusKm, sunVolumes } from "@/lib/sizes/comparisons";

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
