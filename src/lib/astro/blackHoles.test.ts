import { describe, expect, it } from "vitest";
import { COMPARED_BLACK_HOLE_BY_KEY, COMPARED_BLACK_HOLES, M87_STELLAR_DYNAMICS_MASS_SOLAR } from "@/lib/astro/blackHoles";
import { schwarzschildRadiusSolar } from "@/lib/astro/schwarzschild";

/*
 * Contrat des données des trous noirs de l'onglet « Tailles » (fiche documentaire des trous noirs, novembre 2026) :
 * masses publiées, horizon toujours calculé depuis la masse, distances, couleur d'affichage lisible sur la nuit.
 */

/** Luminance relative WCAG d'une couleur #rrggbb. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Rapport de contraste WCAG entre deux couleurs. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Couleurs du design system que la pastille d'un trou noir ne doit pas imiter : --soleil (interaction), --laiton (traits). */
const RESERVED_COLORS = ["#ffb547", "#c2a36b"];

describe("COMPARED_BLACK_HOLES", () => {
  it("devrait compter quatre trous noirs, par masse croissante, de Cygnus X-1 au Fer à cheval cosmique", () => {
    expect(COMPARED_BLACK_HOLES.map((hole) => hole.key)).toEqual([
      "cygnus-x-1", "sagittarius-a-star", "m87-star", "cosmic-horseshoe",
    ]);
    const masses = COMPARED_BLACK_HOLES.map((hole) => hole.massSolar);
    expect(masses).toEqual([...masses].sort((a, b) => a - b));
  });

  it("devrait retenir les masses de la fiche : 21,2 M☉, 4,297 millions, 6,5 milliards et 36 milliards", () => {
    expect(COMPARED_BLACK_HOLES.map((hole) => hole.massSolar)).toEqual([21.2, 4.297e6, 6.5e9, 3.6e10]);
  });

  it("devrait ranger chacun dans sa classe : stellaire, supermassifs, ultramassif", () => {
    expect(COMPARED_BLACK_HOLES.map((hole) => hole.blackHoleClass)).toEqual([
      "stellar", "supermassive", "supermassive", "ultramassive",
    ]);
  });

  it("devrait donner Cygnus X-1, Sagittarius A*, M87* et le Fer à cheval cosmique par leur clé", () => {
    for (const hole of COMPARED_BLACK_HOLES) expect(COMPARED_BLACK_HOLE_BY_KEY[hole.key]).toBe(hole);
    expect(Object.keys(COMPARED_BLACK_HOLE_BY_KEY)).toHaveLength(4);
  });

  describe.each(COMPARED_BLACK_HOLES)("trou noir $key", (hole) => {
    it("devrait être un trou noir (kind), pas une étoile", () => {
      expect(hole.kind).toBe("black-hole");
    });

    it("devrait tirer le rayon de son horizon de sa masse, jamais d'une saisie (r_s = 2GM/c²)", () => {
      expect(hole.radiusSolar).toBe(schwarzschildRadiusSolar(hole.massSolar));
    });

    it("devrait écrire sa masse avec 2 à 4 chiffres significatifs, la précision de la mesure", () => {
      expect([2, 3, 4]).toContain(hole.significantDigits);
    });

    it("devrait encadrer sa masse par sa fourchette publiée, quand elle en a une", () => {
      if (!hole.massRange) return;
      const [low, high] = hole.massRange;
      expect(low).toBeLessThan(hole.massSolar);
      expect(high).toBeGreaterThan(hole.massSolar);
    });

    it("devrait avoir une distance positive", () => {
      expect(hole.distanceLy).toBeGreaterThan(0);
    });

    it("devrait citer les sources de ses valeurs", () => {
      expect(hole.sources.trim()).not.toBe("");
    });

    it("devrait avoir une couleur #rrggbb en minuscules, lisible sur la nuit (3:1 au moins)", () => {
      expect(hole.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(hole.color, "#060b18")).toBeGreaterThanOrEqual(3);
    });

    it("ne devrait emprunter ni la couleur d'interaction (--soleil) ni celle des traits (--laiton)", () => {
      expect(RESERVED_COLORS).not.toContain(hole.color);
    });
  });

  /*
   * Fourchette de M87* : l'enveloppe à 1σ des deux mesures directes, comme pour les autres trous noirs. L'anneau de
   * l'EHT donne 6,5 ± 0,7 milliards de M☉ (2019), la dynamique stellaire 5,37 (+0,37/−0,25) milliards (Liepold et al.
   * 2023) : de 5,12 à 7,2 milliards.
   */
  it("devrait encadrer la masse de M87* par l'enveloppe à 1σ de l'anneau de l'EHT et de la dynamique stellaire", () => {
    expect(COMPARED_BLACK_HOLE_BY_KEY["m87-star"].massRange).toEqual([5.37e9 - 0.25e9, 6.5e9 + 0.7e9]);
  });

  it("devrait garder à part la masse de M87* par la dynamique stellaire, dans sa fourchette, sous celle de l'EHT", () => {
    const [low, high] = COMPARED_BLACK_HOLE_BY_KEY["m87-star"].massRange ?? [Number.NaN, Number.NaN];
    expect(M87_STELLAR_DYNAMICS_MASS_SOLAR).toBe(5.37e9);
    expect(M87_STELLAR_DYNAMICS_MASS_SOLAR).toBeGreaterThan(low);
    expect(M87_STELLAR_DYNAMICS_MASS_SOLAR).toBeLessThan(Math.min(high, COMPARED_BLACK_HOLE_BY_KEY["m87-star"].massSolar));
  });

  it("devrait mettre en garde sur les masses débattues : Cygnus X-1, M87* et le Fer à cheval cosmique", () => {
    expect(COMPARED_BLACK_HOLES.filter((hole) => hole.massRange).map((hole) => hole.key)).toEqual([
      "cygnus-x-1", "m87-star", "cosmic-horseshoe",
    ]);
  });

  /*
   * Au-delà d'un décalage vers le rouge de 0,1, la distance dépend de la cosmologie : le temps de trajet de la lumière
   * accompagne la distance comobile, toujours plus grande que lui (l'Univers s'est étendu pendant le trajet).
   */
  it("devrait donner le temps de trajet de la lumière du seul trou noir lointain, plus court que sa distance comobile", () => {
    const far = COMPARED_BLACK_HOLES.filter((hole) => hole.lightTravelYears !== undefined);
    expect(far.map((hole) => hole.key)).toEqual(["cosmic-horseshoe"]);
    for (const hole of far) expect(hole.lightTravelYears).toBeLessThan(hole.distanceLy);
  });
});
