import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { BODY_NAMES, bodyName, type NamedBody } from "@/i18n/names";
import { PLANETS } from "@/lib/astro/planets";

/** Le Soleil, les huit planètes dans l'ordre des données, la Lune. */
const BODIES: readonly NamedBody[] = ["sun", ...PLANETS.map((planet) => planet.key), "moon"];

describe("BODY_NAMES", () => {
  it.each(LOCALES)("devrait nommer les 10 astres en %s, et rien d'autre", (locale) => {
    expect(new Set(Object.keys(BODY_NAMES[locale]))).toEqual(new Set(BODIES));
  });

  it.each(LOCALES.flatMap((locale) => BODIES.map((body) => ({ locale, body }))))(
    "devrait donner un nom non vide à $body en $locale",
    ({ locale, body }) => {
      expect(bodyName(body, locale).trim()).not.toBe("");
    },
  );

  it.each(LOCALES)("devrait donner un nom différent à chaque astre en %s", (locale) => {
    expect(new Set(Object.values(BODY_NAMES[locale])).size).toBe(BODIES.length);
  });

  it("devrait garder les noms français d'aujourd'hui", () => {
    expect(BODY_NAMES.fr).toEqual({
      sun: "Soleil",
      mercury: "Mercure",
      venus: "Vénus",
      earth: "Terre",
      mars: "Mars",
      jupiter: "Jupiter",
      saturn: "Saturne",
      uranus: "Uranus",
      neptune: "Neptune",
      moon: "Lune",
    });
  });
});

describe("bodyName", () => {
  it.each([
    ["jupiter", "es", "Júpiter"],
    ["saturn", "en", "Saturn"],
    ["earth", "es", "Tierra"],
    ["venus", "fr", "Vénus"],
    ["sun", "es", "Sol"],
    ["moon", "en", "Moon"],
  ] as const)("devrait nommer %s en %s « %s »", (body, locale, expected) => {
    expect(bodyName(body, locale)).toBe(expected);
  });
});
