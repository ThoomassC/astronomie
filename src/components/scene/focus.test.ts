import { describe, expect, it } from "vitest";
import {
  ORBIT_CLEAR_RADII,
  ORBIT_FADE_RADII,
  UNVISITED_BRIGHTNESS,
  orbitNearAlpha,
  planetBrightness,
  restWeight,
  writeOrbitAlphas,
} from "@/components/scene/focus";
import type { StopKey } from "@/lib/journey/camera";

/** Vol publié par le suivi du défilement : escales de départ et d'arrivée, avancement brut. */
const flight = (from: StopKey, to: StopKey, t: number) => ({ from, to, t });
const resting = (stop: StopKey) => flight(stop, stop, 0);

describe("restWeight", () => {
  it("devrait valoir 1 au repos sur l'escale, 0 au repos sur une autre", () => {
    expect(restWeight(resting("saturn"), "saturn")).toBe(1);
    expect(restWeight(resting("saturn"), "jupiter")).toBe(0);
  });

  it("devrait retomber en douceur à 0 sur le premier cinquième du vol qui quitte l'escale, puis y rester", () => {
    expect(restWeight(flight("saturn", "uranus", 0), "saturn")).toBe(1);
    expect(restWeight(flight("saturn", "uranus", 0.1), "saturn")).toBeCloseTo(0.5, 12);
    expect(restWeight(flight("saturn", "uranus", 0.2), "saturn")).toBe(0);
    expect(restWeight(flight("saturn", "uranus", 0.6), "saturn")).toBe(0);
  });

  it("devrait monter en douceur à 1 sur le dernier cinquième du vol qui arrive sur l'escale", () => {
    expect(restWeight(flight("saturn", "uranus", 0.5), "uranus")).toBe(0);
    expect(restWeight(flight("saturn", "uranus", 0.8), "uranus")).toBe(0);
    expect(restWeight(flight("saturn", "uranus", 0.9), "uranus")).toBeCloseTo(0.5, 12);
    expect(restWeight(flight("saturn", "uranus", 1), "uranus")).toBe(1);
  });

  it("devrait valoir 0 pour une escale étrangère au vol", () => {
    expect(restWeight(flight("saturn", "uranus", 0.95), "neptune")).toBe(0);
  });
});

describe("orbitNearAlpha", () => {
  const radius = 2.8;

  it("devrait effacer l'orbite jusqu'à 2,5 rayons de l'astre au repos (globe et anneaux de Saturne)", () => {
    expect(ORBIT_CLEAR_RADII).toBe(2.5);
    expect(orbitNearAlpha(0, radius, 1)).toBe(0);
    expect(orbitNearAlpha(2.4 * radius, radius, 1)).toBe(0);
  });

  it("devrait la rendre entière à 6 rayons et au-delà", () => {
    expect(ORBIT_FADE_RADII).toBe(6);
    expect(orbitNearAlpha(6 * radius, radius, 1)).toBe(1);
    expect(orbitNearAlpha(40 * radius, radius, 1)).toBe(1);
  });

  it("devrait la fondre entre les deux, à moitié à mi-chemin (4,25 rayons)", () => {
    expect(orbitNearAlpha(4.25 * radius, radius, 1)).toBeCloseTo(0.5, 12);
  });

  it("devrait suivre le poids du repos : orbite entière en vol, à moitié effacée à mi-repos", () => {
    expect(orbitNearAlpha(0, radius, 0)).toBe(1);
    expect(orbitNearAlpha(0, radius, 0.5)).toBeCloseTo(0.5, 12);
  });

  it("ne devrait rien effacer autour d'un astre sans rayon", () => {
    expect(orbitNearAlpha(0, 0, 1)).toBe(1);
  });
});

describe("writeOrbitAlphas", () => {
  it("devrait écrire l'alpha de chaque sommet (quatrième composante RGBA), sans toucher à sa couleur", () => {
    // Trois sommets sur l'axe x, à 0, 4,25 et 10 rayons du centre de l'astre (rayon 1, centre en x = 5).
    const positions = new Float32Array([5, 0, 0, 9.25, 0, 0, 15, 0, 0]);
    const colors = new Float32Array(12).fill(1);
    writeOrbitAlphas(positions, { x: 5, y: 0, z: 0 }, 1, 1, colors);
    expect(Array.from(colors)).toEqual([1, 1, 1, 0, 1, 1, 1, expect.closeTo(0.5, 6), 1, 1, 1, 1]);
  });

  it("devrait rendre son alpha entier à chaque sommet quand le repos retombe à 0", () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0]);
    const colors = new Float32Array([1, 1, 1, 0, 1, 1, 1, 0.2]);
    writeOrbitAlphas(positions, { x: 0, y: 0, z: 0 }, 1, 0, colors);
    expect(Array.from(colors)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("planetBrightness", () => {
  it("devrait assombrir les autres planètes à 35 % d'éclat au repos sur une planète, et garder l'astre visité entier", () => {
    expect(UNVISITED_BRIGHTNESS).toBe(0.35);
    expect(planetBrightness(resting("saturn"), "neptune")).toBeCloseTo(0.35, 12);
    expect(planetBrightness(resting("saturn"), "jupiter")).toBeCloseTo(0.35, 12);
    expect(planetBrightness(resting("saturn"), "saturn")).toBe(1);
  });

  it.each<StopKey>(["hero", "sun", "belt", "beyond"])(
    "ne devrait rien assombrir au repos sur une escale sans planète (%s)",
    (stop) => {
      expect(planetBrightness(resting(stop), "neptune")).toBe(1);
      expect(planetBrightness(resting(stop), "earth")).toBe(1);
    },
  );

  it("ne devrait rien assombrir en plein vol", () => {
    expect(planetBrightness(flight("saturn", "uranus", 0.5), "neptune")).toBe(1);
    expect(planetBrightness(flight("saturn", "uranus", 0.5), "saturn")).toBe(1);
  });

  it("devrait éclaircir en douceur au départ, puis assombrir de nouveau à l'arrivée sur la planète suivante", () => {
    // À t = 0,1, Saturne n'est plus qu'à moitié au repos : Neptune remonte à mi-chemin, 1 − 0,65 × 0,5.
    expect(planetBrightness(flight("saturn", "uranus", 0.1), "neptune")).toBeCloseTo(0.675, 12);
    // À t = 0,9, Uranus est à moitié au repos : Saturne, qu'on vient de quitter, s'assombrit à son tour.
    expect(planetBrightness(flight("saturn", "uranus", 0.9), "saturn")).toBeCloseTo(0.675, 12);
    expect(planetBrightness(flight("saturn", "uranus", 0.9), "uranus")).toBe(1);
  });
});
