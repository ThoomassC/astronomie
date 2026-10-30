import { describe, expect, it } from "vitest";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { isSizeStopKey, SIZE_STOP_IDS, SIZE_STOP_ORDER, sizeStarIndex, sizeStopAnchor } from "@/lib/sizes/stops";

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("SIZE_STOP_ORDER", () => {
  it("devrait compter onze escales : l'introduction, puis les dix étoiles de la plus petite à la plus grande", () => {
    expect(SIZE_STOP_ORDER).toEqual([
      "intro", "proxima-centauri", "sun", "sirius-a", "pollux", "arcturus", "aldebaran", "rigel", "antares-a", "betelgeuse",
      "vy-canis-majoris",
    ]);
  });

  it("devrait suivre, après l'introduction, l'ordre des étoiles comparées (rayons croissants)", () => {
    expect(SIZE_STOP_ORDER).toEqual(["intro", ...COMPARED_STARS.map((star) => star.key)]);
  });
});

describe("isSizeStopKey", () => {
  it.each(SIZE_STOP_ORDER)("devrait reconnaître l'escale %s", (key) => {
    expect(isSizeStopKey(key)).toBe(true);
  });

  it.each([undefined, "", "hero", "saturn", "Sun", "tailles", "soleil"])(
    "devrait refuser %s, qui n'est pas une clé d'escale des tailles",
    (value) => {
      expect(isSizeStopKey(value)).toBe(false);
    },
  );
});

describe("SIZE_STOP_IDS", () => {
  it("devrait donner à chaque escale son ancre, identique dans les trois langues", () => {
    expect(SIZE_STOP_IDS).toEqual({
      intro: "tailles",
      "proxima-centauri": "proxima-du-centaure",
      sun: "soleil",
      "sirius-a": "sirius-a",
      pollux: "pollux",
      arcturus: "arcturus",
      aldebaran: "aldebaran",
      rigel: "rigel",
      "antares-a": "antares-a",
      betelgeuse: "betelgeuse",
      "vy-canis-majoris": "vy-canis-majoris",
    });
  });

  it("devrait donner à chaque escale un identifiant unique", () => {
    const ids = Object.values(SIZE_STOP_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(Object.entries(SIZE_STOP_IDS))(
    "devrait donner à l'escale %s un identifiant ASCII en kebab-case, utilisable tel quel en ancre (%s)",
    (_key, id) => {
      expect(id).toMatch(KEBAB_CASE);
    },
  );
});

describe("sizeStopAnchor", () => {
  it.each([
    ["intro", "#tailles"],
    ["proxima-centauri", "#proxima-du-centaure"],
    ["vy-canis-majoris", "#vy-canis-majoris"],
  ] as const)("devrait donner l'ancre de l'escale %s (%s)", (key, anchor) => {
    expect(sizeStopAnchor(key)).toBe(anchor);
  });
});

describe("sizeStarIndex", () => {
  it.each([
    ["intro", 0],
    ["proxima-centauri", 0],
    ["sun", 1],
    ["betelgeuse", 8],
    ["vy-canis-majoris", 9],
  ] as const)("devrait donner l'indice de l'étoile montrée à l'escale %s (%i) ; l'introduction montre la plus petite", (key, index) => {
    expect(sizeStarIndex(key)).toBe(index);
  });

  it.each(COMPARED_STARS.map((star, index) => [star.key, index] as const))(
    "devrait retrouver l'étoile %s à son rang dans les données (%i)",
    (key, index) => {
      expect(COMPARED_STARS[sizeStarIndex(key)].key).toBe(key);
      expect(sizeStarIndex(key)).toBe(index);
    },
  );
});
