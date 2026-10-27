import { describe, expect, it } from "vitest";
import { formatDuration, lightSeconds } from "@/lib/astro/light";

describe("lightSeconds", () => {
  it("devrait valoir 499,004784 s quand la distance est de 1 UA", () => {
    expect(lightSeconds(1)).toBeCloseTo(499.004784, 9);
  });

  it("devrait valoir 0 quand la distance est nulle", () => {
    expect(lightSeconds(0)).toBe(0);
  });

  it("devrait être proportionnel à la distance (Neptune, 30,07 UA ≈ 4 h 10)", () => {
    expect(lightSeconds(30.07)).toBeCloseTo(15005.074, 3);
  });
});

describe("formatDuration", () => {
  it.each([
    [15, "15 s"],
    [5, "5 s"],
    [0, "0 s"],
  ])("devrait afficher seulement les secondes quand la durée est sous la minute (%f s → %s)", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it("devrait tronquer (jamais arrondir au supérieur) quand la durée est fractionnaire", () => {
    expect(formatDuration(59.9)).toBe("59 s");
  });

  it.each([
    [60, "1 min 00 s"],
    [65, "1 min 05 s"],
    [499.005, "8 min 19 s"],
    [3599.9, "59 min 59 s"],
  ])("devrait afficher minutes et secondes sur deux chiffres quand la durée est sous l'heure (%f s → %s)", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it.each([
    [3600, "1 h 00 min"],
    [3660, "1 h 01 min"],
    [15005, "4 h 10 min"],
    [36000, "10 h 00 min"],
  ])("devrait afficher heures et minutes sur deux chiffres quand la durée dépasse l'heure (%f s → %s)", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it.each([
    [-1],
    [Number.NaN],
  ])("devrait afficher « 0 s » quand l'entrée est invalide (%f)", (seconds) => {
    expect(formatDuration(seconds)).toBe("0 s");
  });
});
