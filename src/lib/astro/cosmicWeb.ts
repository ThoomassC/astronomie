import type { Vec3 } from "./constants";
import { gaussianSampler, seededRandom, srgbToLinear, type PointCloud } from "./milkyWay";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "./universe";

/**
 * Toile cosmique procédurale, dans la sphère de l'Univers observable, en milliards d'années-lumière (Gal),
 * centrée sur nous. Un squelette de nœuds (amas de galaxies) reliés à leurs plus proches voisins (filaments) ;
 * les points s'alignent le long des filaments, se serrent aux nœuds, quelques-uns flottent dans les vides.
 *
 * C'est une image, pas une carte : ses mailles (une douzaine de Gal) sont bien plus grandes que celles de la
 * vraie toile, dont les vides mesurent 90 à 240 millions d'al et les filaments, larges d'une dizaine de millions
 * d'al, en mesurent des dizaines à des centaines de long (van de Weygaert et Platen 2011 ; Aragón-Calvo et al.
 * 2010 ; Cautun et al. 2014). À l'échelle de l'Univers observable, la vraie toile ne serait qu'un grain
 * uniforme ; la plaque le dit.
 */

/** Graine de la toile : la même à chaque visite. */
export const COSMIC_WEB_SEED = 20_261_030;
/** Nœuds du squelette ; le premier, à l'origine, est le nôtre. */
export const COSMIC_WEB_NODE_COUNT = 180;
/** Chaque nœud est relié à ce nombre de plus proches voisins. */
export const COSMIC_WEB_NEIGHBOURS = 3;
/** Nombre de points de référence : à ce nombre, chaque point garde l'éclat de sa teinte (budget avec une souris). */
export const COSMIC_WEB_REFERENCE_POINTS = 30_000;

/** Parts des points : le long des filaments, en amas aux nœuds ; le reste dans les vides. */
const FILAMENT_SHARE = 0.7;
const CLUSTER_SHARE = 0.25;
/** Écarts types autour d'un filament et d'un nœud, en Gal. */
const FILAMENT_SIGMA_GLY = 0.6;
const CLUSTER_SIGMA_GLY = 0.9;
/** Les nœuds restent à moins de cette part du rayon : les amas ne débordent pas de la sphère. */
const NODE_EXTENT = 0.9;
/** Écart minimal entre deux nœuds, en part du rayon : des mailles régulières, sans nœuds collés. */
const MIN_NODE_GAP = 0.13;
/** Essais pour placer un nœud à l'écart des autres, puis pour tenir un point dans la sphère. */
const MAX_NODE_DRAWS = 64;
const MAX_POINT_DRAWS = 16;
/** Coquille où se cherche l'ancre de l'étiquette « Toile cosmique », en parts du rayon. */
const LABEL_SHELL = { inner: 0.35, outer: 0.65 } as const;

type Rgb = readonly [red: number, green: number, blue: number];

interface Population {
  /** Teinte affichée d'un point seul (sRGB) au nombre de points de référence. */
  display: Rgb;
  minSize: number;
  maxSize: number;
}

const shade = (red: number, green: number, blue: number, brightness: number): Rgb => [
  red * brightness,
  green * brightness,
  blue * brightness,
];

/** Lumière des galaxies, chaude et faible : filaments, amas (plus blancs, plus gros), vides (à peine visibles). */
const FILAMENT: Population = { display: shade(1, 0.8, 0.6, 0.16), minSize: 1, maxSize: 1.8 };
const CLUSTER: Population = { display: shade(1, 0.88, 0.72, 0.22), minSize: 1.4, maxSize: 2.2 };
const VOID: Population = { display: shade(1, 0.72, 0.52, 0.08), minSize: 1, maxSize: 1.2 };

export interface CosmicWebSkeleton {
  /** Nœuds, en Gal ; le premier à l'origine. */
  nodes: readonly Vec3[];
  /** Filaments : paires d'indices de nœuds (le plus petit d'abord), chacune une seule fois. */
  edges: readonly (readonly [number, number])[];
}

const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const distanceSq = (a: Vec3, b: Vec3) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

/** Point uniforme dans la boule de rayon `radius` (rejet dans le cube). */
function inBall(random: () => number, radius: number): Vec3 {
  for (;;) {
    const x = 2 * random() - 1;
    const y = 2 * random() - 1;
    const z = 2 * random() - 1;
    if (x * x + y * y + z * z <= 1) return { x: x * radius, y: y * radius, z: z * radius };
  }
}

