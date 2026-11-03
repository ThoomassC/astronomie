import { describe, expect, it } from "vitest";
import { pixelsPerSolarRadius, scaleBarBox, scaleBarFor, scaleBarPlacement, scaleBarSpot, scaleBarSun } from "@/lib/sizes/scaleBar";

describe("pixelsPerSolarRadius", () => {
  it("devrait rapporter un rayon solaire à la hauteur de vue : h / (2 × dist × tan(champ / 2))", () => {
    expect(pixelsPerSolarRadius(900, 100, 36)).toBeCloseTo(900 / (200 * Math.tan((18 * Math.PI) / 180)), 9);
  });

  it("devrait diminuer quand la caméra recule", () => {
    expect(pixelsPerSolarRadius(900, 200, 36)).toBeCloseTo(pixelsPerSolarRadius(900, 100, 36) / 2, 9);
  });
});

describe("scaleBarFor", () => {
  describe("en Soleils côte à côte, quand le Soleil fait 24 px ou moins à l'écran", () => {
    it.each([
      [6.4, 160, 10, 128],
      [12, 112, 2, 48],
      [0.07, 160, 1000, 140],
      [0.01, 160, 5000, 100],
      [2e-4, 240, 500_000, 200],
      [1e-7, 240, 1_000_000, 0.2],
    ])(
      "devrait prendre le plus grand nombre de la suite 1-2-5, de 2 à 1 000 000, qui tient (%f px par R☉, %i px au plus : %i Soleils, %f px)",
      (pxPerSolarRadius, maxPx, count, lengthPx) => {
        expect(scaleBarFor(pxPerSolarRadius, maxPx)).toEqual({ unit: "suns", count, lengthPx: expect.closeTo(lengthPx, 9) });
      },
    );

    it("devrait compter en Soleils quand le Soleil fait 24 px de diamètre à l'écran", () => {
      expect(scaleBarFor(12, 160).unit).toBe("suns");
    });

    it("devrait garder 2 Soleils, le plus petit de la suite, quand rien ne tient", () => {
      expect(scaleBarFor(12, 40)).toEqual({ unit: "suns", count: 2, lengthPx: 48 });
    });
  });

  describe("en kilomètres, quand le Soleil se voit assez lui-même", () => {
    it.each([
      // Cygnus X-1 au repos : 0,41 px par km.
      [285_000, 240, 500, 204.83],
      // Proxima du Centaure au repos : un Soleil de 30 px.
      [15, 240, 5_000_000, 107.805],
      [400, 240, 200_000, 114.992],
    ])(
      "devrait prendre le plus grand nombre de la suite 1-2-5, de 1 à 5 000 000 km, qui tient (%f px par R☉, %i px au plus : %i km, %f px)",
      (pxPerSolarRadius, maxPx, count, lengthPx) => {
        expect(scaleBarFor(pxPerSolarRadius, maxPx)).toEqual({ unit: "km", count, lengthPx: expect.closeTo(lengthPx, 2) });
      },
    );

    it("devrait passer aux kilomètres dès que le Soleil dépasse 24 px", () => {
      expect(scaleBarFor(12.01, 160).unit).toBe("km");
    });

    it("devrait garder 1 km, le plus petit de la suite, quand rien ne tient", () => {
      expect(scaleBarFor(1e9, 240)).toEqual({ unit: "km", count: 1, lengthPx: expect.closeTo(1e9 / 695_700, 6) });
    });
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

/*
 * Grand écran : l'échelle graphique se pose sous les astres, centrée sur la zone libre (de 648 à 1 224 px sur
 * 1 440 × 900), à 16 px sous le plus bas des disques qui passent au-dessus d'elle, jamais à moins de 24 px du bas.
 */
describe("scaleBarPlacement", () => {
  const VIEW = { width: 1440, height: 900 };
  const ZONE = { left: 648, right: 1224 };
  const SIZE = { width: 200, height: 52 };

  it("devrait centrer l'échelle sur la zone libre, 16 px sous la ligne des centres quand aucun astre ne passe au-dessus", () => {
    expect(scaleBarPlacement([], ZONE, SIZE, VIEW)).toEqual({ left: 836, top: 466 });
  });

  it("devrait la poser 16 px sous le bas d'un disque centré au-dessus d'elle", () => {
    expect(scaleBarPlacement([{ x: 900, y: 450, radius: 200 }], ZONE, SIZE, VIEW)).toEqual({ left: 836, top: 666 });
  });

  it("devrait la poser sous la partie d'un disque voisin qui passe au-dessus de son bord (centre à 30 px de son bord)", () => {
    const top = scaleBarPlacement([{ x: 1066, y: 450, radius: 50 }], ZONE, SIZE, VIEW).top;
    expect(top).toBeCloseTo(450 + 40 + 16, 9);
  });

  it("devrait ignorer un disque qui ne passe pas au-dessus d'elle", () => {
    expect(scaleBarPlacement([{ x: 700, y: 450, radius: 100 }], ZONE, SIZE, VIEW).top).toBe(466);
  });

  it("devrait s'arrêter à 24 px du bas de la vue sous un astre qui la remplit", () => {
    expect(scaleBarPlacement([{ x: 936, y: 450, radius: 600 }], ZONE, SIZE, VIEW).top).toBe(900 - 24 - 52);
    expect(scaleBarPlacement([{ x: 936, y: 450, radius: Infinity }], ZONE, SIZE, VIEW).top).toBe(900 - 24 - 52);
  });
});

/*
 * Où se pose l'échelle graphique : en mise en page compacte, la feuille de style la met en haut à droite, sous la
 * barre ; sur grand écran, sous les astres quand l'espace libre est assez large (240 px de trait) et haut (600 px) ;
 * sinon (zone étroite d'une tablette, téléphone en paysage), dans le coin haut droit de l'espace libre, trait court.
 */
describe("scaleBarSpot", () => {
  it.each([
    [true, { left: 648, right: 1224 }, { width: 1440, height: 900 }, "css"],
    [false, { left: 648, right: 1224 }, { width: 1440, height: 900 }, "under"],
    [false, null, { width: 1440, height: 900 }, "under"],
    [false, { left: 584, right: 820 }, { width: 1024, height: 768 }, "corner"],
    [false, { left: 554, right: 820 }, { width: 844, height: 390 }, "corner"],
  ] as const)("devrait choisir sa place (compacte : %s, zone %o, vue %o → %s)", (compact, zone, view, spot) => {
    expect(scaleBarSpot(compact, zone, view)).toBe(spot);
  });
});

describe("scaleBarBox", () => {
  const DISCS = [{ x: 900, y: 450, radius: 200 }];

  it("devrait réserver, sous les astres, la place de l'échelle au trait le plus long (298 px), centrée sur la zone", () => {
    expect(
      scaleBarBox({ compact: false, zone: { left: 648, right: 1224 }, view: { width: 1440, height: 900 }, barBottom: 76, discs: DISCS, measured: null }),
    ).toEqual([787, 666, 1085, 722]);
  });

  it("devrait prendre la largeur mesurée quand le texte est plus large que le trait", () => {
    const box = scaleBarBox({
      compact: false,
      zone: { left: 648, right: 1224 },
      view: { width: 1440, height: 900 },
      barBottom: 76,
      discs: DISCS,
      measured: { width: 320, height: 60 },
    });
    expect(box).toEqual([776, 666, 1096, 726]);
  });

  it("devrait la poser dans le coin haut droit de l'espace libre, 8 px sous la barre, quand la zone est étroite", () => {
    expect(
      scaleBarBox({ compact: false, zone: { left: 554, right: 820 }, view: { width: 844, height: 390 }, barBottom: 76, discs: DISCS, measured: null }),
    ).toEqual([650, 84, 820, 140]);
  });

  it("devrait réserver, en mise en page compacte, sa place en haut à droite, sous la barre (16 px du bord)", () => {
    expect(scaleBarBox({ compact: true, zone: null, view: { width: 375, height: 812 }, barBottom: 76, discs: DISCS, measured: null })).toEqual([
      189, 84, 359, 140,
    ]);
  });
});
