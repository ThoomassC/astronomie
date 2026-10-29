import { describe, expect, it } from "vitest";
import { SOLAR_HIDDEN_ZOOM, layerWeights, type LayerWeights } from "@/components/scene/layers";

/** Zooms de −1 à 10 par pas de 0,05. */
const ZOOMS = Array.from({ length: 221 }, (_, i) => -1 + i * 0.05);
const LAYERS: readonly (keyof LayerWeights)[] = ["solar", "planetLabels", "sunPoint", "sky", "stars", "galaxy"];

/** Poids d'une couche sur toute la plage de zoom. */
const series = (layer: keyof LayerWeights) => ZOOMS.map((zoom) => layerWeights(zoom)[layer]);
/** Variation du poids d'un zoom au suivant. */
const stepsOf = (values: readonly number[]) => values.slice(1).map((value, i) => value - values[i]);

describe("layerWeights", () => {
  it("devrait ne dessiner que le système solaire et son ciel au zoom 0 (aucune couche nouvelle à l'écran)", () => {
    expect(layerWeights(0)).toEqual({ solar: 1, planetLabels: 1, sunPoint: 0, sky: 1, stars: 0, galaxy: 0 });
  });

  it("devrait montrer les étoiles voisines et le Soleil devenu point, sous le ciel, au zoom 4,6", () => {
    expect(layerWeights(4.6)).toEqual({ solar: 0, planetLabels: 0, sunPoint: 1, sky: 1, stars: 1, galaxy: 0 });
  });

  it("devrait ne montrer que la galaxie et le Soleil devenu point au zoom 8", () => {
    expect(layerWeights(8)).toEqual({ solar: 0, planetLabels: 0, sunPoint: 1, sky: 0, stars: 0, galaxy: 1 });
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

  it.each(LAYERS)("devrait garder le poids de la couche %s dans [0, 1] de z = −1 à z = 10", (layer) => {
    const values = series(layer);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });

  it.each(["solar", "planetLabels", "sky"] as const)("devrait ne jamais faire revenir la couche %s quand on s'éloigne", (layer) => {
    expect(Math.max(...stepsOf(series(layer)))).toBeLessThanOrEqual(0);
  });

  it.each(["sunPoint", "galaxy"] as const)("devrait ne jamais faire disparaître la couche %s quand on s'éloigne", (layer) => {
    expect(Math.min(...stepsOf(series(layer)))).toBeGreaterThanOrEqual(0);
  });

  it("devrait avoir effacé orbites et ceintures quand le système solaire cesse d'être dessiné (zoom 2)", () => {
    expect(SOLAR_HIDDEN_ZOOM).toBe(2);
    expect(layerWeights(SOLAR_HIDDEN_ZOOM).solar).toBe(0);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out = layerWeights(0);
    const result = layerWeights(8, out);
    expect(result).toBe(out);
    expect(out).toEqual({ solar: 0, planetLabels: 0, sunPoint: 1, sky: 0, stars: 0, galaxy: 1 });
  });
});
