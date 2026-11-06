import { describe, expect, it } from "vitest";
import { NEARBY_STARS, NEARBY_STARS_SOURCE } from "@/lib/astro/stars";

/*
 * Contrat du fichier de données des étoiles voisines : ces tests disent ce que la carte attend
 * (cadrage du zoom 4,6 : 20 al au plus ; priorité des étiquettes : distance croissante).
 */

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("NEARBY_STARS", () => {
  it("devrait compter entre 15 et 20 étoiles", () => {
    expect(NEARBY_STARS.length).toBeGreaterThanOrEqual(15);
    expect(NEARBY_STARS.length).toBeLessThanOrEqual(20);
  });

  it("devrait commencer par Proxima du Centaure, l'étoile la plus proche, à 4,2465 al (à 0,01 près)", () => {
    const [first] = NEARBY_STARS;
    expect(first.key).toBe("proxima-centauri");
    expect(Math.abs(first.distanceLy - 4.2465)).toBeLessThanOrEqual(0.01);
  });

  it("devrait être triée par distance croissante (c'est aussi la priorité des étiquettes, remarquables d'abord)", () => {
    const distances = NEARBY_STARS.map((star) => star.distanceLy);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("devrait signaler six étoiles remarquables, nommées avec leur distance sur la carte", () => {
    expect(NEARBY_STARS.filter((star) => star.notable).map((star) => star.key)).toEqual([
      "proxima-centauri",
      "alpha-centauri",
      "barnard",
      "sirius",
      "procyon",
      "altair",
    ]);
  });

  it("devrait donner à chaque étoile une clé unique", () => {
    const keys = NEARBY_STARS.map((star) => star.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("devrait contenir Sirius, l'étoile la plus brillante du ciel : 8,6 al, magnitude −1,46", () => {
    const sirius = NEARBY_STARS.find((star) => star.key === "sirius");
    expect(sirius?.distanceLy).toBeGreaterThan(8.5);
    expect(sirius?.distanceLy).toBeLessThan(8.7);
    expect(sirius?.apparentMag).toBeCloseTo(-1.46, 1);
  });

  describe.each(NEARBY_STARS)("étoile $key", (star) => {
    it("devrait avoir une clé ASCII en kebab-case (clé React et des étiquettes)", () => {
      expect(star.key).toMatch(KEBAB_CASE);
    });

    it("devrait avoir une ascension droite dans [0°, 360°[", () => {
      expect(star.raDeg).toBeGreaterThanOrEqual(0);
      expect(star.raDeg).toBeLessThan(360);
    });

    it("devrait avoir une déclinaison dans [−90°, 90°]", () => {
      expect(star.decDeg).toBeGreaterThanOrEqual(-90);
      expect(star.decDeg).toBeLessThanOrEqual(90);
    });

    it("devrait être à plus de 4 al et au plus à 20 al (cadre des étoiles voisines au zoom 4,6)", () => {
      expect(star.distanceLy).toBeGreaterThan(4);
      expect(star.distanceLy).toBeLessThanOrEqual(20);
    });

    it("devrait avoir un type spectral qui commence par une classe connue (O, B, A, F, G, K, M, ou D pour une naine blanche)", () => {
      expect(star.spectralType).toMatch(/^[OBAFGKMD]/);
    });

    it("devrait avoir une magnitude apparente dans [−2, 16]", () => {
      expect(star.apparentMag).toBeGreaterThanOrEqual(-2);
      expect(star.apparentMag).toBeLessThanOrEqual(16);
    });
  });
});

describe("NEARBY_STARS_SOURCE", () => {
  it("devrait citer les sources des valeurs (pied de page)", () => {
    expect(NEARBY_STARS_SOURCE.trim()).not.toBe("");
  });
});
