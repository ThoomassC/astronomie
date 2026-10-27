import { describe, expect, it } from "vitest";
import { ringOpeningDeg, SATURN_YEAR_YEARS } from "@/lib/astro/saturn";

describe("ringOpeningDeg", () => {
  it("devrait montrer les anneaux par la tranche (≈ 0°) début 2025", () => {
    expect(Math.abs(ringOpeningDeg(2025.2))).toBeLessThan(0.5);
  });

  it("devrait montrer largement la face nord (> 25°) en 2017", () => {
    expect(ringOpeningDeg(2017)).toBeGreaterThan(25);
  });

  it("devrait montrer largement la face sud (< −26°) mi-2032", () => {
    expect(ringOpeningDeg(2032.6)).toBeLessThan(-26);
  });

  it("devrait revenir par la tranche (|B| < 1°) fin 2039", () => {
    expect(Math.abs(ringOpeningDeg(2039.9))).toBeLessThan(1);
  });

  it("devrait se répéter à chaque année saturnienne", () => {
    expect(ringOpeningDeg(2010 + SATURN_YEAR_YEARS)).toBeCloseTo(ringOpeningDeg(2010), 9);
  });
});
