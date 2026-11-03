import { describe, expect, it } from "vitest";
import { COMPARED_OBJECTS, comparedRadiusSolar } from "@/lib/sizes/objects";
import { SIZE_RAIL_TICKS, sizeRailPercent } from "@/lib/sizes/sizeRail";

describe("sizeRailPercent", () => {
  it.each([
    [1e-4, 4],
    [1e-3, 13.2],
    [1, 40.8],
    [10, 50],
    [1420, 69.8011],
    [1e6, 96],
  ])("devrait suivre 4 + 92 × log10(r / 10⁻⁴) / 10 (%f R☉ → %f %)", (radiusSolar, expected) => {
    expect(sizeRailPercent(radiusSolar)).toBeCloseTo(expected, 4);
  });

  it("devrait placer les quatorze astres du comparateur dans l'ordre, de haut en bas, strictement entre 4 % et 96 %", () => {
    const percents = COMPARED_OBJECTS.map((object) => sizeRailPercent(comparedRadiusSolar(object)));
    percents.slice(1).forEach((percent, i) => expect(percent).toBeGreaterThan(percents[i]));
    expect(Math.min(...percents)).toBeGreaterThan(4);
    expect(Math.max(...percents)).toBeLessThan(96);
  });
});

describe("SIZE_RAIL_TICKS", () => {
  it("devrait graduer chaque puissance de dix de 10⁻⁴ à 10⁶ R☉, seule celle du Soleil (1 R☉) étant majeure", () => {
    expect(SIZE_RAIL_TICKS).toHaveLength(11);
    SIZE_RAIL_TICKS.forEach((tick, i) => expect(tick.percent).toBeCloseTo(4 + 9.2 * i, 9));
    expect(SIZE_RAIL_TICKS.filter((tick) => tick.major)).toEqual([{ percent: expect.closeTo(40.8, 9), major: true }]);
  });
});
