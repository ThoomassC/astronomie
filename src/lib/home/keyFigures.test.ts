import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { KEY_FIGURE_COLORS, KEY_FIGURES, keyFigureParts } from "@/lib/home/keyFigures";

/** Espace fine insécable (U+202F) : le séparateur de milliers d'Intl en français. */
const NNBSP = "\u202f";

/** Valeur telle qu'on la lit, morceaux recollés par une espace. */
const joined = (parts: ReturnType<typeof keyFigureParts>) => parts.map((part) => part.text).join(" ");

describe("KEY_FIGURES", () => {
  it("devrait ranger les quatre chiffres : le Soleil, sa lumière, l'étoile voisine, la plus grande étoile", () => {
    expect(KEY_FIGURES).toEqual(["sunWidth", "sunlight", "proxima", "largestStar"]);
  });

  it("devrait donner à chaque chiffre la couleur de l'astre dont il parle", () => {
    expect(KEY_FIGURE_COLORS).toEqual({
      sunWidth: "#FFB13B",
      sunlight: "#5B9BE6",
      proxima: "#CFDCFF",
      largestStar: "#FFC987",
    });
  });
});

describe("keyFigureParts", () => {
  it.each(LOCALES)("devrait compter 109 Terres dans la largeur du Soleil (%s)", (locale) => {
    expect(keyFigureParts("sunWidth", locale)).toEqual([{ kind: "number", text: "109" }]);
  });

  it.each(LOCALES)("devrait écrire le trajet de la lumière en nombres et symboles : 8 min 19 s (%s)", (locale) => {
    expect(keyFigureParts("sunlight", locale)).toEqual([
      { kind: "number", text: "8" },
      { kind: "symbol", text: "min" },
      { kind: "number", text: "19" },
      { kind: "symbol", text: "s" },
    ]);
  });

  it.each([
    ["fr", "4,2"],
    ["en", "4.2"],
    ["es", "4,2"],
  ] as const)("devrait écrire la distance de Proxima avec une décimale (%s : « %s »)", (locale, value) => {
    expect(joined(keyFigureParts("proxima", locale))).toBe(value);
  });

  it.each([
    ["fr", `1${NNBSP}420`],
    ["en", "1,420"],
    ["es", "1420"],
  ] as const)("devrait écrire le rayon de VY Canis Majoris selon la langue (%s : « %s »)", (locale, value) => {
    expect(joined(keyFigureParts("largestStar", locale))).toBe(value);
  });
});
