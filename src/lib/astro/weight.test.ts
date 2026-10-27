import { describe, expect, it } from "vitest";
import { parseMassKg, scaleReadingKg } from "@/lib/astro/weight";

describe("scaleReadingKg", () => {
  it("devrait afficher ≈ 15,13 kg pour 40 kg sur Mars (g = 3,71)", () => {
    expect(scaleReadingKg(40, 3.71)).toBeCloseTo(15.127, 3);
  });

  it("devrait afficher la masse elle-même quand g est celui de la Terre", () => {
    expect(scaleReadingKg(70, 9.81)).toBeCloseTo(70, 12);
  });

  it("devrait afficher 0 quand la masse est nulle", () => {
    expect(scaleReadingKg(0, 24.79)).toBe(0);
  });
});

describe("parseMassKg", () => {
  it.each([
    ["40", 40],
    ["62,5", 62.5],
    ["62.5", 62.5],
    [" 70 ", 70],
    ["1", 1],
    ["300", 300],
  ])("devrait accepter %j (%f kg)", (raw, value) => {
    expect(parseMassKg(raw)).toEqual({ ok: true, value });
  });

  it.each([
    ["", "vide"],
    ["   ", "que des espaces"],
    ["abc", "non numérique"],
    ["12abc", "nombre suivi de lettres"],
    ["0", "sous le minimum"],
    ["0,99", "juste sous le minimum"],
    ["301", "au-dessus du maximum"],
    ["300,5", "juste au-dessus du maximum"],
    ["-5", "négatif"],
  ])("devrait refuser %j (%s) avec un message d'erreur", (raw) => {
    expect(parseMassKg(raw)).toEqual({ ok: false, error: expect.stringMatching(/\S/) });
  });
});
