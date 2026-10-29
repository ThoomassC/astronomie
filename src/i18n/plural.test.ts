import { describe, expect, it } from "vitest";
import { plural, pluralCategory } from "@/i18n/plural";

describe("pluralCategory", () => {
  it.each([
    { locale: "fr", n: 0, expected: "one" },
    { locale: "fr", n: 1.5, expected: "one" },
    { locale: "fr", n: 2, expected: "other" },
    { locale: "fr", n: 1e6, expected: "many" },
    { locale: "en", n: 0, expected: "other" },
    { locale: "en", n: 1, expected: "one" },
    { locale: "en", n: 1.07, expected: "other" },
    { locale: "es", n: 1, expected: "one" },
    { locale: "es", n: 1e6, expected: "many" },
  ] as const)("devrait ranger $n dans la catégorie CLDR « $expected » en $locale", ({ locale, n, expected }) => {
    expect(pluralCategory(locale, n)).toBe(expected);
  });
});

describe("plural", () => {
  const ORBITS = { one: "orbit", other: "orbits" };
  const YEARS = { one: "año", other: "años", many: "de años" };

  it("devrait choisir la forme « one » quand n est au singulier", () => {
    expect(plural("en", 1, ORBITS)).toBe("orbit");
  });

  it("devrait choisir la forme « other » quand n est au pluriel", () => {
    expect(plural("en", 1.07, ORBITS)).toBe("orbits");
  });

  it("devrait choisir la forme « many » quand elle est donnée et que n est un grand nombre rond", () => {
    expect(plural("es", 1e6, YEARS)).toBe("de años");
  });

  it("devrait se rabattre sur « other » quand la forme « many » manque", () => {
    expect(plural("fr", 1e6, { one: "an", other: "ans" })).toBe("ans");
  });
});
