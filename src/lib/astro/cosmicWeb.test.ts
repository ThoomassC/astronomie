import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import {
  COSMIC_WEB_NEIGHBOURS,
  COSMIC_WEB_NODE_COUNT,
  COSMIC_WEB_REFERENCE_POINTS,
  COSMIC_WEB_SEED,
  cosmicWebCloud,
  cosmicWebLabelAnchor,
  cosmicWebSkeleton,
} from "@/lib/astro/cosmicWeb";
import type { PointCloud } from "@/lib/astro/milkyWay";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "@/lib/astro/universe";

const length = (p: Vec3) => Math.hypot(p.x, p.y, p.z);
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Points du nuage, en milliards d'années-lumière. */
function pointsOf(cloud: PointCloud): Vec3[] {
  return Array.from({ length: cloud.count }, (_, i) => ({
    x: cloud.positions[i * 3],
    y: cloud.positions[i * 3 + 1],
    z: cloud.positions[i * 3 + 2],
  }));
}

/** Distance d'un point au segment [a, b]. */
function distanceToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const lengthSq = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
  const t = lengthSq > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y + (p.z - a.z) * ab.z) / lengthSq)) : 0;
  return distance(p, { x: a.x + t * ab.x, y: a.y + t * ab.y, z: a.z + t * ab.z });
}

