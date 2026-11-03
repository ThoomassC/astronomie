import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import {
  MULTIVERSE_BUBBLE_COUNT,
  MULTIVERSE_SEED,
  MULTIVERSE_VIEW_DEG,
  multiverseBubbles,
  multiverseRadius,
  type Bubble,
} from "@/lib/astro/multiverse";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "@/lib/astro/universe";

/** Rayon de notre bulle : l'Univers observable, en milliards d'années-lumière. */
const OURS = OBSERVABLE_UNIVERSE_RADIUS_GLY;

const length = (p: Vec3) => Math.hypot(p.x, p.y, p.z);
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe("multiverseBubbles", () => {
  const bubbles = multiverseBubbles(MULTIVERSE_SEED);
  const others = bubbles.slice(1);

  it("devrait dessiner 15 bulles", () => {
    expect(MULTIVERSE_BUBBLE_COUNT).toBe(15);
    expect(bubbles).toHaveLength(15);
  });

  it("devrait commencer par la nôtre : centrée sur nous, du rayon de l'Univers observable (46 milliards d'al)", () => {
    expect(bubbles[0].center).toEqual({ x: 0, y: 0, z: 0 });
    expect(bubbles[0].radius).toBe(OURS);
  });

  it("devrait donner aux autres un rayon de 0,45 à 1,6 fois le nôtre", () => {
    for (const bubble of others) {
      expect(bubble.radius).toBeGreaterThanOrEqual(0.45 * OURS);
      expect(bubble.radius).toBeLessThanOrEqual(1.6 * OURS);
    }
  });

  it("devrait poser les centres à moins de 9 fois notre rayon", () => {
    for (const bubble of others) expect(length(bubble.center)).toBeLessThanOrEqual(9 * OURS);
  });

  it("devrait tenir toutes les bulles entières dans 9,5 fois notre rayon (positions de scène sous 450 milliards d'al)", () => {
    for (const bubble of bubbles) expect(length(bubble.center) + bubble.radius).toBeLessThanOrEqual(9.5 * OURS);
  });

  it("devrait écarter chaque paire de bulles d'au moins 0,92 × la somme de leurs rayons (légers contacts permis)", () => {
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        expect(distance(bubbles[i].center, bubbles[j].center)).toBeGreaterThanOrEqual(0.92 * (bubbles[i].radius + bubbles[j].radius));
      }
    }
  });

  it("devrait garder dégagée la vue de l'escale : aucune autre bulle à moins de 1,25 × (46 + r) de l'axe de visée", () => {
    const azimuth = (MULTIVERSE_VIEW_DEG.azimuth * Math.PI) / 180;
    const elevation = (MULTIVERSE_VIEW_DEG.elevation * Math.PI) / 180;
    const axis = { x: Math.cos(elevation) * Math.cos(azimuth), y: Math.sin(elevation), z: Math.cos(elevation) * Math.sin(azimuth) };
    for (const { center, radius } of others) {
      const along = center.x * axis.x + center.y * axis.y + center.z * axis.z;
      const offAxis = Math.hypot(center.x - along * axis.x, center.y - along * axis.y, center.z - along * axis.z);
      expect(offAxis).toBeGreaterThanOrEqual(1.25 * (OURS + radius));
    }
  });

  it("devrait regarder le multivers comme l'Univers observable : azimut 206°, élévation 20°", () => {
    expect(MULTIVERSE_VIEW_DEG).toEqual({ azimuth: 206, elevation: 20 });
  });

  it("devrait donner à chaque bulle une teinte en fraction de tour, dans [0, 1[", () => {
    for (const bubble of bubbles) {
      expect(bubble.hue).toBeGreaterThanOrEqual(0);
      expect(bubble.hue).toBeLessThan(1);
    }
  });

  it("devrait redonner les mêmes bulles pour la même graine", () => {
    expect(multiverseBubbles(MULTIVERSE_SEED)).toEqual(bubbles);
  });

  it("devrait donner d'autres bulles pour une autre graine, la nôtre exceptée", () => {
    const shuffled = multiverseBubbles(MULTIVERSE_SEED + 1);
    expect(shuffled[0]).toEqual(bubbles[0]);
    expect(shuffled.slice(1)).not.toEqual(others);
  });
});

describe("multiverseRadius", () => {
  it("devrait renvoyer la plus grande distance entre nous et le bord d'une bulle : max(|centre| + rayon)", () => {
    const bubbles: Bubble[] = [
      { center: { x: 0, y: 0, z: 0 }, radius: 46, hue: 0.1 },
      { center: { x: 100, y: 0, z: 0 }, radius: 30, hue: 0.5 },
      { center: { x: 0, y: -60, z: 80 }, radius: 50, hue: 0.7 },
    ];
    expect(multiverseRadius(bubbles)).toBe(150);
  });

  it("devrait valoir notre rayon quand il n'y a que notre bulle", () => {
    expect(multiverseRadius([{ center: { x: 0, y: 0, z: 0 }, radius: 46, hue: 0 }])).toBe(46);
  });

  it("devrait tenir le multivers dessiné dans 9,5 fois notre rayon", () => {
    expect(multiverseRadius(multiverseBubbles(MULTIVERSE_SEED))).toBeLessThanOrEqual(9.5 * OURS);
  });
});
