import { describe, expect, it } from "vitest";
import { pixelsPerSolarRadius, scaleBarFor, scaleBarSun } from "@/lib/sizes/scaleBar";

describe("pixelsPerSolarRadius", () => {
  it("devrait rapporter un rayon solaire à la hauteur de vue : h / (2 × dist × tan(champ / 2))", () => {
    expect(pixelsPerSolarRadius(900, 100, 36)).toBeCloseTo(900 / (200 * Math.tan((18 * Math.PI) / 180)), 9);
  });

  it("devrait diminuer quand la caméra recule", () => {
    expect(pixelsPerSolarRadius(900, 200, 36)).toBeCloseTo(pixelsPerSolarRadius(900, 100, 36) / 2, 9);
  });
});

describe("scaleBarFor", () => {
  it.each([
    [6.4, 160, 10, 128],
    [12, 112, 2, 48],
    [0.07, 160, 1000, 140],
    [0.01, 160, 2000, 40],
  ])(
    "devrait prendre le plus grand nombre de Soleils côte à côte qui tient (%f px par R☉, %i px au plus : %i Soleils, %f px)",
    (pxPerSolarRadius, maxPx, suns, lengthPx) => {
      expect(scaleBarFor(pxPerSolarRadius, maxPx)).toEqual({ suns, lengthPx: expect.closeTo(lengthPx, 9) });
    },
  );

  it("devrait laisser paraître l'échelle quand le Soleil fait 24 px de diamètre à l'écran", () => {
    expect(scaleBarFor(12, 160)).not.toBeNull();
  });

  it("ne devrait rien montrer quand le Soleil fait plus de 24 px : il se voit assez lui-même", () => {
    expect(scaleBarFor(12.01, 160)).toBeNull();
  });
});

describe("scaleBarSun", () => {
  it.each([
    [24, "disc"],
    [4, "disc"],
    [3.9, "ring"],
    [0.2, "ring"],
  ] as const)("devrait dessiner le Soleil de %f px en %s (disque à l'échelle de 4 à 24 px, sinon un point dans un anneau)", (diameter, mark) => {
    expect(scaleBarSun(diameter)).toBe(mark);
  });
});