/**
 * Squelette de la toile : 180 nœuds, le premier à l'origine (nous), les autres uniformes dans 0,9 × le rayon,
 * écartés d'au moins 0,13 × le rayon (au mieux de 64 essais) ; chaque nœud relié à ses 3 plus proches voisins.
 * Déterministe pour une graine donnée.
 */
export function cosmicWebSkeleton(seed: number): CosmicWebSkeleton {
  const random = seededRandom(seed);
  const radius = OBSERVABLE_UNIVERSE_RADIUS_GLY;
  const gapSq = (MIN_NODE_GAP * radius) ** 2;
  const nodes: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  /** Un nœud déjà posé est-il à moins de l'écart minimal ? Distances au carré, sans allocation (calculé au démarrage). */
  const crowded = (candidate: Vec3) => {
    for (const node of nodes) if (distanceSq(node, candidate) < gapSq) return true;
    return false;
  };
  while (nodes.length < COSMIC_WEB_NODE_COUNT) {
    let candidate = inBall(random, NODE_EXTENT * radius);
    for (let attempt = 1; attempt < MAX_NODE_DRAWS && crowded(candidate); attempt++) candidate = inBall(random, NODE_EXTENT * radius);
    nodes.push(candidate);
  }

  const linked = new Uint8Array(COSMIC_WEB_NODE_COUNT * COSMIC_WEB_NODE_COUNT);
  const edges: (readonly [number, number])[] = [];
  // Plus proches voisins de chaque nœud, du plus proche au plus lointain ; à distance égale, le plus petit indice.
  const nearest = new Int32Array(COSMIC_WEB_NEIGHBOURS);
  const nearestSq = new Float64Array(COSMIC_WEB_NEIGHBOURS);
  nodes.forEach((node, i) => {
    nearest.fill(-1);
    nearestSq.fill(Infinity);
    nodes.forEach((other, j) => {
      if (j === i) return;
      const d = distanceSq(node, other);
      if (d >= nearestSq[COSMIC_WEB_NEIGHBOURS - 1]) return;
      let k = COSMIC_WEB_NEIGHBOURS - 1;
      for (; k > 0 && d < nearestSq[k - 1]; k--) {
        nearestSq[k] = nearestSq[k - 1];
        nearest[k] = nearest[k - 1];
      }
      nearestSq[k] = d;
      nearest[k] = j;
    });
    for (const j of nearest) {
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      if (linked[a * COSMIC_WEB_NODE_COUNT + b]) continue;
      linked[a * COSMIC_WEB_NODE_COUNT + b] = 1;
      edges.push([a, b]);
    }
  });
  return { nodes, edges };
}

/**
 * Ancre de l'étiquette « Toile cosmique », en Gal : parmi les nœuds à mi-chemin du bord (0,35 à 0,65 × le rayon),
 * le plus proche de la verticale de la scène. Vue de l'escale, elle se projette au-dessus de « Vous êtes ici »,
 * quel que soit l'azimut de la caméra. Calculée sur le seul squelette, sans tirer de points.
 */
export function cosmicWebLabelAnchor(seed: number): Vec3 {
  return labelNode(cosmicWebSkeleton(seed).nodes);
}

/** Nœud de l'ancre d'étiquette (voir cosmicWebLabelAnchor), copié. */
function labelNode(nodes: readonly Vec3[]): Vec3 {
  const radius = OBSERVABLE_UNIVERSE_RADIUS_GLY;
  let best = nodes[1];
  let bestHeight = -Infinity;
  for (const node of nodes.slice(1)) {
    const length = Math.hypot(node.x, node.y, node.z);
    if (length < LABEL_SHELL.inner * radius || length > LABEL_SHELL.outer * radius) continue;
    if (node.y / length > bestHeight) {
      best = node;
      bestHeight = node.y / length;
    }
  }
  return { ...best };
}

/**
 * Nuage de la toile : `count` points (en moyenne 70 % le long des filaments, choisis selon leur longueur, écart
 * type 0,6 Gal ; 25 % en amas aux nœuds, choisis selon leur nombre de filaments, écart type 0,9 Gal ; le reste
 * uniforme dans les vides), tous dans la sphère de l'Univers observable, dans un ordre aléatoire : tout début du
 * nuage en est un échantillon fidèle (niveau de détail par setDrawRange). Couleurs chaudes et faibles, tailles de
 * 1 à 2,2 px ; l'éclat de chaque point est multiplié par 30 000 / count, borné à 1 : la lumière totale ne dépend
 * pas du budget. Renvoie aussi l'ancre de l'étiquette « Toile cosmique », en Gal.
 */
