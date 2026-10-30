import { describe, expect, it } from "vitest";
import {
  CMB_AGE_YEARS,
  CMB_TEMPERATURE_K,
  OBSERVABLE_UNIVERSE_RADIUS_GLY,
  UNIVERSE_AGE_GYR,
} from "@/lib/astro/universe";

describe("Univers observable", () => {
  it("devrait donner à l'Univers observable un rayon d'environ 46 milliards d'années-lumière (Planck 2018 : 46,1 à 46,2)", () => {
    expect(OBSERVABLE_UNIVERSE_RADIUS_GLY).toBe(46);
  });

  it("devrait dater l'Univers de 13,8 milliards d'années", () => {
    expect(UNIVERSE_AGE_GYR).toBe(13.8);
  });

  it("devrait voir plus loin que la lumière n'a voyagé : l'expansion a éloigné les sources (46 > 13,8)", () => {
    expect(OBSERVABLE_UNIVERSE_RADIUS_GLY).toBeGreaterThan(UNIVERSE_AGE_GYR);
  });

  it("devrait émettre le fond diffus 380 000 ans après le Big Bang, à 2,725 K aujourd'hui (Fixsen 2009 : 2,725 48 K)", () => {
    expect(CMB_AGE_YEARS).toBe(380_000);
    expect(CMB_TEMPERATURE_K).toBe(2.725_48);
  });

  it("devrait faire naître le fond diffus dans les trois premiers millièmes de l'histoire de l'Univers", () => {
    expect(CMB_AGE_YEARS / (UNIVERSE_AGE_GYR * 1e9)).toBeLessThan(0.003);
  });
});
