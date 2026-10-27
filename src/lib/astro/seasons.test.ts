import { describe, expect, it } from "vitest";
import {
  daylightFraction,
  formatDayLength,
  noonAltitudeDeg,
  northernSeason,
  solarDeclinationRad,
} from "@/lib/astro/seasons";

const DEG = Math.PI / 180;
const EARTH_TILT = 23.44;
const PARIS_LATITUDE = 48.85;
/** Hauteur de l'horizon terrestre : réfraction et rayon apparent du Soleil. */
const EARTH_HORIZON = -0.833;

/** Fraction de 24 h correspondant à une durée en heures et minutes. */
const dayFraction = (hours: number, minutes: number) => (hours + minutes / 60) / 24;

describe("solarDeclinationRad", () => {
  it.each([
    [0, 0],
    [90, EARTH_TILT],
    [180, 0],
    [270, -EARTH_TILT],
  ])("devrait donner la déclinaison terrestre quand λ = %i° (%f°)", (longitude, expectedDeg) => {
    expect(solarDeclinationRad(EARTH_TILT, longitude)).toBeCloseTo(expectedDeg * DEG, 12);
  });

  it("devrait plafonner à 180° − ε quand l'axe est couché au-delà de 90° (Uranus, 97,77°)", () => {
    expect(solarDeclinationRad(97.77, 90)).toBeCloseTo(82.23 * DEG, 9);
  });

  it("devrait rester nulle quand l'axe n'est pas incliné", () => {
    expect(solarDeclinationRad(0, 90)).toBeCloseTo(0, 12);
  });
});

describe("daylightFraction", () => {
  it("devrait valoir 0,5 à l'équinoxe quand l'horizon est géométrique (valeur par défaut)", () => {
    expect(daylightFraction(PARIS_LATITUDE, 0)).toBeCloseTo(0.5, 12);
  });

  it("devrait dépasser 0,5 à l'équinoxe quand l'horizon tient compte de la réfraction", () => {
    expect(daylightFraction(PARIS_LATITUDE, 0, EARTH_HORIZON)).toBeGreaterThan(0.5);
  });

  it("devrait donner entre 16 h 05 et 16 h 20 de jour à Paris au solstice de juin", () => {
    const fraction = daylightFraction(PARIS_LATITUDE, EARTH_TILT * DEG, EARTH_HORIZON);
    expect(fraction).toBeGreaterThan(dayFraction(16, 5));
    expect(fraction).toBeLessThan(dayFraction(16, 20));
  });

  it("devrait donner entre 8 h 05 et 8 h 20 de jour à Paris au solstice de décembre", () => {
    const fraction = daylightFraction(PARIS_LATITUDE, -EARTH_TILT * DEG, EARTH_HORIZON);
    expect(fraction).toBeGreaterThan(dayFraction(8, 5));
    expect(fraction).toBeLessThan(dayFraction(8, 20));
  });

  it("devrait valoir 1 (jour polaire) à 80° N en été", () => {
    expect(daylightFraction(80, EARTH_TILT * DEG, EARTH_HORIZON)).toBe(1);
  });

  it("devrait valoir 0 (nuit polaire) à 80° N en hiver", () => {
    expect(daylightFraction(80, -EARTH_TILT * DEG, EARTH_HORIZON)).toBe(0);
  });

  it("devrait inverser les saisons entre les deux hémisphères", () => {
    expect(daylightFraction(-PARIS_LATITUDE, EARTH_TILT * DEG, EARTH_HORIZON)).toBeCloseTo(
      daylightFraction(PARIS_LATITUDE, -EARTH_TILT * DEG, EARTH_HORIZON),
      12,
    );
  });

  it("devrait rendre complémentaires les deux solstices quand l'horizon est géométrique", () => {
    const june = daylightFraction(PARIS_LATITUDE, EARTH_TILT * DEG);
    const december = daylightFraction(PARIS_LATITUDE, -EARTH_TILT * DEG);
    expect(june + december).toBeCloseTo(1, 12);
  });
});

describe("northernSeason", () => {
  it.each([
    [0, "printemps"],
    [89.999, "printemps"],
    [90, "été"],
    [180, "automne"],
    [270, "hiver"],
    [359.9, "hiver"],
  ] as const)("devrait donner la saison boréale quand λ = %f° (%s)", (longitude, season) => {
    expect(northernSeason(longitude)).toBe(season);
  });

  it.each([
    [-10, "hiver"],
    [360, "printemps"],
    [450, "été"],
  ] as const)("devrait normaliser λ modulo 360 quand λ = %f° (%s)", (longitude, season) => {
    expect(northernSeason(longitude)).toBe(season);
  });
});

describe("noonAltitudeDeg", () => {
  it("devrait valoir 90 − |φ − δ| à Paris au solstice de juin (≈ 64,59°)", () => {
    expect(noonAltitudeDeg(PARIS_LATITUDE, EARTH_TILT * DEG)).toBeCloseTo(64.59, 9);
  });

  it("devrait valoir 17,71° à Paris au solstice de décembre", () => {
    expect(noonAltitudeDeg(PARIS_LATITUDE, -EARTH_TILT * DEG)).toBeCloseTo(17.71, 9);
  });

  it("devrait valoir 90° (zénith) à l'équateur à l'équinoxe", () => {
    expect(noonAltitudeDeg(0, 0)).toBeCloseTo(90, 12);
  });

  it("devrait devenir négative quand le Soleil reste sous l'horizon (80° N en hiver)", () => {
    expect(noonAltitudeDeg(80, -EARTH_TILT * DEG)).toBeCloseTo(-13.44, 9);
  });
});

describe("formatDayLength", () => {
  it.each([
    [16.25 / 24, "16 h 15"],
    [8 / 24, "8 h 00"],
    [0, "0 h 00"],
    [1, "24 h 00"],
  ])("devrait écrire la fraction %f de 24 h sous la forme %s", (fraction, expected) => {
    expect(formatDayLength(fraction)).toBe(expected);
  });

  it.each([
    [dayFraction(16, 5.4), "16 h 05"],
    [dayFraction(16, 5.6), "16 h 06"],
  ])("devrait arrondir à la minute la plus proche (%f → %s)", (fraction, expected) => {
    expect(formatDayLength(fraction)).toBe(expected);
  });

  it("devrait reporter la retenue sur l'heure quand les minutes arrondies atteignent 60", () => {
    expect(formatDayLength(dayFraction(7, 59.6))).toBe("8 h 00");
  });
});
