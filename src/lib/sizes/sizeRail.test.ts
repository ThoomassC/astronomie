import { describe, expect, it } from "vitest";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { SIZE_RAIL_TICKS, sizeRailPercent } from "@/lib/sizes/sizeRail";

describe("sizeRailPercent", () => {
  it.each([
    [0.1, 4],
    [1, 25.3902],
    [10, 46.7805],
    [1420, 92.8184],
    [2000, 96],
  ])("devrait suivre 4 + 92 × log10(r / 0,1) / log10(2 000 / 0,1) (%f R☉ → %f %)", (radiusSolar, expected) => {
    expect(sizeRailPercent(radiusSolar)).toBeCloseTo(expected, 4);
  });

  it("devrait placer les dix étoiles du comparateur dans l'ordre, de haut en bas, entre 4 % et 96 %", () => {
    const percents = COMPARED_STARS.map((star) => sizeRailPercent(star.radiusSolar));
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    expect(new Set(percents).size).toBe(percents.length);
    expect(Math.min(...percents)).toBeGreaterThan(4);
    expect(Math.max(...percents)).toBeLessThan(96);
  });
});

describe("SIZE_RAIL_TICKS", () => {
  it("devrait graduer chaque puissance de dix de 0,1 à 1 000 R☉, seule celle du Soleil (1 R☉) étant majeure", () => {
    expect(SIZE_RAIL_TICKS).toEqual([
      { percent: expect.closeTo(4, 4), major: false },
      { percent: expect.closeTo(25.3902, 4), major: true },
      { percent: expect.closeTo(46.7805, 4), major: false },
      { percent: expect.closeTo(68.1707, 4), major: false },
      { percent: expect.closeTo(89.5609, 4), major: false },
    ]);
  });
});
