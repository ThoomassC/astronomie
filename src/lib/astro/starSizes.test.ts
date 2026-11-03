import { describe, expect, it } from "vitest";
import { COMPARED_STAR_BY_KEY, COMPARED_STARS, SOLAR_RADIUS_KM } from "@/lib/astro/starSizes";

/*
 * Contrat du fichier de données du comparateur de tailles : ces tests disent ce que la page attend
 * (escales de la plus petite à la plus grande, disposition à rayons strictement croissants, Soleil en référence).
 */

describe("COMPARED_STARS", () => {
  it("devrait compter dix étoiles, de Proxima du Centaure à VY Canis Majoris, dans l'ordre de SizeStarKey", () => {
    expect(COMPARED_STARS.map((star) => star.key)).toEqual([
      "proxima-centauri", "sun", "sirius-a", "pollux", "arcturus", "aldebaran", "rigel", "antares-a", "betelgeuse",
      "vy-canis-majoris",
    ]);
  });

  it("devrait ranger les étoiles par rayon strictement croissant (disposition et escales)", () => {
    const radii = COMPARED_STARS.map((star) => star.radiusSolar);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(new Set(radii).size).toBe(radii.length);
  });

  it("devrait donner au Soleil un rayon de 1 R☉ et une distance de 0 al", () => {
    const sun = COMPARED_STARS.find((star) => star.key === "sun");
    expect(sun?.radiusSolar).toBe(1);
    expect(sun?.distanceLy).toBe(0);
  });

  describe.each(COMPARED_STARS)("étoile $key", (star) => {
    it("devrait être une étoile (kind), pas un trou noir", () => {
      expect(star.kind).toBe("star");
    });

    it("devrait avoir une température effective dans [2 000 ; 40 000] K", () => {
      expect(star.temperatureK).toBeGreaterThanOrEqual(2000);
      expect(star.temperatureK).toBeLessThanOrEqual(40_000);
    });

    it("devrait avoir un type spectral qui commence par une classe connue (O, B, A, F, G, K, M)", () => {
      expect(star.spectralType).toMatch(/^[OBAFGKM]/);
    });

    it("devrait citer les sources de ses valeurs", () => {
      expect(star.sources.trim()).not.toBe("");
    });

    it("devrait avoir une distance positive, nulle seulement pour le Soleil", () => {
      expect(star.distanceLy > 0).toBe(star.key !== "sun");
    });

    it("devrait avoir une couleur d'affichage en hexadécimal (#rrggbb, minuscules)", () => {
      expect(star.color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it("devrait teinter les étoiles chaudes de bleu et les froides d'orange (corps noir) : Rigel bleutée, Bételgeuse orangée", () => {
    const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
    const [rigelRed, , rigelBlue] = channels(COMPARED_STARS.find((star) => star.key === "rigel")?.color ?? "#000000");
    const [betelgeuseRed, , betelgeuseBlue] = channels(COMPARED_STARS.find((star) => star.key === "betelgeuse")?.color ?? "#000000");
    expect(rigelBlue).toBeGreaterThan(rigelRed);
    expect(betelgeuseRed).toBeGreaterThan(betelgeuseBlue);
  });

  describe.each(COMPARED_STARS.filter((star) => star.radiusRange))("fourchette publiée de $key", (star) => {
    it("devrait encadrer le rayon retenu, bornes distinctes", () => {
      const [low, high] = star.radiusRange ?? [Number.NaN, Number.NaN];
      expect(low).toBeLessThan(high);
      expect(low).toBeLessThanOrEqual(star.radiusSolar);
      expect(high).toBeGreaterThanOrEqual(star.radiusSolar);
    });
  });

  it("devrait donner une fourchette aux supergéantes dont le rayon est débattu (Rigel, Antarès A, Bételgeuse, VY CMa)", () => {
    expect(COMPARED_STARS.filter((star) => star.radiusRange).map((star) => star.key)).toEqual([
      "rigel", "antares-a", "betelgeuse", "vy-canis-majoris",
    ]);
  });
});

describe("COMPARED_STAR_BY_KEY", () => {
  it("devrait retrouver chacune des dix étoiles par sa clé", () => {
    for (const star of COMPARED_STARS) expect(COMPARED_STAR_BY_KEY[star.key]).toBe(star);
    expect(Object.keys(COMPARED_STAR_BY_KEY)).toHaveLength(COMPARED_STARS.length);
  });

  it("devrait donner à VY Canis Majoris le rayon de l'accueil et de la page À propos : 1 420 R☉", () => {
    expect(COMPARED_STAR_BY_KEY["vy-canis-majoris"].radiusSolar).toBe(1420);
  });
});

describe("SOLAR_RADIUS_KM", () => {
  it("devrait valoir le rayon solaire nominal de l'UAI (695 700 km)", () => {
    expect(SOLAR_RADIUS_KM).toBe(695_700);
  });
});
