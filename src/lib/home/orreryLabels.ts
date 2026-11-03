import type { PlanetKey } from "@/lib/astro/planets";
import {
  EARTH_HALO_RADIUS,
  ORRERY_HALF_SIZE,
  ORRERY_ORBIT_UNITS,
  ORRERY_PLANET_RADIUS,
  ORRERY_SUN,
  SATURN_RING,
  type OrreryPlanet,
} from "./orrery";

/**
 * Ordre de pose des étiquettes du planétaire : « Vous êtes ici » (la Terre) d'abord, puis les géantes de l'extérieur
 * vers l'intérieur, puis Mars, Vénus et Mercure, serrées près du Soleil, qui cèdent les premières.
 */
export const LABEL_ORDER: readonly PlanetKey[] = [
  "earth",
  "neptune",
  "uranus",
  "saturn",
  "jupiter",
  "mars",
  "venus",
  "mercury",
];

/** Taille d'une étiquette mesurée à l'écran, en px. */
export interface LabelSize {
  width: number;
  height: number;
}

/** Étiquette posée : coin haut gauche, en px depuis le coin haut gauche du dessin. */
export interface PlacedLabel {
  key: PlanetKey;
  left: number;
  top: number;
}

/** Écart entre un astre et son étiquette, entre deux étiquettes, et marge au bord du dessin (px). */
const GAP = 4;
/** Marge autour des autres planètes (px). */
const PLANET_MARGIN = 2;
/** Au-delà de ce cosinus, l'étiquette s'aligne par son début (à droite de l'astre) ou par sa fin (à gauche). */
const SIDE_COS = 0.3;
/** Plus grande poussée d'une étiquette le long de sa direction, en px. */
const MAX_PUSH = 48;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

/** Ce qu'une étiquette évite autour d'une planète, en unités : son disque, l'anneau de Saturne, celui de la Terre. */
function extentUnits(key: PlanetKey): number {
  if (key === "saturn") return SATURN_RING.rx;
  if (key === "earth") return EARTH_HALO_RADIUS;
  return ORRERY_PLANET_RADIUS[key];
}

/** Distance d'un point au rectangle (0 dedans). */
function distanceToRect(x: number, y: number, rect: Rect): number {
  return Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom));
}

/** Vrai si deux étiquettes sont à moins de GAP px l'une de l'autre. */
function tooClose(rect: Rect, other: Rect): boolean {
  return (
    rect.left < other.right + GAP &&
    other.left < rect.right + GAP &&
    rect.top < other.bottom + GAP &&
    other.top < rect.bottom + GAP
  );
}

/**
 * Rectangle de l'étiquette ancrée à `reach` px du centre (cx, cy), dans la direction (dx, dy) de l'écran : alignée
 * par son début si la direction va nettement vers la droite (cos > 0,3), par sa fin vers la gauche, et centrée
 * verticalement sur l'ancre ; sinon centrée, au-dessus si la direction monte, au-dessous si elle descend. Dans une
 * direction oblique, le coin le plus proche reviendrait vers l'astre : l'ancre est alors poussée, pixel par pixel,
 * jusqu'à ce que tout le rectangle soit à `reach` px du centre au moins. Null au-delà de MAX_PUSH.
 */
function labelRect(cx: number, cy: number, dx: number, dy: number, reach: number, size: LabelSize): Rect | null {
  for (let push = 0; push <= MAX_PUSH; push++) {
    const ax = cx + dx * (reach + push);
    const ay = cy + dy * (reach + push);
    let left: number;
    let top: number;
    if (dx > SIDE_COS) {
      left = ax;
      top = ay - size.height / 2;
    } else if (dx < -SIDE_COS) {
      left = ax - size.width;
      top = ay - size.height / 2;
    } else {
      left = ax - size.width / 2;
      top = dy < 0 ? ay - size.height : ay;
    }
    const rect = { left, top, right: left + size.width, bottom: top + size.height };
    if (distanceToRect(cx, cy, rect) >= reach - 1e-9) return rect;
  }
  return null;
}

/**
 * Étiquettes du planétaire, posées dans l'ordre de LABEL_ORDER sur un dessin carré de `size` px (viewBox de
 * 2 × ORRERY_HALF_SIZE unités, y vers le haut). Places essayées pour chacune, dans l'ordre : vers l'extérieur (à 4 px
 * du bord de l'astre, dans la direction Soleil → planète), vers l'intérieur, puis au-dessus, au-dessous, à droite et à
 * gauche, pour garder une étiquette quand une conjonction bouche les deux premières. Une place est refusée si
 * l'étiquette sort du dessin (marge de 4 px), touche une étiquette déjà posée (+ 4 px), une autre planète (+ 2 px,
 * anneaux compris) ou la lueur du Soleil. Sans place, l'étiquette est abandonnée : la légende, toujours là, nomme la
 * planète. Une planète sans taille mesurée (`sizes`) n'a pas d'étiquette.
 */
export function placeOrreryLabels(
  planets: readonly OrreryPlanet[],
  size: number,
  sizes: Readonly<Partial<Record<PlanetKey, LabelSize>>>,
): PlacedLabel[] {
  const unit = size / (2 * ORRERY_HALF_SIZE);
  const half = size / 2;
  const centre = (planet: OrreryPlanet) => ({
    x: half + planet.x * ORRERY_ORBIT_UNITS * unit,
    y: half - planet.y * ORRERY_ORBIT_UNITS * unit,
  });
  const byKey = new Map(planets.map((planet) => [planet.key, planet]));
  const sunGlow: Circle = { x: half, y: half, r: ORRERY_SUN.glow * unit };
  const placed: { label: PlacedLabel; rect: Rect }[] = [];

  for (const key of LABEL_ORDER) {
    const planet = byKey.get(key);
    const labelSize = sizes[key];
    if (!planet || !labelSize) continue;
    const { x: cx, y: cy } = centre(planet);
    // Direction Soleil → planète à l'écran (y vers le bas).
    const length = Math.hypot(planet.x, planet.y) || 1;
    const dx = planet.x / length;
    const dy = -planet.y / length;
    const reach = extentUnits(key) * unit + GAP;
    const others: Circle[] = planets
      .filter((other) => other.key !== key)
      .map((other) => ({ ...centre(other), r: extentUnits(other.key) * unit + PLANET_MARGIN }));
    const fits = (rect: Rect | null): rect is Rect =>
      rect !== null &&
      rect.left >= GAP &&
      rect.top >= GAP &&
      rect.right <= size - GAP &&
      rect.bottom <= size - GAP &&
      ![sunGlow, ...others].some((circle) => distanceToRect(circle.x, circle.y, rect) < circle.r) &&
      !placed.some((other) => tooClose(rect, other.rect));
    const directions: readonly [number, number][] = [
      [dx, dy],
      [-dx, -dy],
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0],
    ];
    for (const [ux, uy] of directions) {
      const rect = labelRect(cx, cy, ux, uy, reach, labelSize);
      if (fits(rect)) {
        placed.push({ label: { key, left: rect.left, top: rect.top }, rect });
        break;
      }
    }
  }
  return placed.map(({ label }) => label);
}
