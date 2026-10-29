import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import { absoluteMagnitude, spectralColor, starPointSize, starPositionLy } from "@/lib/astro/starMap";

/*
 * Valeurs attendues recalculées hors du dépôt (coordonnées équatoriales J2000 → écliptique, obliquité 23,439 291 1°,
 * puis axes de scène x, z, −y) ; elles recoupent la matrice de galactic.ts au milliardième.
 */

describe("starPositionLy", () => {
  /** Sirius A (SIMBAD, J2000) à 8,6 al. */
  const SIRIUS = { raDeg: 101.287155, decDeg: -16.716116, distanceLy: 8.6 };

  it("devrait placer Sirius dans la direction de ses coordonnées équatoriales, à sa distance", () => {
    const p = starPositionLy(SIRIUS);
    expect(p.x).toBeCloseTo(8.6 * -0.187_455, 4);
    expect(p.y).toBeCloseTo(8.6 * -0.637_495, 4);
    expect(p.z).toBeCloseTo(8.6 * -0.747_303, 4);
  });

  it("devrait garder la distance de l'étoile comme norme (8,6 al pour Sirius)", () => {
    const p = starPositionLy(SIRIUS);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(8.6, 9);
  });

  it("devrait viser Proxima du Centaure, très au sud de l'écliptique, dans la direction (−0,364 470 ; −0,704 180 ; 0,609 338)", () => {
    const p = starPositionLy({ raDeg: 217.42895, decDeg: -62.67949, distanceLy: 4.2465 });
    expect(p.x / 4.2465).toBeCloseTo(-0.364_470, 6);
    expect(p.y / 4.2465).toBeCloseTo(-0.704_180, 6);
    expect(p.z / 4.2465).toBeCloseTo(0.609_338, 6);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = starPositionLy({ raDeg: 0, decDeg: 0, distanceLy: 5 }, out);
    expect(result).toBe(out);
    expect(out.x).toBeCloseTo(5, 12);
    expect(out.y).toBeCloseTo(0, 12);
    expect(out.z).toBeCloseTo(0, 12);
  });
});

describe("absoluteMagnitude", () => {
  it("devrait donner M ≈ 1,43 à Sirius (V = −1,46 à 8,6 al)", () => {
    expect(absoluteMagnitude(-1.46, 8.6)).toBeCloseTo(1.4346, 3);
  });

  it("devrait donner M ≈ 15,56 à Proxima du Centaure (V = 11,13 à 4,2465 al)", () => {
    expect(absoluteMagnitude(11.13, 4.2465)).toBeCloseTo(15.557, 3);
  });

  it("devrait rendre la magnitude apparente telle quelle à 10 parsecs (32,6156 al)", () => {
    expect(absoluteMagnitude(4.83, 32.6156)).toBeCloseTo(4.83, 6);
  });
});

describe("starPointSize", () => {
  it.each([
    [1, 9],
    [-3, 9],
    [5, 7],
    [15, 2],
    [30, 2],
  ])("devrait suivre 9 − 0,5 × (M − 1), borné à [2, 9] px (M = %f → %f px)", (magnitude, px) => {
    expect(starPointSize(magnitude)).toBeCloseTo(px, 12);
  });
});

describe("spectralColor", () => {
  it.each([
    ["O9.5V", "#9BB0FF"],
    ["B2IV", "#AABFFF"],
    ["A1V", "#CAD7FF"],
    ["F5IV-V", "#F8F7FF"],
    ["G2V", "#FFF4EA"],
    ["K1V", "#FFD2A1"],
    ["M5.5Ve", "#FFB56C"],
  ])("devrait colorer le type %s selon sa classe spectrale (%s)", (type, color) => {
    expect(spectralColor(type)).toBe(color);
  });

  it("devrait lire la classe sans tenir compte de la casse (g2v → G)", () => {
    expect(spectralColor("g2v")).toBe("#FFF4EA");
  });

  it.each([["DA2"], [""]])("devrait donner le blanc par défaut à une classe inconnue ou absente (« %s »)", (type) => {
    expect(spectralColor(type)).toBe("#F8F7FF");
  });

  it.each([["O9.5V"], ["B2IV"], ["A1V"], ["F5IV-V"], ["G2V"], ["K1V"], ["M5.5Ve"], ["g2v"], ["DA2"], [""]])(
    "devrait rendre une couleur au format #RRGGBB (« %s »)",
    (type) => {
      expect(spectralColor(type)).toMatch(/^#[0-9A-F]{6}$/i);
    },
  );
});
