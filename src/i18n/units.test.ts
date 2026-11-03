import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { UNITS, withUnit } from "@/i18n/units";

describe("UNITS", () => {
  it.each([
    ["fr", "au", "UA"],
    ["fr", "ly", "al"],
    ["en", "au", "AU"],
    ["en", "ly", "ly"],
    ["es", "au", "UA"],
    ["es", "ly", "al"],
  ] as const)("devrait écrire l'unité %s.%s « %s »", (locale, unit, expected) => {
    expect(UNITS[locale][unit]).toBe(expected);
  });

  it.each(LOCALES)("devrait garder km, R☉, K, ″, ° et % dans toutes les langues (%s)", (locale) => {
    // Points de code explicites : ☉ U+2609 (Soleil), ″ U+2033 (double prime, pas le guillemet droit), ° U+00B0.
    expect(UNITS[locale]).toMatchObject({
      km: "km",
      solarRadius: "R☉",
      kelvin: "K",
      arcsec: "″",
      degree: "°",
      percent: "%",
    });
  });
});

describe("withUnit", () => {
  it.each([
    { value: "1,52", unit: "au", locale: "fr", expected: "1,52 UA" },
    { value: "1.52", unit: "au", locale: "en", expected: "1.52 AU" },
    { value: "1,52", unit: "au", locale: "es", expected: "1,52 UA" },
    { value: "27\u202F000", unit: "ly", locale: "fr", expected: "27\u202F000 al" },
    { value: "27,000", unit: "ly", locale: "en", expected: "27,000 ly" },
    { value: "27.000", unit: "ly", locale: "es", expected: "27.000 al" },
    { value: "1.392.700", unit: "km", locale: "es", expected: "1.392.700 km" },
    { value: "764", unit: "solarRadius", locale: "en", expected: "764 R☉" },
    { value: "5\u202F772", unit: "kelvin", locale: "fr", expected: "5\u202F772 K" },
  ] as const)(
    "devrait séparer le nombre de son unité par une espace ordinaire en $locale (« $expected »)",
    ({ value, unit, locale, expected }) => {
      expect(withUnit(value, unit, locale)).toBe(expected);
    },
  );

  it.each(LOCALES.flatMap((locale) => [{ locale, unit: "arcsec" as const }, { locale, unit: "degree" as const }]))(
    "devrait coller la seconde d'arc et le degré au nombre ($unit, $locale)",
    ({ locale, unit }) => {
      expect(withUnit("24", unit, locale)).toBe(`24${UNITS[locale][unit]}`);
    },
  );

  it.each([
    { locale: "fr", expected: "49 %" },
    { locale: "en", expected: "49%" },
    { locale: "es", expected: "49 %" },
  ] as const)("devrait espacer % selon la langue ($locale : « $expected »)", ({ locale, expected }) => {
    expect(withUnit("49", "percent", locale)).toBe(expected);
  });
});