export function cosmicWebCloud(count: number, seed: number): PointCloud & { labelAnchor: Vec3 } {
  const { nodes, edges } = cosmicWebSkeleton(seed);
  // Les points suivent leur propre suite : le squelette ne dépend pas du budget.
  const random = seededRandom(seed ^ 0x5bd1e995);
  const gauss = gaussianSampler(random);
  const radius = OBSERVABLE_UNIVERSE_RADIUS_GLY;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const glow = COSMIC_WEB_REFERENCE_POINTS / count;
  const linearColors = new Map<Population, Rgb>();
  const linearColorOf = (population: Population): Rgb => {
    let color = linearColors.get(population);
    if (!color) {
      const [red, green, blue] = population.display.map((value) => srgbToLinear(Math.min(1, value * glow)));
      color = [red, green, blue];
      linearColors.set(population, color);
    }
    return color;
  };

  // Tirage des filaments selon leur longueur (densité linéaire uniforme), des nœuds selon leur nombre de filaments.
  const cumulativeLength: number[] = [];
  let totalLength = 0;
  for (const [a, b] of edges) {
    totalLength += distance(nodes[a], nodes[b]);
    cumulativeLength.push(totalLength);
  }
  const degree = new Array<number>(nodes.length).fill(0);
  for (const [a, b] of edges) {
    degree[a] += 1;
    degree[b] += 1;
  }
  const cumulativeDegree: number[] = [];
  let totalDegree = 0;
  for (const links of degree) {
    totalDegree += links;
    cumulativeDegree.push(totalDegree);
  }
  /** Premier indice dont la somme cumulée dépasse `value` (recherche dichotomique). */
  const firstAbove = (cumulative: readonly number[], value: number) => {
    let low = 0;
    let high = cumulative.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (cumulative[middle] > value) high = middle;
      else low = middle + 1;
    }
    return low;
  };

  let index = 0;
  /** Range un point tiré par `draw`, retiré tant qu'il sort de la sphère ; après MAX_POINT_DRAWS essais, ramené dedans. */
  const emit = (draw: () => Vec3, population: Population) => {
    let point = draw();
    for (let attempt = 1; Math.hypot(point.x, point.y, point.z) >= radius && attempt < MAX_POINT_DRAWS; attempt++) point = draw();
    const length = Math.hypot(point.x, point.y, point.z);
    const k = length >= radius ? (0.999 * radius) / length : 1;
    const i3 = index * 3;
    positions[i3] = point.x * k;
    positions[i3 + 1] = point.y * k;
    positions[i3 + 2] = point.z * k;
    const color = linearColorOf(population);
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];
    sizes[index] = population.minSize + random() * (population.maxSize - population.minSize);
    index += 1;
  };

  for (let i = 0; i < count; i++) {
    // Population tirée point par point : ordre aléatoire, tout début du nuage en est un échantillon fidèle.
    const population = random();
    if (population < FILAMENT_SHARE) {
      const [a, b] = edges[firstAbove(cumulativeLength, random() * totalLength)];
      const t = random();
      const from = nodes[a];
      const to = nodes[b];
      emit(
        () => ({
          x: from.x + t * (to.x - from.x) + gauss(FILAMENT_SIGMA_GLY),
          y: from.y + t * (to.y - from.y) + gauss(FILAMENT_SIGMA_GLY),
          z: from.z + t * (to.z - from.z) + gauss(FILAMENT_SIGMA_GLY),
        }),
        FILAMENT,
      );
    } else if (population < FILAMENT_SHARE + CLUSTER_SHARE) {
      const node = nodes[firstAbove(cumulativeDegree, random() * totalDegree)];
      emit(
        () => ({ x: node.x + gauss(CLUSTER_SIGMA_GLY), y: node.y + gauss(CLUSTER_SIGMA_GLY), z: node.z + gauss(CLUSTER_SIGMA_GLY) }),
        CLUSTER,
      );
    } else {
      emit(() => inBall(random, radius), VOID);
    }
  }
  return { count, positions, colors, sizes, labelAnchor: labelNode(nodes) };
}
