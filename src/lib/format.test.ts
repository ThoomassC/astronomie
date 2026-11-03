import { describe, expect, it } from "vitest";
import { formatCompact, formatNumber, pad2 } from "@/lib/format";

/** Espace fine insécable (U+202F), séparateur de milliers imposé par la JSDoc. */
const NNBSP = "\u202F";

describe("formatNumber, en français", () => {
  it("devrait grouper les milliers par une espace fine insécable quand le nombre est grand", () => {
    expect(formatNumber(1392700, 0, "fr")).toBe(`1${NNBSP}392${NNBSP}700`);
  });

  it("devrait n'insérer aucun séparateur quand le nombre a moins de quatre chiffres", () => {
    expect(formatNumber(999, 0, "fr")).toBe("999");
  });

  it("devrait séparer les milliers dès 1 000", () => {
    expect(formatNumber(1000, 0, "fr")).toBe(`1${NNBSP}000`);
  });

  it("devrait écrire la virgule décimale et compléter par des zéros quand digits est donné", () => {
    expect(formatNumber(0.993, 4, "fr")).toBe("0,9930");
  });

  it("devrait combiner séparateur de milliers et virgule décimale", () => {
    expect(formatNumber(1234.25, 2, "fr")).toBe(`1${NNBSP}234,25`);
  });

  it("devrait limiter le nombre de décimales à digits", () => {
    expect(formatNumber(1 / 3, 2, "fr")).toBe("0,33");
  });

  it("devrait n'afficher aucune décimale quand digits vaut 0", () => {
    expect(formatNumber(0, 0, "fr")).toBe("0");
  });

  it("devrait afficher exactement digits zéros quand la valeur est nulle", () => {
    expect(formatNumber(0, 2, "fr")).toBe("0,00");
  });
});

describe("formatNumber, selon la langue (sortie d'Intl telle quelle)", () => {
  it.each([
    { locale: "en", expected: "1,392,700" },
    { locale: "es", expected: "1.392.700" },
  ] as const)("devrait grouper les milliers d'un grand nombre en $locale (« $expected »)", ({ locale, expected }) => {
    expect(formatNumber(1392700, 0, locale)).toBe(expected);
  });

  it.each([
    { locale: "fr", expected: `4${NNBSP}879` },
    { locale: "en", expected: "4,879" },
    { locale: "es", expected: "4879" },
  ] as const)(
    "devrait grouper un nombre de 4 chiffres en français et en anglais, pas en espagnol ($locale : « $expected »)",
    ({ locale, expected }) => {
      expect(formatNumber(4879, 0, locale)).toBe(expected);
    },
  );

  it.each([
    { locale: "fr", expected: `27${NNBSP}000` },
    { locale: "en", expected: "27,000" },
    { locale: "es", expected: "27.000" },
  ] as const)(
    "devrait grouper un nombre de 5 chiffres dans les trois langues ($locale : « $expected »)",
    ({ locale, expected }) => {
      expect(formatNumber(27000, 0, locale)).toBe(expected);
    },
  );

  it.each([
    { value: 0.39, digits: 2, locale: "en", expected: "0.39" },
    { value: 0.39, digits: 2, locale: "es", expected: "0,39" },
    { value: 1234.25, digits: 2, locale: "en", expected: "1,234.25" },
    { value: 1234.25, digits: 2, locale: "es", expected: "1234,25" },
    { value: 12345.6, digits: 1, locale: "en", expected: "12,345.6" },
    { value: 12345.6, digits: 1, locale: "es", expected: "12.345,6" },
  ] as const)(
    "devrait écrire les décimales de $value selon la langue ($locale : « $expected »)",
    ({ value, digits, locale, expected }) => {
      expect(formatNumber(value, digits, locale)).toBe(expected);
    },
  );

  it("devrait tenir un formateur par langue quand les décimales sont les mêmes", () => {
    expect(formatNumber(1234.5, 1, "fr")).toBe(`1${NNBSP}234,5`);
    expect(formatNumber(1234.5, 1, "en")).toBe("1,234.5");
  });
});

describe("formatCompact", () => {
  it.each([
    { value: 2.537e6, locale: "fr", expected: "2,5 millions" },
    { value: 2.537e6, locale: "en", expected: "2.5 million" },
    { value: 2.537e6, locale: "es", expected: "2,5 millones" },
    { value: 46.5e9, locale: "es", expected: "46,5 mil millones" },
  ] as const)("devrait écrire $value en mots en $locale (« $expected »)", ({ value, locale, expected }) => {
    expect(formatCompact(value, locale)).toBe(expected);
  });

  it("devrait n'écrire aucune décimale inutile (« 2 millions », pas « 2,0 millions »)", () => {
    expect(formatCompact(2e6, "fr")).toBe("2 millions");
  });

  it("devrait arrondir à digits décimales au plus", () => {
    expect(formatCompact(2.537e6, "en", 2)).toBe("2.54 million");
    expect(formatCompact(2.537e6, "en", 0)).toBe("3 million");
  });
});

describe("pad2", () => {
  it.each([
    [5, "05"],
    [0, "00"],
    [42, "42"],
  ])("devrait écrire %i sur deux chiffres (%s)", (value, expected) => {
    expect(pad2(value)).toBe(expected);
  });

  it("devrait garder tous les chiffres quand la valeur en a plus de deux", () => {
    expect(pad2(123)).toBe("123");
  });
});
