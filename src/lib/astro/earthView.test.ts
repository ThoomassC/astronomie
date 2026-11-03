import { describe, expect, it } from "vitest";
import { DAY_MS } from "@/lib/astro/constants";
import {
  instrumentFor,
  isEarthViewTarget,
  viewFromEarth,
  visibilityOf,
  type EarthViewTarget,
  type Instrument,
  type Visibility,
} from "@/lib/astro/earthView";
import { heliocentric } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import { sceneAxes } from "@/lib/astro/scale";

/** Jour julien d'une date à minuit UTC, calculé ici sans passer par `julianDate` pour isoler les tests. */
const jdOf = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS + 2_440_587.5;

/** |actual − expected| ≤ tolerance, avec un message qui montre la valeur obtenue. */
function expectNear(actual: number, expected: number, tolerance: number) {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

/*
 * Valeurs recalculées hors du dépôt (éléments JPL 1800-2050, positions héliocentriques, sans temps de lumière),
 * recoupées avec les almanachs : plus grandes élongations de Vénus (45,9° le 15/08/2026 et le 01/06/2025, 47,2° le
 * 10/01/2025) et de Mercure (18,2° le 08/03/2025, 27,4° le 21/04/2025) ; diamètres à l'opposition de Jupiter
 * (46,6″ le 10/01/2026) et de Mars (14,6″ le 16/01/2025) ; conjonction inférieure de Vénus le 23/03/2025, 8,4° au
 * nord du Soleil ; conjonction de Jupiter le 24/06/2025 ; oppositions d'Uranus (21/11/2025) et de Neptune (23/09/2025).
 */

/** Séparation angulaire vraie Soleil–planète vue de la Terre (degrés) et tolérance. */
const ELONGATION: readonly (readonly [EarthViewTarget, string, number, number])[] = [
  ["venus", "2026-08-15", 45.89, 0.1],
  ["venus", "2025-06-01", 45.88, 0.1],
  ["venus", "2025-01-10", 47.17, 0.1],
  // Conjonction inférieure : 0,1° seulement en longitude, mais 8,4° de séparation réelle (latitude).
  ["venus", "2025-03-23", 8.42, 0.1],
  ["mercury", "2025-03-08", 18.24, 0.1],
  ["mercury", "2025-04-21", 27.38, 0.1],
  ["mercury", "2026-10-29", 13.99, 0.1],
  ["mars", "2025-01-16", 175.71, 0.2],
  ["mars", "2026-10-29", 78.49, 0.2],
  ["jupiter", "2026-01-10", 179.52, 0.2],
  ["jupiter", "2026-04-10", 86.34, 0.2],
  ["jupiter", "2025-06-24", 0.47, 0.2],
  ["saturn", "2026-02-01", 46.62, 0.2],
  ["saturn", "2026-07-01", 84.95, 0.2],
  ["uranus", "2025-11-21", 179.42, 0.2],
  ["neptune", "2025-09-23", 178.53, 0.2],
];

/** Côté du Soleil où se trouve la planète (est = ciel du soir), hors des conjonctions et oppositions. */
const SIDE: readonly (readonly [EarthViewTarget, string, "east" | "west"])[] = [
  ["venus", "2026-08-15", "east"],
  ["venus", "2025-06-01", "west"],
  ["venus", "2025-01-10", "east"],
  ["mercury", "2025-03-08", "east"],
  ["mercury", "2025-04-21", "west"],
  ["mars", "2026-10-29", "west"],
  ["jupiter", "2026-04-10", "east"],
  ["saturn", "2026-02-01", "east"],
  ["saturn", "2026-07-01", "west"],
];

/** Fraction éclairée du disque et tolérance. */
const ILLUMINATED: readonly (readonly [EarthViewTarget, string, number, number])[] = [
  ["venus", "2026-08-15", 0.488, 0.005],
  ["venus", "2025-06-01", 0.495, 0.005],
  ["venus", "2025-01-10", 0.511, 0.005],
  ["venus", "2025-03-23", 0.0104, 0.001],
  ["mercury", "2025-03-08", 0.472, 0.005],
  ["mercury", "2025-04-21", 0.443, 0.005],
  ["mars", "2026-10-29", 0.8955, 0.005],
];

/** Oppositions : disque plein. */
const FULL_DISK: readonly (readonly [EarthViewTarget, string])[] = [
  ["mars", "2025-01-16"],
  ["jupiter", "2026-01-10"],
];

/** Diamètre apparent équatorial (secondes d'arc) et tolérance. */
const DIAMETER: readonly (readonly [EarthViewTarget, string, number, number])[] = [
  ["venus", "2026-08-15", 24.25, 0.1],
  ["venus", "2025-06-01", 23.88, 0.1],
  ["venus", "2025-01-10", 24.39, 0.1],
  ["venus", "2025-03-23", 59.48, 0.2],
  ["mercury", "2025-03-08", 7.27, 0.05],
  ["mercury", "2025-04-21", 8.01, 0.05],
  ["mars", "2025-01-16", 14.55, 0.05],
  ["mars", "2026-10-29", 6.43, 0.05],
  ["jupiter", "2026-01-10", 46.62, 0.1],
  ["jupiter", "2026-04-10", 37.82, 0.1],
  ["jupiter", "2025-06-24", 32.02, 0.1],
  ["saturn", "2026-02-01", 16.36, 0.1],
  ["saturn", "2026-07-01", 17.5, 0.1],
  ["uranus", "2025-11-21", 3.81, 0.02],
  ["neptune", "2025-09-23", 2.36, 0.02],
];

const VISIBILITY: readonly (readonly [EarthViewTarget, string, Visibility])[] = [
  ["venus", "2026-08-15", "evening-west"],
  ["venus", "2025-06-01", "morning-east"],
  ["venus", "2025-01-10", "evening-west"],
  ["venus", "2025-03-23", "too-close"],
  ["mercury", "2025-03-08", "evening-west"],
  ["mercury", "2025-04-21", "morning-east"],
  ["mercury", "2026-10-29", "too-close"],
  ["mars", "2025-01-16", "all-night"],
  ["mars", "2026-10-29", "late-night"],
  ["jupiter", "2026-01-10", "all-night"],
  ["jupiter", "2026-04-10", "evening"],
  ["jupiter", "2025-06-24", "too-close"],
  ["saturn", "2026-02-01", "evening-west"],
  ["saturn", "2026-07-01", "late-night"],
  ["uranus", "2025-11-21", "all-night"],
  ["neptune", "2025-09-23", "all-night"],
];

const INSTRUMENT: readonly (readonly [EarthViewTarget, string, Instrument])[] = [
  ["venus", "2026-08-15", "eye"],
  ["venus", "2025-06-01", "eye"],
  ["venus", "2025-01-10", "eye"],
  ["venus", "2025-03-23", "eye"],
  ["mercury", "2025-03-08", "eye"],
  ["mercury", "2025-04-21", "eye"],
  ["mars", "2025-01-16", "eye"],
  ["mars", "2026-10-29", "eye"],
  ["jupiter", "2026-01-10", "eye"],
  ["jupiter", "2026-04-10", "eye"],
  ["jupiter", "2025-06-24", "eye"],
  ["saturn", "2026-02-01", "eye"],
  ["saturn", "2026-07-01", "eye"],
  ["uranus", "2025-11-21", "binoculars"],
  ["neptune", "2025-09-23", "telescope"],
];

/** Les sept planètes qu'on peut regarder depuis la Terre. */
const TARGETS: readonly EarthViewTarget[] = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"];
/** Dix dates étalées sur plusieurs années, conjonctions et oppositions comprises. */
const TEN_DATES = [
  "2024-01-01", "2024-08-17", "2025-03-23", "2025-06-01", "2025-11-21",
  "2026-01-10", "2026-05-05", "2026-10-29", "2028-02-29", "2030-12-31",
] as const;

describe("viewFromEarth", () => {
  describe("élongation (séparation angulaire vraie Soleil–planète)", () => {
    it.each(ELONGATION)("devrait mesurer %s le %s à %f° (± %f)", (planet, date, deg, tolerance) => {
      expectNear(viewFromEarth(planet, jdOf(date)).elongationDeg, deg, tolerance);
    });
  });

  describe("côté du Soleil", () => {
    it.each(SIDE)("devrait placer %s le %s du côté « %s » du Soleil (est = ciel du soir)", (planet, date, side) => {
      expect(viewFromEarth(planet, jdOf(date)).side).toBe(side);
    });
  });

  describe("fraction éclairée", () => {
    it.each(ILLUMINATED)("devrait éclairer %s le %s à %f (± %f)", (planet, date, fraction, tolerance) => {
      expectNear(viewFromEarth(planet, jdOf(date)).illuminated, fraction, tolerance);
    });

    it.each(FULL_DISK)("devrait montrer %s le %s presque pleine (≥ 0,999) à l'opposition", (planet, date) => {
      expect(viewFromEarth(planet, jdOf(date)).illuminated).toBeGreaterThanOrEqual(0.999);
    });
  });

  describe("diamètre apparent", () => {
    it.each(DIAMETER)("devrait donner à %s le %s un diamètre de %f″ (± %f)", (planet, date, arcsec, tolerance) => {
      expectNear(viewFromEarth(planet, jdOf(date)).diameterArcsec, arcsec, tolerance);
    });
  });

  describe("visibilité", () => {
    it.each(VISIBILITY)("devrait classer %s le %s : %s", (planet, date, visibility) => {
      expect(viewFromEarth(planet, jdOf(date)).visibility).toBe(visibility);
    });
  });

  describe("instrument", () => {
    it.each(INSTRUMENT)("devrait conseiller pour %s le %s : %s", (planet, date, instrument) => {
      expect(viewFromEarth(planet, jdOf(date)).instrument).toBe(instrument);
    });
  });

  describe("propriétés", () => {
    it.each(ELONGATION)("devrait donner une direction planète → Terre unitaire (%s le %s)", (planet, date) => {
      const { toEarth } = viewFromEarth(planet, jdOf(date));
      expect(Math.hypot(toEarth.x, toEarth.y, toEarth.z)).toBeCloseTo(1, 12);
    });

    it("devrait exprimer la direction planète → Terre dans les axes de scène (x, z, −y) : Jupiter le 10/01/2026", () => {
      const { toEarth } = viewFromEarth("jupiter", jdOf("2026-01-10"));
      expectNear(toEarth.x, 0.3385, 1e-3);
      expectNear(toEarth.y, -0.0045, 1e-3);
      expectNear(toEarth.z, 0.9409, 1e-3);
    });

    it("devrait regarder la Terre à l'opposé du Soleil quand Jupiter est à l'opposition (10/01/2026)", () => {
      const jd = jdOf("2026-01-10");
      const { toEarth } = viewFromEarth("jupiter", jd);
      const jupiter = sceneAxes(heliocentric(PLANET_BY_KEY.jupiter, jd));
      const length = Math.hypot(jupiter.x, jupiter.y, jupiter.z);
      const cosine = (toEarth.x * jupiter.x + toEarth.y * jupiter.y + toEarth.z * jupiter.z) / length;
      expect(cosine).toBeLessThan(-0.999);
    });

    it.each(ELONGATION)("devrait tirer la fraction éclairée de l'angle de phase, (1 + cos i) / 2 (%s le %s)", (planet, date) => {
      const view = viewFromEarth(planet, jdOf(date));
      expect(view.illuminated).toBeCloseTo((1 + Math.cos((view.phaseAngleDeg * Math.PI) / 180)) / 2, 12);
    });

    it.each(TARGETS)("devrait garder la fraction éclairée de %s entre 0 et 1 sur dix dates", (planet) => {
      const fractions = TEN_DATES.map((date) => viewFromEarth(planet, jdOf(date)).illuminated);
      expect(Math.min(...fractions)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...fractions)).toBeLessThanOrEqual(1);
    });
  });
});

describe("visibilityOf", () => {
  it.each([
    [14.9, "east", "too-close"],
    [15, "east", "evening-west"],
    [59.9, "west", "morning-east"],
    [60, "east", "evening"],
    [60, "west", "late-night"],
    [149.9, "east", "evening"],
    [150, "west", "all-night"],
  ] as const)("devrait classer une élongation de %f°, côté %s : %s", (elongation, side, visibility) => {
    expect(visibilityOf(elongation, side)).toBe(visibility);
  });
});

describe("instrumentFor", () => {
  it.each([
    ["uranus", "binoculars"],
    ["neptune", "telescope"],
    ["mercury", "eye"],
    ["venus", "eye"],
    ["mars", "eye"],
    ["jupiter", "eye"],
    ["saturn", "eye"],
  ] as const)("devrait conseiller pour %s : %s", (planet, instrument) => {
    expect(instrumentFor(planet)).toBe(instrument);
  });
});

describe("isEarthViewTarget", () => {
  it.each([
    ["earth", false],
    ["venus", true],
    ["sun", false],
  ] as const)("devrait dire si « %s » se regarde depuis la Terre : %s", (key, expected) => {
    expect(isEarthViewTarget(key)).toBe(expected);
  });
});
