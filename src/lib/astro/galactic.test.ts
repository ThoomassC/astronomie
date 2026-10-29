import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import {
  GALACTIC_CENTER_DISTANCE_LY,
  SCENE_TO_GALACTIC,
  galacticFromScene,
  sceneFromEquatorial,
  sceneFromGalactic,
  sceneFromGalacticXYZ,
} from "@/lib/astro/galactic";

const DEG = Math.PI / 180;

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

describe("sceneFromEquatorial", () => {
  it("devrait envoyer le point vernal (α = 0°, δ = 0°) sur l'axe x de la scène", () => {
    const v = sceneFromEquatorial(0, 0);
    expect(v.x).toBeCloseTo(1, 12);
    expect(v.y).toBeCloseTo(0, 12);
    expect(v.z).toBeCloseTo(0, 12);
  });

  it("devrait envoyer le pôle nord céleste en (0 ; cos ε ; −sin ε), incliné de l'obliquité sur le nord de l'écliptique", () => {
    const v = sceneFromEquatorial(0, 90);
    expect(v.x).toBeCloseTo(0, 12);
    expect(v.y).toBeCloseTo(0.917_482, 6);
    expect(v.z).toBeCloseTo(-0.397_777, 6);
  });

  // Point (l = 0, b = 0) de la définition des coordonnées galactiques, en J2000 (Sgr A*, lui, est à l = 359,944°, b = −0,046°).
  it("devrait placer le centre galactique nominal (α 266,404 99°, δ −28,936 17°) en l = 0°, b = 0°", () => {
    const { lDeg, bDeg } = galacticFromScene(sceneFromEquatorial(266.40499, -28.93617));
    // l est rendu dans [0, 360[ : l'écart à 0° se mesure modulo 360.
    expect(Math.abs(((lDeg + 180) % 360) - 180)).toBeLessThan(0.01);
    expect(Math.abs(bDeg)).toBeLessThan(0.01);
  });

  it("devrait placer le pôle nord galactique (α 192,859 48°, δ 27,128 25°) en b = 90°", () => {
    expect(galacticFromScene(sceneFromEquatorial(192.85948, 27.12825)).bDeg).toBeCloseTo(90, 2);
  });

  it.each([
    [101.287155, -16.716116],
    [217.42895, -62.67949],
    [297.6958, 8.8683],
  ])("devrait renvoyer une direction unitaire (α %f°, δ %f°)", (ra, dec) => {
    const v = sceneFromEquatorial(ra, dec);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 12);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = sceneFromEquatorial(0, 0, out);
    expect(result).toBe(out);
    expect(out.x).toBeCloseTo(1, 12);
    expect(out.y).toBeCloseTo(0, 12);
    expect(out.z).toBeCloseTo(0, 12);
  });
});

describe("sceneFromGalacticXYZ", () => {
  it.each([
    [0, 0],
    [17.5, -12],
    [280.5, -32.9],
    [123, 90],
  ])("devrait coïncider avec sceneFromGalactic pour le vecteur unitaire de (l %f°, b %f°)", (l, b) => {
    const v = sceneFromGalacticXYZ(Math.cos(b * DEG) * Math.cos(l * DEG), Math.cos(b * DEG) * Math.sin(l * DEG), Math.sin(b * DEG));
    const expected = sceneFromGalactic(l, b);
    expect(v.x).toBeCloseTo(expected.x, 12);
    expect(v.y).toBeCloseTo(expected.y, 12);
    expect(v.z).toBeCloseTo(expected.z, 12);
  });

  it("devrait tourner un vecteur sans changer sa longueur (centre galactique à 27 000 al)", () => {
    const v = sceneFromGalacticXYZ(27_000, 0, 0);
    const center = sceneFromGalactic(0, 0);
    expect(v.x).toBeCloseTo(27_000 * center.x, 8);
    expect(v.y).toBeCloseTo(27_000 * center.y, 8);
    expect(v.z).toBeCloseTo(27_000 * center.z, 8);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = sceneFromGalacticXYZ(0, 0, 1, out);
    const pole = sceneFromGalactic(0, 90);
    expect(result).toBe(out);
    expect(out.x).toBeCloseTo(pole.x, 12);
    expect(out.y).toBeCloseTo(pole.y, 12);
    expect(out.z).toBeCloseTo(pole.z, 12);
  });
});

describe("GALACTIC_CENTER_DISTANCE_LY", () => {
  it("devrait placer le centre galactique à 27 000 al du Soleil (GRAVITY 2021 : 26 990 à 27 000 al)", () => {
    expect(GALACTIC_CENTER_DISTANCE_LY).toBe(27_000);
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
