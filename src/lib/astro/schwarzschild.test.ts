import { describe, expect, it } from "vitest";
import {
  ISCO_RS,
  PHOTON_SPHERE_RS,
  SCHWARZSCHILD_KM_PER_SOLAR_MASS,
  SHADOW_RADIUS_RS,
  schwarzschildRadiusKm,
  schwarzschildRadiusSolar,
  shadowRadiusSolar,
} from "@/lib/astro/schwarzschild";
import { COMPARED_STAR_BY_KEY } from "@/lib/astro/starSizes";

/*
 * Trou noir sans rotation : horizon r_s = 2GM/c² et ombre √27/2 r_s, aux constantes nominales de l'UAI 2015
 * (GM☉ = 1,327 124 4 × 10²⁰ m³/s², R☉ = 695 700 km). Valeurs de référence : fiche documentaire des trous noirs.
 */

describe("SCHWARZSCHILD_KM_PER_SOLAR_MASS", () => {
  it("devrait valoir 2,953 25 km : 2GM☉/c² avec le paramètre gravitationnel nominal du Soleil", () => {
    expect(SCHWARZSCHILD_KM_PER_SOLAR_MASS).toBeCloseTo(2.95325, 5);
  });
});

describe("schwarzschildRadiusKm", () => {
  it("devrait valoir 2,953 25 km pour une masse solaire", () => {
    expect(schwarzschildRadiusKm(1)).toBeCloseTo(2.95325, 5);
  });

  it("devrait donner 62,61 km à Cygnus X-1 (21,2 M☉)", () => {
    expect(schwarzschildRadiusKm(21.2)).toBeCloseTo(62.61, 2);
  });

  it("devrait être proportionnel à la masse", () => {
    expect(schwarzschildRadiusKm(4.297e6)).toBeCloseTo(4.297e6 * schwarzschildRadiusKm(1), 3);
  });
});

describe("schwarzschildRadiusSolar", () => {
  it.each([
    ["Sagittarius A*", 4.297e6, 18.24, 0.01],
    ["M87*", 6.5e9, 27_593, 1],
    // 3,6 × 10¹⁰ M☉ tout rond ; la fiche documentaire donne 154 000 R☉ pour log M = 10,56, soit 3,63 × 10¹⁰ M☉.
    ["trou noir du Fer à cheval cosmique", 3.6e10, 152_820, 1],
  ])("devrait donner son horizon en R☉ nominaux à %s (%f M☉ → %f R☉)", (_name, massSolar, radiusSolar, tolerance) => {
    expect(Math.abs(schwarzschildRadiusSolar(massSolar) - radiusSolar)).toBeLessThanOrEqual(tolerance);
  });

  it("devrait convertir les kilomètres en rayons solaires nominaux (695 700 km)", () => {
    expect(schwarzschildRadiusSolar(21.2)).toBeCloseTo(schwarzschildRadiusKm(21.2) / 695_700, 15);
  });
});

describe("SHADOW_RADIUS_RS", () => {
  it("devrait valoir √27/2 ≈ 2,5981 : le paramètre d'impact critique des photons, en r_s", () => {
    expect(SHADOW_RADIUS_RS).toBeCloseTo(2.5981, 4);
    expect(SHADOW_RADIUS_RS).toBeCloseTo(Math.sqrt(27) / 2, 15);
  });

  it("devrait tomber entre la sphère des photons (1,5 r_s) et la dernière orbite stable (3 r_s)", () => {
    expect(PHOTON_SPHERE_RS).toBe(1.5);
    expect(ISCO_RS).toBe(3);
    expect(SHADOW_RADIUS_RS).toBeGreaterThan(PHOTON_SPHERE_RS);
    expect(SHADOW_RADIUS_RS).toBeLessThan(ISCO_RS);
  });
});

describe("shadowRadiusSolar", () => {
  it("devrait valoir SHADOW_RADIUS_RS fois l'horizon", () => {
    expect(shadowRadiusSolar(6.5e9)).toBeCloseTo(SHADOW_RADIUS_RS * schwarzschildRadiusSolar(6.5e9), 6);
  });

  it("devrait placer l'ombre de Sagittarius A* (47,4 R☉) entre Aldébaran et Rigel : c'est la taille comparée", () => {
    const shadow = shadowRadiusSolar(4.297e6);
    expect(shadow).toBeCloseTo(47.39, 2);
    expect(shadow).toBeGreaterThan(COMPARED_STAR_BY_KEY.aldebaran.radiusSolar);
    expect(shadow).toBeLessThan(COMPARED_STAR_BY_KEY.rigel.radiusSolar);
  });
});

describe("masse refusée", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "devrait lever une RangeError quand la masse n'est pas un nombre fini strictement positif (%f)",
    (massSolar) => {
      expect(() => schwarzschildRadiusKm(massSolar)).toThrow(RangeError);
      expect(() => schwarzschildRadiusSolar(massSolar)).toThrow(RangeError);
      expect(() => shadowRadiusSolar(massSolar)).toThrow(RangeError);
    },
  );
});
