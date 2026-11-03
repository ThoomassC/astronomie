import { describe, expect, it } from "vitest";
import { SOLAR_HIDDEN_ZOOM, galaxyMagnification, layerWeights, type LayerWeights } from "@/components/scene/layers";
import { LOCAL_GROUP_MAGNIFICATION } from "@/lib/astro/scale";

/** Zooms de −1 à 10 par pas de 0,05, et de −1 à 17 (jusqu'au-delà du multivers). */
const ZOOMS = Array.from({ length: 221 }, (_, i) => -1 + i * 0.05);
const ALL_ZOOMS = Array.from({ length: 361 }, (_, i) => -1 + i * 0.05);
const LAYERS: readonly (keyof LayerWeights)[] = [
  "solar",
  "planetLabels",
  "sunPoint",
  "sky",
  "stars",
  "galaxy",
  "galaxyLabels",
  "here",
  "sunLabel",
  "localGroup",
  "web",
  "cmb",
  "multiverse",
];
/** Couches du Groupe local au multivers : nulles jusqu'au zoom 8. */
const EXTRAGALACTIC = { localGroup: 0, web: 0, cmb: 0, multiverse: 0 } as const;

/** Poids d'une couche sur une plage de zoom (−1 à 10 par défaut). */
const series = (layer: keyof LayerWeights, zooms: readonly number[] = ZOOMS) => zooms.map((zoom) => layerWeights(zoom)[layer]);
/** « Vous êtes ici » tel que le moteur le calculait avant le Groupe local : smoothstep(0,5 ; 1 ; poids de la galaxie). */
const formerHere = (zoom: number) => {
  const galaxy = Math.min(1, Math.max(0, (zoom - 6) / 1.2));
  const smoothGalaxy = galaxy * galaxy * (3 - 2 * galaxy);
  const t = Math.min(1, Math.max(0, (smoothGalaxy - 0.5) / 0.5));
  return t * t * (3 - 2 * t);
};
/** « Soleil » tel que le moteur le calculait avant le Groupe local : 1 − smoothstep(0 ; 0,5 ; poids de la galaxie). */
const formerSunLabel = (zoom: number) => {
  const galaxy = Math.min(1, Math.max(0, (zoom - 6) / 1.2));
  const smoothGalaxy = galaxy * galaxy * (3 - 2 * galaxy);
  const t = Math.min(1, Math.max(0, smoothGalaxy / 0.5));
  return 1 - t * t * (3 - 2 * t);
};
/** Variation du poids d'un zoom au suivant. */
const stepsOf = (values: readonly number[]) => values.slice(1).map((value, i) => value - values[i]);

