import { describe, expect, it } from "vitest";
import { formatNumber, pad2 } from "@/lib/format";

/** Espace fine insécable (U+202F), séparateur de milliers imposé par la JSDoc. */
const NNBSP = "\u202F";

describe("formatNumber", () => {
  it("devrait grouper les milliers par une espace fine insécable quand le nombre est grand", () => {
    expect(formatNumber(1392700)).toBe(`1${NNBSP}392${NNBSP}700`);
  });

  it("devrait n'insérer aucun séparateur quand le nombre a moins de quatre chiffres", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("devrait séparer les milliers dès 1 000", () => {
    expect(formatNumber(1000)).toBe(`1${NNBSP}000`);
  });

  it("devrait écrire la virgule décimale et compléter par des zéros quand digits est donné", () => {
    expect(formatNumber(0.993, 4)).toBe("0,9930");
  });

  it("devrait combiner séparateur de milliers et virgule décimale", () => {
    expect(formatNumber(1234.25, 2)).toBe(`1${NNBSP}234,25`);
  });

  it("devrait limiter le nombre de décimales à digits", () => {
    expect(formatNumber(1 / 3, 2)).toBe("0,33");
  });

  it("devrait n'afficher aucune décimale quand digits est omis", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("devrait afficher exactement digits zéros quand la valeur est nulle", () => {
    expect(formatNumber(0, 2)).toBe("0,00");
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
