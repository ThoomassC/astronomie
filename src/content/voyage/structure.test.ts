import { describe, expect, it } from "vitest";
import { stopColor } from "@/components/journey/stopMeta";
import {
  BEYOND_MARKS,
  nearbyStarsSource,
  SOLAR_STOP_STRUCTURE,
  type BodyStopStructure,
} from "@/content/voyage/structure";
import { PLANETS } from "@/lib/astro/planets";
import { NEARBY_STARS_SOURCE } from "@/lib/astro/stars";
import { STOP_ORDER } from "@/lib/journey/camera";

const BODIES = SOLAR_STOP_STRUCTURE.filter((stop): stop is BodyStopStructure => stop.kind === "body");

describe("SOLAR_STOP_STRUCTURE", () => {
  it("devrait suivre l'ordre du voyage entre l'accueil et l'au-delà, la ceinture entre Mars et Jupiter", () => {
    const first = STOP_ORDER.indexOf("sun");
    const last = STOP_ORDER.indexOf("neptune");
    expect(SOLAR_STOP_STRUCTURE.map(({ key }) => key)).toEqual(STOP_ORDER.slice(first, last + 1));
    expect(SOLAR_STOP_STRUCTURE.filter(({ kind }) => kind === "interlude").map(({ key }) => key)).toEqual(["belt"]);
  });

  it("devrait donner leur rang aux huit planètes, dans l'ordre des données, et aucun au Soleil", () => {
    expect(BODIES.map(({ key, ordinal }) => [key, ordinal])).toEqual([
      ["sun", undefined],
      ...PLANETS.map(({ key }, index) => [key, index + 1]),
    ]);
  });

  it("devrait peindre chaque plaque de la couleur de sa pastille (règle des distances, menu des escales)", () => {
    for (const { key, color } of BODIES) expect(color, key).toBe(stopColor(key));
  });

  it("devrait donner à chaque astre son propre module explicatif", () => {
    expect(new Set(BODIES.map(({ module }) => module)).size).toBe(BODIES.length);
  });
});

describe("BEYOND_MARKS", () => {
  it("devrait ranger les repères du plus proche au plus lointain, sur l'échelle de 24 heures-lumière", () => {
    const hours = BEYOND_MARKS.map((mark) => mark.hours);
    hours.forEach((value, index) => {
      expect(value).toBeGreaterThan(index === 0 ? 0 : hours[index - 1]);
      expect(value).toBeLessThanOrEqual(24);
    });
    expect(BEYOND_MARKS.map(({ key }) => key)).toEqual(["neptune", "pluto", "kuiper", "voyager2", "voyager1"]);
  });

  it("devrait tracer le repère de Neptune de la couleur de la planète", () => {
    expect(BEYOND_MARKS[0].color).toBe(stopColor("neptune"));
  });
});

describe("nearbyStarsSource", () => {
  it("devrait garder telle quelle la liste française des références", () => {
    expect(nearbyStarsSource("fr")).toBe(NEARBY_STARS_SOURCE);
  });

  it.each(["en", "es"] as const)("devrait citer les mêmes références en %s, sans espace avant « ; »", (locale) => {
    const source = nearbyStarsSource(locale);
    expect(source).not.toMatch(/\s;/);
    expect(source.split("; ")).toEqual(NEARBY_STARS_SOURCE.split(" ; "));
  });
});