describe("layerWeights", () => {
  it("devrait ne dessiner que le système solaire et son ciel au zoom 0 (aucune couche nouvelle à l'écran)", () => {
    expect(layerWeights(0)).toEqual({
      solar: 1, planetLabels: 1, sunPoint: 0, sky: 1, stars: 0, galaxy: 0, galaxyLabels: 0, here: 0, sunLabel: 1,
      ...EXTRAGALACTIC,
    });
  });

  it("devrait montrer les étoiles voisines et le Soleil devenu point, sous le ciel, au zoom 4,6", () => {
    expect(layerWeights(4.6)).toEqual({
      solar: 0, planetLabels: 0, sunPoint: 1, sky: 1, stars: 1, galaxy: 0, galaxyLabels: 0, here: 0, sunLabel: 1,
      ...EXTRAGALACTIC,
    });
  });

  it("devrait ne montrer que la galaxie, ses étiquettes et le Soleil devenu point au zoom 8", () => {
    expect(layerWeights(8)).toEqual({
      solar: 0, planetLabels: 0, sunPoint: 1, sky: 0, stars: 0, galaxy: 1, galaxyLabels: 1, here: 1, sunLabel: 0,
      ...EXTRAGALACTIC,
    });
  });

  it("devrait croiser le ciel qui s'efface et la galaxie qui apparaît au zoom 6,5, étoiles voisines déjà parties", () => {
    const weights = layerWeights(6.5);
    expect(weights.sky).toBeCloseTo(0.118_076, 6);
    expect(weights.galaxy).toBeCloseTo(0.376_157, 6);
    expect(weights.stars).toBe(0);
  });

  it("devrait montrer les étoiles voisines à moitié au zoom 3,6 (milieu de leur fondu d'entrée)", () => {
    expect(layerWeights(3.6).stars).toBeCloseTo(0.5, 12);
  });

  it("devrait effacer les étiquettes des planètes avant leurs orbites au zoom 0,5", () => {
    const weights = layerWeights(0.5);
    expect(weights.solar).toBeCloseTo(0.873_799_73, 7);
    expect(weights.planetLabels).toBeCloseTo(0.648, 12);
  });

  it.each(LAYERS)("devrait garder le poids de la couche %s dans [0, 1] de z = −1 à z = 17", (layer) => {
    const values = series(layer, ALL_ZOOMS);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });

  it.each(["solar", "planetLabels", "sky"] as const)("devrait ne jamais faire revenir la couche %s quand on s'éloigne", (layer) => {
    expect(Math.max(...stepsOf(series(layer)))).toBeLessThanOrEqual(0);
  });

  it("devrait ne jamais faire revenir « Soleil » quand on s'éloigne, même quand la galaxie s'efface (jusqu'au zoom 17)", () => {
    expect(Math.max(...stepsOf(series("sunLabel", ALL_ZOOMS)))).toBeLessThanOrEqual(0);
  });

  it("devrait calculer « Soleil » comme avant jusqu'à la Voie lactée (zoom ≤ 8, à 1e−12)", () => {
    for (const zoom of ALL_ZOOMS.filter((z) => z <= 8)) expect(layerWeights(zoom).sunLabel).toBeCloseTo(formerSunLabel(zoom), 12);
  });

  it("devrait ne jamais montrer « Soleil » et « Vous êtes ici » ensemble sur l'ancre du Soleil", () => {
    for (const zoom of ALL_ZOOMS) {
      const { sunLabel, here } = layerWeights(zoom);
      expect(Math.min(sunLabel, here)).toBe(0);
    }
  });

  it.each(["sunPoint", "galaxy"] as const)("devrait ne jamais faire disparaître la couche %s quand on s'éloigne jusqu'au zoom 10", (layer) => {
    expect(Math.min(...stepsOf(series(layer)))).toBeGreaterThanOrEqual(0);
  });

  it.each(["sunPoint", "here", "cmb", "multiverse"] as const)("devrait ne jamais faire disparaître la couche %s, jusqu'au zoom 17", (layer) => {
    expect(Math.min(...stepsOf(series(layer, ALL_ZOOMS)))).toBeGreaterThanOrEqual(0);
  });

  it("devrait calculer « Vous êtes ici » comme avant jusqu'à la Voie lactée (zoom ≤ 8, à 1e−12)", () => {
    for (const zoom of ALL_ZOOMS.filter((z) => z <= 8)) expect(layerWeights(zoom).here).toBeCloseTo(formerHere(zoom), 12);
  });

  describe("du Groupe local au multivers", () => {
    it("devrait montrer la Voie lactée parmi les galaxies du Groupe local, sans « Centre de la Galaxie », au zoom 9,7", () => {
      expect(layerWeights(9.7)).toEqual({
        solar: 0, planetLabels: 0, sunPoint: 1, sky: 0, stars: 0, galaxy: 1, galaxyLabels: 0, here: 1, sunLabel: 0,
        localGroup: 1, web: 0, cmb: 0, multiverse: 0,
      });
    });

    it("devrait effacer à moitié la Voie lactée et le Groupe local au zoom 11,2, quand la toile commence", () => {
      const weights = layerWeights(11.2);
      expect(weights.galaxy).toBeCloseTo(0.5, 12);
      expect(weights.localGroup).toBeCloseTo(0.5, 12);
      expect(weights.web).toBe(0);
      expect(weights.here).toBe(1);
    });

    it("devrait montrer la toile à moitié au zoom 12, galaxies parties, fond diffus pas encore là", () => {
      const weights = layerWeights(12);
      expect(weights.web).toBeCloseTo(0.5, 12);
      expect([weights.galaxy, weights.localGroup, weights.cmb, weights.multiverse]).toEqual([0, 0, 0, 0]);
    });

    it("devrait montrer la toile et le fond diffus, sans autres univers, au zoom 14", () => {
      expect(layerWeights(14)).toEqual({
        solar: 0, planetLabels: 0, sunPoint: 1, sky: 0, stars: 0, galaxy: 0, galaxyLabels: 0, here: 1, sunLabel: 0,
        localGroup: 0, web: 1, cmb: 1, multiverse: 0,
      });
    });

    it("devrait montrer les autres univers et garder la toile à 0,35 au zoom 15", () => {
      const weights = layerWeights(15);
      expect(weights.multiverse).toBe(1);
      expect(weights.cmb).toBe(1);
      expect(weights.web).toBeCloseTo(0.35, 12);
      expect(weights.here).toBe(1);
    });

    it("devrait effacer « Centre de la Galaxie » avant que « Voie lactée » n'apparaisse (jamais l'un sur l'autre)", () => {
      for (const zoom of ALL_ZOOMS) {
        const { galaxyLabels, localGroup } = layerWeights(zoom);
        expect(Math.min(galaxyLabels, localGroup)).toBeLessThanOrEqual(0.25);
      }
    });
  });

  it("devrait avoir effacé orbites et ceintures quand le système solaire cesse d'être dessiné (zoom 2)", () => {
    expect(SOLAR_HIDDEN_ZOOM).toBe(2);
    expect(layerWeights(SOLAR_HIDDEN_ZOOM).solar).toBe(0);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out = layerWeights(0);
    const result = layerWeights(8, out);
    expect(result).toBe(out);
    expect(out).toEqual({
      solar: 0, planetLabels: 0, sunPoint: 1, sky: 0, stars: 0, galaxy: 1, galaxyLabels: 1, here: 1, sunLabel: 0,
      ...EXTRAGALACTIC,
    });
  });
});

