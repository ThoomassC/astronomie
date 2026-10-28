import { describe, expect, it } from "vitest";
import { SCENE_TO_GALACTIC, galacticFromScene, sceneFromGalactic } from "@/lib/astro/galactic";

describe("galacticFromScene", () => {
  it("devrait placer le point vernal à l = 96,34°, b = −60,19°", () => {
    const { lDeg, bDeg } = galacticFromScene({ x: 1, y: 0, z: 0 });
    expect(lDeg).toBeCloseTo(96.34, 1);
    expect(bDeg).toBeCloseTo(-60.19, 1);
  });

  it("devrait placer le pôle nord de l'écliptique à l = 96,38°, b = +29,81°", () => {
    const { lDeg, bDeg } = galacticFromScene({ x: 0, y: 1, z: 0 });
    expect(lDeg).toBeCloseTo(96.38, 1);
    expect(bDeg).toBeCloseTo(29.81, 1);
  });

  it("devrait donner une longitude dans [0, 360[", () => {
    for (const v of [
      { x: 0, y: 0, z: 1 },
      { x: -1, y: 0.2, z: 0 },
      { x: 0.3, y: -0.9, z: -0.1 },
    ]) {
      const { lDeg } = galacticFromScene(v);
      expect(lDeg).toBeGreaterThanOrEqual(0);
      expect(lDeg).toBeLessThan(360);
    }
  });
});

describe("sceneFromGalactic", () => {
  it("devrait retrouver les coordonnées galactiques après un aller-retour", () => {
    for (const [l, b] of [
      [0, 0],
      [17.5, -12],
      [280.5, -32.9],
    ]) {
      const back = galacticFromScene(sceneFromGalactic(l, b));
      expect(back.lDeg).toBeCloseTo(l, 9);
      expect(back.bDeg).toBeCloseTo(b, 9);
    }
  });
});

describe("SCENE_TO_GALACTIC", () => {
  it("devrait être une rotation : lignes unitaires, orthogonales, déterminant 1", () => {
    const m = SCENE_TO_GALACTIC;
    const row = (i: number) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]] as const;
    const dot3 = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (let i = 0; i < 3; i++) expect(dot3(row(i), row(i))).toBeCloseTo(1, 9);
    expect(dot3(row(0), row(1))).toBeCloseTo(0, 9);
    expect(dot3(row(0), row(2))).toBeCloseTo(0, 9);
    expect(dot3(row(1), row(2))).toBeCloseTo(0, 9);
    const det =
      m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    expect(det).toBeCloseTo(1, 9);
  });
});
