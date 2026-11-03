import { describe, expect, it } from "vitest";
import { AU_PER_LIGHT_YEAR, type Vec3 } from "@/lib/astro/constants";
import {
  LINEAR_UNITS_PER_AU,
  compressedRadius,
  sceneAxes,
  sceneRadius,
  toScene,
  unitsPerLightYear,
  zoomScale,
} from "@/lib/astro/scale";

describe("compressedRadius", () => {
  it.each([
    [0, 12],
    [1, 34],
    [4, 56],
  ])("devrait suivre 12 + 22·√r (r = %f UA → %f)", (au, expected) => {
    expect(compressedRadius(au)).toBeCloseTo(expected, 12);
  });
});

describe("sceneRadius", () => {
  it("devrait valoir le rayon compressé quand realScale = 0", () => {
    expect(sceneRadius(1, 0)).toBeCloseTo(34, 12);
  });

  it("devrait valoir 4,41 unités par UA quand realScale = 1", () => {
    expect(sceneRadius(30.07, 1)).toBeCloseTo(132.6, 1);
  });

  it("devrait interpoler linéairement entre les deux échelles quand realScale = 0,5", () => {
    expect(sceneRadius(1, 0.5)).toBeCloseTo((34 + 4.41) / 2, 12);
  });

  it("devrait placer Neptune au même rayon dans les deux échelles", () => {
    expect(sceneRadius(30.07, 1)).toBeCloseTo(sceneRadius(30.07, 0), 0);
  });
});

describe("toScene", () => {
  it("devrait garder l'axe x et appliquer le rayon compressé quand le point est sur x", () => {
    const p = toScene({ x: 1, y: 0, z: 0 }, 0);
    expect(p.x).toBeCloseTo(34, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it("devrait envoyer l'axe y écliptique vers −z de la scène", () => {
    const p = toScene({ x: 0, y: 1, z: 0 }, 0);
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.z).toBeCloseTo(-34, 12);
  });

  it("devrait envoyer l'axe z écliptique (nord) vers +y de la scène", () => {
    const p = toScene({ x: 0, y: 0, z: 1 }, 0);
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(34, 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it("devrait conserver la direction et remplacer la norme par sceneRadius quand le point est quelconque", () => {
    const expectedNorm = 12 + 22 * Math.sqrt(5); // sceneRadius(5, 0)
    const p = toScene({ x: 3, y: 4, z: 0 }, 0);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(expectedNorm, 9);
    expect(p.x / expectedNorm).toBeCloseTo(0.6, 9);
    expect(p.y / expectedNorm).toBeCloseTo(0, 9);
    expect(p.z / expectedNorm).toBeCloseTo(-0.8, 9);
  });

  it("devrait utiliser l'échelle réelle quand realScale = 1", () => {
    const p = toScene({ x: 0, y: 0, z: 2 }, 1);
    expect(p.y).toBeCloseTo(8.82, 9);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = toScene({ x: 1, y: 0, z: 0 }, 0, out);
    expect(result).toBe(out);
    expect(out.x).toBeCloseTo(34, 12);
    expect(out.y).toBeCloseTo(0, 12);
    expect(out.z).toBeCloseTo(0, 12);
  });

  it("ne devrait pas modifier le vecteur d'entrée", () => {
    const v: Vec3 = { x: 1, y: 2, z: 3 };
    toScene(v, 0.5);
    expect(v).toEqual({ x: 1, y: 2, z: 3 });
  });

  // Hors JSDoc (direction indéfinie) : on exige seulement de ne pas propager de NaN dans la scène.
  it("devrait renvoyer des coordonnées finies quand le point est à l'origine", () => {
    const p = toScene({ x: 0, y: 0, z: 0 }, 0);
    expect(p.x).toSatisfy(Number.isFinite);
    expect(p.y).toSatisfy(Number.isFinite);
    expect(p.z).toSatisfy(Number.isFinite);
  });
});

describe("zoomScale", () => {
  it("devrait laisser le système solaire tel quel quand le zoom cosmique est nul", () => {
    expect(zoomScale(0)).toBe(1);
  });

  it("devrait réduire le système solaire d'un facteur 100 quand zoom = 2", () => {
    expect(zoomScale(2)).toBeCloseTo(0.01, 15);
  });

  it("devrait réduire le système solaire à 10^−4,6 ≈ 2,511 886e−5 aux étoiles voisines (zoom 4,6)", () => {
    expect(zoomScale(4.6) / 2.511_886_431_5e-5).toBeCloseTo(1, 9);
  });
});

describe("unitsPerLightYear", () => {
  it("devrait compter 278 893,15 unités par année-lumière au zoom 0 (4,41 unités par UA × 63 241,077 UA)", () => {
    expect(unitsPerLightYear(0)).toBeCloseTo(278_893.15, 2);
  });

  it("devrait faire tenir 20 al dans 140 unités aux étoiles voisines (7,005 479 unités par al au zoom 4,6)", () => {
    expect(unitsPerLightYear(4.6)).toBeCloseTo(7.005_479, 6);
  });

  it("devrait faire tenir le disque de la Galaxie dans 140 unités à la Voie lactée (0,002 788 931 5 unités par al au zoom 8)", () => {
    expect(unitsPerLightYear(8)).toBeCloseTo(0.002_788_931_5, 10);
  });

  it.each([[0], [3.3], [8]])(
    "devrait rester cohérente avec l'échelle réelle du système solaire, réduite par zoomScale (zoom %f)",
    (zoom) => {
      expect(unitsPerLightYear(zoom) / zoomScale(zoom)).toBeCloseTo(LINEAR_UNITS_PER_AU * AU_PER_LIGHT_YEAR, 6);
    },
  );
});

describe("sceneAxes", () => {
  it("devrait ranger une direction écliptique dans les axes de scène (x, z, −y)", () => {
    expect(sceneAxes({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 3, z: -2 });
  });

  it("devrait conserver la norme du vecteur", () => {
    const p = sceneAxes({ x: -0.3, y: 0.8, z: 0.52 });
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(Math.hypot(-0.3, 0.8, 0.52), 12);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = sceneAxes({ x: 1, y: 2, z: 3 }, out);
    expect(result).toBe(out);
    expect(out).toEqual({ x: 1, y: 3, z: -2 });
  });
});
