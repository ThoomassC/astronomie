import { describe, expect, it } from "vitest";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { TEMPERATURE_SCALE_STOPS, temperatureScalePercent, temperatureTint } from "@/lib/sizes/temperature";

/*
 * Réglette des températures de la plaque : échelle logarithmique de 2 500 à 13 000 K, couleurs de corps noir de
 * Charity ; et le mot qui dit la couleur d'une étoile. Valeurs attendues : design v2, § 4.4.
 */

describe("temperatureScalePercent", () => {
  it.each([
    [2500, 0],
    [2900, 9],
    [3600, 22.1],
    [5772, 50.8],
    [9845, 83.1],
    [12_100, 95.6],
    [13_000, 100],
  ])("devrait placer %i K à %f % de la réglette : ln(T / 2 500) / ln(5,2)", (temperatureK, percent) => {
    expect(temperatureScalePercent(temperatureK)).toBeCloseTo(percent, 1);
  });

  it("devrait placer les dix étoiles sur la réglette, entre ses deux bouts", () => {
    const percents = COMPARED_STARS.map((star) => temperatureScalePercent(star.temperatureK));
    expect(Math.min(...percents)).toBeGreaterThan(0);
    expect(Math.max(...percents)).toBeLessThan(100);
  });
});

describe("TEMPERATURE_SCALE_STOPS", () => {
  it("devrait colorer la réglette des couleurs de corps noir de Charity, du plus froid au plus chaud", () => {
    expect(TEMPERATURE_SCALE_STOPS).toEqual([
      { temperatureK: 2800, color: "#ffb25b" },
      { temperatureK: 3500, color: "#ffc987" },
      { temperatureK: 4300, color: "#ffdbaf" },
      { temperatureK: 5800, color: "#fff1e7" },
      { temperatureK: 7000, color: "#f7f5ff" },
      { temperatureK: 9800, color: "#d1dcff" },
      { temperatureK: 12_100, color: "#c2d1ff" },
    ]);
  });
});

describe("temperatureTint", () => {
  it.each([
    [2900, "orange"],
    [3799, "orange"],
    [3800, "pale-orange"],
    [5199, "pale-orange"],
    [5200, "white"],
    [5772, "white"],
    [7500, "white"],
    [7501, "bluish-white"],
    [12_100, "bluish-white"],
  ] as const)("devrait dire la couleur d'une étoile à %i K : %s", (temperatureK, tint) => {
    expect(temperatureTint(temperatureK)).toBe(tint);
  });
});
