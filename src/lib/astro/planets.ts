export type PlanetKey =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

/**
 * Éléments képlériens J2000 (JPL, « Approximate Positions of the Planets », 1800-2050) :
 * demi-grand axe (UA), excentricité, inclinaison (°), longitude moyenne (°),
 * longitude du périhélie (°), longitude du nœud ascendant (°).
 * `rates` donne leur variation par siècle julien.
 */
export type KeplerianSet = readonly [a: number, e: number, i: number, l: number, varpi: number, node: number];

export interface Planet {
  key: PlanetKey;
  name: string;
  color: string;
  /** Rayon affiché dans la scène (unités de scène, tailles agrandies). */
  displayRadius: number;
  /** Inclinaison de l'axe de rotation, en degrés. */
  tiltDeg: number;
  /** Période de rotation sidérale, en heures (valeur absolue). */
  rotationHours: number;
  /** Diamètre équatorial réel, en km. */
  diameterKm: number;
  elements: KeplerianSet;
  rates: KeplerianSet;
}

export const PLANETS: readonly Planet[] = [
  {
    key: "mercury", name: "Mercure", color: "#B5ADA3", displayRadius: 0.62, tiltDeg: 0.03, rotationHours: 1407.6, diameterKm: 4879,
    elements: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    rates: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  },
  {
    key: "venus", name: "Vénus", color: "#E6CB94", displayRadius: 0.98, tiltDeg: 177.36, rotationHours: 5832.5, diameterKm: 12104,
    elements: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    rates: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  },
  {
    key: "earth", name: "Terre", color: "#5B9BE6", displayRadius: 1.02, tiltDeg: 23.44, rotationHours: 23.93, diameterKm: 12756,
    elements: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    rates: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  },
  {
    key: "mars", name: "Mars", color: "#DA6A43", displayRadius: 0.74, tiltDeg: 25.19, rotationHours: 24.62, diameterKm: 6792,
    elements: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rates: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  },
  {
    key: "jupiter", name: "Jupiter", color: "#D8A878", displayRadius: 3.3, tiltDeg: 3.13, rotationHours: 9.93, diameterKm: 142984,
    elements: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rates: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  },
  {
    key: "saturn", name: "Saturne", color: "#E2C98F", displayRadius: 2.8, tiltDeg: 26.73, rotationHours: 10.56, diameterKm: 120536,
    elements: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rates: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  },
  {
    key: "uranus", name: "Uranus", color: "#9ED9DE", displayRadius: 1.85, tiltDeg: 97.77, rotationHours: 17.24, diameterKm: 51118,
    elements: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    rates: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  },
  {
    key: "neptune", name: "Neptune", color: "#5878E8", displayRadius: 1.8, tiltDeg: 28.32, rotationHours: 16.11, diameterKm: 49528,
    elements: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    rates: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  },
];

export const PLANET_BY_KEY = Object.fromEntries(PLANETS.map((p) => [p.key, p])) as Record<PlanetKey, Planet>;

export const SUN = { name: "Soleil", color: "#FFB13B", displayRadius: 7, diameterKm: 1_392_700 } as const;