describe("galaxyMagnification", () => {
  it("devrait laisser les galaxies à leur vraie taille jusqu'au zoom 8,5, escale de la Voie lactée comprise", () => {
    for (const zoom of ALL_ZOOMS.filter((z) => z < 8.49)) expect(galaxyMagnification(zoom)).toBe(1);
    expect(galaxyMagnification(8)).toBe(1);
  });

  it("devrait les grossir de LOCAL_GROUP_MAGNIFICATION dès le zoom 9,3 : au Groupe local et au-delà", () => {
    expect(LOCAL_GROUP_MAGNIFICATION).toBe(6);
    for (const zoom of ALL_ZOOMS.filter((z) => z > 9.31)) expect(galaxyMagnification(zoom)).toBe(LOCAL_GROUP_MAGNIFICATION);
    expect(galaxyMagnification(9.7)).toBe(LOCAL_GROUP_MAGNIFICATION);
  });

  it("devrait grossir à mesure que paraît le Groupe local, sans à-coup ni retour en arrière", () => {
    for (const zoom of ALL_ZOOMS.filter((z) => z >= 8.5 && z <= 9.3)) {
      expect((galaxyMagnification(zoom) - 1) / (LOCAL_GROUP_MAGNIFICATION - 1)).toBeCloseTo(layerWeights(zoom).localGroup, 12);
    }
    const steps = stepsOf(ALL_ZOOMS.map(galaxyMagnification));
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(0);
    // Moins d'un dixième du grossissement gagné d'un échantillon de zoom au suivant.
    expect(Math.max(...steps) / (LOCAL_GROUP_MAGNIFICATION - 1)).toBeLessThan(0.1);
  });
});
