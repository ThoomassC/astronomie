import { describe, expect, it } from "vitest";
import { DAY_MS } from "@/lib/astro/constants";
import { decimalYear, NEPTUNE_YEAR_YEARS, orbitFraction, parseBirthYear } from "@/lib/astro/neptune";

describe("decimalYear", () => {
  it("devrait valoir 1970 à l'époque Unix", () => {
    expect(decimalYear(0)).toBe(1970);
  });

  it("devrait valoir ≈ 2000 le 1er janvier 2000", () => {
    expect(Math.abs(decimalYear(Date.UTC(2000, 0, 1)) - 2000)).toBeLessThan(0.01);
  });

  it("devrait compter des années de 365,25 jours", () => {
    expect(decimalYear(365.25 * DAY_MS)).toBeCloseTo(1971, 12);
  });
});

describe("orbitFraction", () => {
  it("devrait compter un peu plus d'une orbite de Neptune entre sa découverte (1846) et 2011", () => {
    expect(orbitFraction(1846, 2011, NEPTUNE_YEAR_YEARS)).toBeCloseTo(1.0013, 4);
  });

  it("devrait valoir 0 quand les deux années sont égales", () => {
    expect(orbitFraction(2000, 2000, NEPTUNE_YEAR_YEARS)).toBe(0);
  });

  it("devrait valoir 1 quand l'écart vaut exactement une période", () => {
    expect(orbitFraction(2000, 2001.8808, 1.8808)).toBeCloseTo(1, 12);
  });
});

describe("parseBirthYear", () => {
  it.each([
    ["2012", 2026, 2012],
    [" 1990 ", 2026, 1990],
    ["1846", 2026, 1846],
    ["2026", 2026, 2026],
  ])("devrait accepter %j quand l'année maximale est %i", (raw, maxYear, value) => {
    expect(parseBirthYear(raw, maxYear)).toEqual({ ok: true, value });
  });

  it.each([
    ["1845", "avant la découverte de Neptune"],
    ["2027", "après l'année maximale"],
    ["20a2", "non numérique"],
    ["2012.5", "décimale avec point"],
    ["2012,5", "décimale avec virgule"],
    ["", "vide"],
  ])("devrait refuser %j (%s) avec un message qui donne la plage 1846–2026", (raw) => {
    const result = parseBirthYear(raw, 2026);
    expect(result).toMatchObject({ ok: false });
    expect(result).toHaveProperty("error", expect.stringContaining("1846"));
    expect(result).toHaveProperty("error", expect.stringContaining("2026"));
  });

  it("devrait annoncer l'année maximale reçue en paramètre dans le message d'erreur", () => {
    expect(parseBirthYear("2031", 2030)).toEqual({
      ok: false,
      error: expect.stringContaining("2030"),
    });
  });
});
