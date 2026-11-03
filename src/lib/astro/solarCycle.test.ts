import { describe, expect, it } from "vitest";
import { YEAR_DAYS } from "@/lib/astro/constants";
import { julianDate } from "@/lib/astro/ephemeris";
import { poleDirection } from "@/lib/astro/orientation";
import {
  CYCLE_25_MAXIMUM_JD,
  CYCLE_25_START_JD,
  SOLAR_CYCLE_DAYS,
  SUN_ROTATION,
  solarActivity,
  solarRotationRate,
  sunspotLatitude,
} from "@/lib/astro/solarCycle";

/** Jour julien du 15 du mois (mois de 1 à 12), à 0 h UT. */
const jdOf = (year: number, month: number) => julianDate(Date.UTC(year, month - 1, 15));

describe("solarActivity", () => {
  it("devrait atteindre 1 au maximum du cycle 25 (octobre 2024)", () => {
    expect(solarActivity(jdOf(2024, 10))).toBeGreaterThan(0.999);
    expect(solarActivity(CYCLE_25_MAXIMUM_JD)).toBeCloseTo(1, 3);
  });

  it("devrait culminer en octobre 2024, à un mois près", () => {
    let peakJd = 0;
    let peak = -1;
    for (let jd = jdOf(2022, 1); jd < jdOf(2027, 1); jd += 5) {
      const activity = solarActivity(jd);
      if (activity > peak) {
        peak = activity;
        peakJd = jd;
      }
    }
    expect(Math.abs(peakJd - CYCLE_25_MAXIMUM_JD)).toBeLessThan(31);
  });

  it("devrait rester sous 0,1 au minimum de décembre 2019, et à celui de décembre 2008 (onze ans plus tôt)", () => {
    expect(solarActivity(jdOf(2019, 12))).toBeLessThan(0.1);
    expect(solarActivity(jdOf(2008, 12))).toBeLessThan(0.1);
  });

  it("devrait monter de 2020 à 2023 et redescendre de 2025 à 2029", () => {
    const rise = [2020, 2021, 2022, 2023].map((year) => solarActivity(jdOf(year, 7)));
    const decline = [2025, 2026, 2027, 2028, 2029].map((year) => solarActivity(jdOf(year, 7)));
    for (let i = 1; i < rise.length; i++) expect(rise[i]).toBeGreaterThan(rise[i - 1]);
    for (let i = 1; i < decline.length; i++) expect(decline[i]).toBeLessThan(decline[i - 1]);
  });

  it("devrait se répéter tous les onze ans (période moyenne du cycle)", () => {
    expect(SOLAR_CYCLE_DAYS).toBeCloseTo(11 * YEAR_DAYS, 9);
    for (const jd of [jdOf(1990, 3), jdOf(2026, 10), jdOf(2041, 6)]) {
      expect(solarActivity(jd + SOLAR_CYCLE_DAYS)).toBeCloseTo(solarActivity(jd), 9);
    }
  });

  it("devrait rester entre 0 et 1 à toute date, de 1800 à 2100", () => {
    for (let jd = jdOf(1800, 1); jd < jdOf(2100, 1); jd += 17) {
      const activity = solarActivity(jd);
      expect(activity).toBeGreaterThanOrEqual(0);
      expect(activity).toBeLessThanOrEqual(1);
    }
  });
});

describe("sunspotLatitude", () => {
  it("devrait faire apparaître les taches vers 25° un an après le début du cycle", () => {
    expect(sunspotLatitude(CYCLE_25_START_JD + YEAR_DAYS)).toBeCloseTo(28 * Math.exp(-12 / 90), 1);
  });

  it("devrait donner environ 15° au maximum (loi de Spörer)", () => {
    expect(sunspotLatitude(CYCLE_25_MAXIMUM_JD)).toBeGreaterThan(13);
    expect(sunspotLatitude(CYCLE_25_MAXIMUM_JD)).toBeLessThan(17);
  });

  it("devrait descendre vers l'équateur au fil du cycle", () => {
    const latitudes = [1.5, 3, 5, 7, 9].map((years) => sunspotLatitude(CYCLE_25_START_JD + years * YEAR_DAYS));
    for (let i = 1; i < latitudes.length; i++) expect(latitudes[i]).toBeLessThan(latitudes[i - 1]);
  });

  it("devrait garder les taches de l'ancien cycle, près de l'équateur, juste après le minimum", () => {
    expect(sunspotLatitude(CYCLE_25_START_JD + 30)).toBeLessThan(8);
  });

  it("devrait rester entre 5° et 28° à toute date", () => {
    for (let jd = jdOf(1990, 1); jd < jdOf(2040, 1); jd += 23) {
      const latitude = sunspotLatitude(jd);
      expect(latitude).toBeGreaterThan(5);
      expect(latitude).toBeLessThanOrEqual(28);
    }
  });
});

describe("solarRotationRate", () => {
  it("devrait faire un tour en 24,5 jours à l'équateur", () => {
    expect(360 / solarRotationRate(0)).toBeCloseTo(24.47, 2);
  });

  it("devrait faire un tour en 34 jours environ aux pôles", () => {
    expect(360 / solarRotationRate(90)).toBeCloseTo(34.2, 1);
    expect(solarRotationRate(-90)).toBeCloseTo(solarRotationRate(90), 12);
  });

  it("devrait ralentir de l'équateur vers les pôles", () => {
    const rates = [0, 15, 30, 45, 60, 75, 90].map((latitude) => solarRotationRate(latitude));
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeLessThan(rates[i - 1]);
  });
});

describe("SUN_ROTATION", () => {
  it("devrait incliner le pôle du Soleil de 7,25° sur celui de l'écliptique", () => {
    const pole = poleDirection(SUN_ROTATION, CYCLE_25_START_JD);
    expect((Math.acos(pole.y) * 180) / Math.PI).toBeCloseTo(7.25, 1);
  });
});
