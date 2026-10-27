import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import { compressedRadius, sceneRadius, toScene } from "@/lib/astro/scale";

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