/** Valeur affichée (sRGB) d'une composante linéaire : ce que le mélange additif cumule. */
const encode = (value: number) => (value <= 0.003_130_8 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

function displayedLight(cloud: PointCloud): number {
  let sum = 0;
  for (let i = 0; i < cloud.count; i++) sum += encode(cloud.colors[i * 3 + 1]);
  return sum;
}

describe("cosmicWebSkeleton", () => {
  const skeleton = cosmicWebSkeleton(COSMIC_WEB_SEED);

  it("devrait poser 180 nœuds, le premier à l'origine : nous", () => {
    expect(COSMIC_WEB_NODE_COUNT).toBe(180);
    expect(skeleton.nodes).toHaveLength(180);
    expect(skeleton.nodes[0]).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("devrait garder tous les nœuds à l'intérieur de l'Univers observable", () => {
    expect(Math.max(...skeleton.nodes.map(length))).toBeLessThan(OBSERVABLE_UNIVERSE_RADIUS_GLY);
  });

  it("devrait relier chaque nœud à ses 3 plus proches voisins", () => {
    expect(COSMIC_WEB_NEIGHBOURS).toBe(3);
    const linked = new Set(skeleton.edges.map(([a, b]) => `${a}-${b}`));
    skeleton.nodes.forEach((node, i) => {
      const nearest = skeleton.nodes
        .map((other, j) => ({ j, d: distance(node, other) }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      for (const { j } of nearest) expect(linked.has(`${Math.min(i, j)}-${Math.max(i, j)}`)).toBe(true);
    });
  });

  it("devrait lister chaque arête une seule fois, de l'indice le plus petit au plus grand", () => {
    const keys = skeleton.edges.map(([a, b]) => `${a}-${b}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(skeleton.edges.every(([a, b]) => a < b)).toBe(true);
  });

  it("devrait redonner le même squelette pour la même graine et un autre pour une autre graine", () => {
    expect(cosmicWebSkeleton(COSMIC_WEB_SEED)).toEqual(skeleton);
    expect(cosmicWebSkeleton(COSMIC_WEB_SEED + 1).nodes).not.toEqual(skeleton.nodes);
  });
});

describe("cosmicWebCloud", () => {
  describe("6 000 points", () => {
    const cloud = cosmicWebCloud(6000, COSMIC_WEB_SEED);
    const points = pointsOf(cloud);

    it("devrait compter exactement 6 000 points : 3 coordonnées, 3 composantes de couleur et 1 taille par point", () => {
      expect(cloud.count).toBe(6000);
      expect(cloud.positions).toHaveLength(18_000);
      expect(cloud.colors).toHaveLength(18_000);
      expect(cloud.sizes).toHaveLength(6000);
    });

    it("devrait redonner exactement les mêmes tableaux pour la même graine", () => {
      const again = cosmicWebCloud(6000, COSMIC_WEB_SEED);
      expect(again.positions).toEqual(cloud.positions);
      expect(again.colors).toEqual(cloud.colors);
      expect(again.sizes).toEqual(cloud.sizes);
    });

    it("devrait donner une autre toile pour une autre graine", () => {
      expect(cosmicWebCloud(6000, COSMIC_WEB_SEED + 1).positions).not.toEqual(cloud.positions);
    });

    it("ne devrait produire aucune valeur infinie ni NaN", () => {
      const values = [...cloud.positions, ...cloud.colors, ...cloud.sizes];
      expect(values.filter((value) => !Number.isFinite(value))).toEqual([]);
    });

    it("devrait garder tous les points dans l'Univers observable (moins de 46 milliards d'al de nous)", () => {
      expect(Math.max(...points.map(length))).toBeLessThan(OBSERVABLE_UNIVERSE_RADIUS_GLY);
    });

    it("devrait tracer une toile : au moins 60 % des points à moins de 1,2 milliard d'al d'une arête ou d'un nœud", () => {
      const { nodes, edges } = cosmicWebSkeleton(COSMIC_WEB_SEED);
      const near = (p: Vec3) =>
        nodes.some((node) => distance(p, node) < 1.2) || edges.some(([a, b]) => distanceToSegment(p, nodes[a], nodes[b]) < 1.2);
      expect(points.filter(near).length / points.length).toBeGreaterThanOrEqual(0.6);
    });

    it("devrait laisser des vides : au moins 2 % des points à plus de 3 milliards d'al de toute arête", () => {
      const { nodes, edges } = cosmicWebSkeleton(COSMIC_WEB_SEED);
      const isolated = (p: Vec3) => edges.every(([a, b]) => distanceToSegment(p, nodes[a], nodes[b]) > 3);
      expect(points.filter(isolated).length / points.length).toBeGreaterThanOrEqual(0.02);
    });

    it("devrait donner des tailles de 1 à 2,2 px et des couleurs linéaires positives ou nulles", () => {
      expect(Math.min(...cloud.sizes)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...cloud.sizes)).toBeLessThanOrEqual(2.2);
      expect(Math.min(...cloud.colors)).toBeGreaterThanOrEqual(0);
    });

    it("devrait mêler les populations : dans les 1 200 premiers points, chacune a sa part du nuage entier (à 0,05 près)", () => {
      // Une teinte par population (filaments, amas, vides) : la composante verte les distingue.
      const shares = (from: number, to: number) => {
        const counts = new Map<number, number>();
        for (let i = from; i < to; i++) counts.set(cloud.colors[i * 3 + 1], (counts.get(cloud.colors[i * 3 + 1]) ?? 0) + 1);
        return new Map([...counts].map(([green, n]) => [green, n / (to - from)]));
      };
      const all = shares(0, cloud.count);
      const head = shares(0, 1200);
      expect(all.size).toBe(3);
      for (const [green, share] of all) expect(Math.abs((head.get(green) ?? 0) - share)).toBeLessThan(0.05);
    });

    it("devrait donner des couleurs chaudes : plus de rouge que de bleu dans chaque point", () => {
      const cold = Array.from({ length: cloud.count }, (_, i) => cloud.colors[i * 3] - cloud.colors[i * 3 + 2]).filter((d) => d < 0);
      expect(cold).toEqual([]);
    });
  });

  it("devrait garder la même lumière affichée totale sur écran tactile (12 000 points) qu'avec une souris (30 000), à 5 % près", () => {
    expect(COSMIC_WEB_REFERENCE_POINTS).toBe(30_000);
    const fine = displayedLight(cosmicWebCloud(COSMIC_WEB_REFERENCE_POINTS, COSMIC_WEB_SEED));
    const coarse = displayedLight(cosmicWebCloud(12_000, COSMIC_WEB_SEED));
    expect(coarse / fine).toBeGreaterThan(0.95);
    expect(coarse / fine).toBeLessThan(1.05);
  });

  it("devrait poser l'étiquette « Toile cosmique » sur un nœud, à mi-chemin du bord, au-dessus de nous", () => {
    const { labelAnchor } = cosmicWebCloud(100, COSMIC_WEB_SEED);
    const { nodes } = cosmicWebSkeleton(COSMIC_WEB_SEED);
    expect(nodes.slice(1)).toContainEqual(labelAnchor);
    expect(length(labelAnchor)).toBeGreaterThanOrEqual(0.3 * OBSERVABLE_UNIVERSE_RADIUS_GLY);
    expect(length(labelAnchor)).toBeLessThanOrEqual(0.7 * OBSERVABLE_UNIVERSE_RADIUS_GLY);
    expect(labelAnchor.y).toBeGreaterThan(0.5 * length(labelAnchor));
  });

  it("devrait poser la même ancre d'étiquette quel que soit le nombre de points", () => {
    expect(cosmicWebCloud(100, COSMIC_WEB_SEED).labelAnchor).toEqual(cosmicWebCloud(5000, COSMIC_WEB_SEED).labelAnchor);
  });

  it("devrait poser la même ancre que cosmicWebLabelAnchor, calculée sans tirer de points", () => {
    expect(cosmicWebLabelAnchor(COSMIC_WEB_SEED)).toEqual(cosmicWebCloud(100, COSMIC_WEB_SEED).labelAnchor);
  });
});
