import { PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import {
  EARTH_HALO_RADIUS,
  ORRERY_HALF_SIZE,
  ORRERY_ORBIT_UNITS,
  ORRERY_PLANET_RADIUS,
  ORRERY_SUN,
  orreryOrbit,
  SATURN_RING,
  type OrreryPlanet,
} from "./orrery";

/**
 * Ordres de pose essayés ; la mise en page retenue est la moins coûteuse (`placeOrreryLabels`). « Vous êtes ici » (la
 * Terre) se pose toujours d'abord ; ensuite les géantes de l'extérieur vers l'intérieur, ou le groupe intérieur d'abord,
 * ou des ordres mêlés : selon le jour, l'un ou l'autre laisse à chaque étiquette une place plus proche de son astre.
 */
export const LABEL_ORDERS: readonly (readonly PlanetKey[])[] = [
  ["earth", "neptune", "uranus", "saturn", "jupiter", "mars", "venus", "mercury"],
  ["earth", "venus", "mercury", "mars", "jupiter", "saturn", "uranus", "neptune"],
  ["earth", "mercury", "venus", "mars", "neptune", "uranus", "saturn", "jupiter"],
  ["earth", "saturn", "jupiter", "neptune", "uranus", "mars", "venus", "mercury"],
];

/** Taille d'une étiquette mesurée à l'écran, en px. */
export interface LabelSize {
  width: number;
  height: number;
}

/** Filet de rappel d'une étiquette reportée, en px depuis le coin haut gauche du dessin : de l'astre à l'étiquette. */
export interface Leader {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Étiquette posée : coin haut gauche, en px depuis le coin haut gauche du dessin ; un filet si elle est reportée. */
export interface PlacedLabel {
  key: PlanetKey;
  left: number;
  top: number;
  leader?: Leader;
}

/** Marge au bord du dessin (px). */
const EDGE = 4;
/** Écart entre un astre et son étiquette (px). */
const GAP = 4;
/** Écart entre deux étiquettes (px) : à 4 px, deux noms voisins se lisaient comme un seul. */
const LABEL_GAP = 6;
/** Marge autour des autres planètes, anneaux compris (px). */
const PLANET_MARGIN = 2;
/** Écart entre un filet et une étiquette (px) ; un filet peut traverser un anneau, jamais un disque (+ 1 px). */
const LEADER_MARGIN = 2;
const LEADER_DISC_MARGIN = 1;
/** Au-delà de cet écart entre l'astre et son étiquette (px), un filet les relie. */
const LEADER_MIN = 8;
/** Le filet part à 1,5 px du bord de l'astre et s'arrête à 2 px de l'étiquette (px). */
const LEADER_START = 1.5;
const LEADER_END = 2;
/** Au-delà de ce cosinus, l'étiquette s'aligne par son début (à droite de l'astre) ou par sa fin (à gauche). */
const SIDE_COS = 0.3;
/** Plus grande poussée d'une étiquette pour que son coin ne revienne pas sur l'astre (px). */
const MAX_PUSH = 48;
/** Plus grand éloignement pour sortir l'étiquette du groupe intérieur (px). */
const MAX_INNER_PUSH = 160;
/** Directions essayées : tous les 15° autour de la direction Soleil → planète. */
const TURN_STEP = 15;
/** Éloignements essayés au-delà de la première place possible : tous les 6 px, jusqu'à 84 px. */
const EXTRA_STEP = 6;
const EXTRA_MAX = 84;
/**
 * Coût d'une place, en px : l'écart entre l'astre et son étiquette, plus 0,15 px par degré d'écart à la direction
 * radiale, 20 px pour un filet et 16 px de plus si ce filet traverse un anneau (celui de la Terre, de Saturne).
 */
const TURN_COST = 0.15;
const LEADER_COST = 20;
const RING_COST = 16;
/** Coût d'une étiquette sans place : toute mise en page complète l'emporte. */
const MISSING_COST = 1000;

/**
 * Rayon du groupe intérieur, en unités du dessin : l'orbite de Mars et son disque. Mercure, Vénus et la Terre s'y
 * serrent à quelques px les unes des autres : aucune étiquette ne s'y pose, les leurs sont reportées au-delà.
 */
const INNER_GROUP_UNITS = orreryOrbit(PLANET_BY_KEY.mars.elements[0]) * ORRERY_ORBIT_UNITS + ORRERY_PLANET_RADIUS.mars;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Une place possible pour une étiquette, avec son filet s'il en faut un, et son coût. */
interface Candidate {
  rect: Rect;
  leader?: Leader;
  cost: number;
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

/** Distance d'un point au segment. */
function distanceToSegment(x: number, y: number, segment: Leader): number {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const t = Math.max(0, Math.min(1, ((x - segment.x1) * dx + (y - segment.y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (segment.x1 + t * dx), y - (segment.y1 + t * dy));
}

/** Vrai si deux segments se coupent (hors extrémités communes). */
function segmentsCross(a: Leader, b: Leader): boolean {
  const side = (s: Leader, x: number, y: number) => (s.x2 - s.x1) * (y - s.y1) - (s.y2 - s.y1) * (x - s.x1);
  return side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0 && side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0;
}

/** Distance d'un segment au rectangle (0 s'il y entre ou le traverse). */
function segmentToRect(segment: Leader, rect: Rect): number {
  const corners: readonly [number, number][] = [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.right, rect.bottom],
    [rect.left, rect.bottom],
  ];
  const edges = corners.map(([x1, y1], i) => {
    const [x2, y2] = corners[(i + 1) % 4];
    return { x1, y1, x2, y2 };
  });
  const startInside = distanceToRect(segment.x1, segment.y1, rect) === 0;
  if (startInside || edges.some((edge) => segmentsCross(segment, edge))) return 0;
  return Math.min(
    distanceToRect(segment.x1, segment.y1, rect),
    distanceToRect(segment.x2, segment.y2, rect),
    ...corners.map(([x, y]) => distanceToSegment(x, y, segment)),
  );
}

/**
 * Rectangle de l'étiquette ancrée à `reach` px du centre (cx, cy), dans la direction (dx, dy) de l'écran : alignée
 * par son début si la direction va nettement vers la droite (cos > 0,3), par sa fin vers la gauche, et centrée
 * verticalement sur l'ancre ; sinon centrée, au-dessus si la direction monte, au-dessous si elle descend. Dans une
 * direction oblique, le coin le plus proche reviendrait vers l'astre : l'ancre est alors poussée jusqu'à ce que tout le
 * rectangle soit à `reach` px du centre au moins. Rend aussi la portée finale de l'ancre ; null au-delà de MAX_PUSH.
 */
function labelRect(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  reach: number,
  size: LabelSize,
): { rect: Rect; reach: number } | null {
  let push = 0;
  while (push <= MAX_PUSH) {
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
    const distance = distanceToRect(cx, cy, rect);
    if (distance >= reach - 1e-9) return { rect, reach: reach + push };
    push += Math.max(0.5, reach - distance);
  }
  return null;
}

/** Vrai si deux étiquettes sont à LABEL_GAP px l'une de l'autre au moins. */
function apart(a: Rect, b: Rect): boolean {
  return (
    a.left >= b.right + LABEL_GAP ||
    b.left >= a.right + LABEL_GAP ||
    a.top >= b.bottom + LABEL_GAP ||
    b.top >= a.bottom + LABEL_GAP
  );
}

/** Vrai si une place reste libre à côté des étiquettes déjà posées et de leurs filets. */
function fitsAmong(candidate: Candidate, placed: readonly Candidate[]): boolean {
  return placed.every((other) => {
    if (!apart(candidate.rect, other.rect)) return false;
    if (other.leader && segmentToRect(other.leader, candidate.rect) < LEADER_MARGIN) return false;
    if (!candidate.leader) return true;
    return (
      segmentToRect(candidate.leader, other.rect) >= LEADER_MARGIN &&
      !(other.leader && segmentsCross(candidate.leader, other.leader))
    );
  });
}

/**
 * Étiquettes du planétaire, sur un dessin carré de `size` px (viewBox de 2 × ORRERY_HALF_SIZE unités, y vers le haut),
 * pour qu'on lise le nom de chaque planète sans hésiter sur l'astre qu'il nomme.
 *
 * Aucune étiquette ne se pose dans le groupe intérieur (l'orbite de Mars et 4 px) : Mercure, Vénus et la Terre y sont à
 * quelques px les unes des autres. Pour chaque planète, les places essayées partent dans 24 directions autour de la
 * direction Soleil → planète, à la première distance où l'étiquette touche presque l'astre (4 px) et sort du groupe
 * intérieur, puis de plus en plus loin. Une place est refusée si l'étiquette sort du dessin (4 px), entre dans le groupe
 * intérieur ou couvre un astre (anneaux compris, + 2 px). À plus de 8 px de son astre, l'étiquette est reportée : un
 * filet part du bord de l'astre vers elle, qui ne passe ni sur la lueur du Soleil ni sur le disque d'une autre planète.
 * Chaque place coûte son éloignement, son écart à la direction radiale, et plus encore si elle a un filet, ou si ce
 * filet traverse un anneau.
 *
 * Les étiquettes se posent ensuite dans chacun des ordres de LABEL_ORDERS, chacune à sa place la moins coûteuse qui
 * reste à 6 px des étiquettes posées, sans croiser leurs filets ; la mise en page la moins coûteuse est retenue.
 * Une étiquette sans place est abandonnée (le planétaire montre alors sa légende). Une planète sans taille mesurée
 * (`sizes`) n'a pas d'étiquette.
 */
export function placeOrreryLabels(
  planets: readonly OrreryPlanet[],
  size: number,
  sizes: Readonly<Partial<Record<PlanetKey, LabelSize>>>,
): PlacedLabel[] {
  const unit = size / (2 * ORRERY_HALF_SIZE);
  const half = size / 2;
  const glow = ORRERY_SUN.glow * unit;
  const innerGroup = INNER_GROUP_UNITS * unit + GAP;
  const discs = planets.map((planet) => ({
    key: planet.key,
    x: half + planet.x * ORRERY_ORBIT_UNITS * unit,
    y: half - planet.y * ORRERY_ORBIT_UNITS * unit,
    /** Ce que couvre la planète, anneaux compris. */
    extent: extentUnits(planet.key) * unit,
    /** Son seul disque. */
    disc: ORRERY_PLANET_RADIUS[planet.key] * unit,
  }));
  const outsideGroup = (rect: Rect) => distanceToRect(half, half, rect) >= innerGroup - 1e-9;

  const candidates = new Map<PlanetKey, Candidate[]>();
  for (const planet of discs) {
    const labelSize = sizes[planet.key];
    if (!labelSize) continue;
    const others = discs.filter((other) => other.key !== planet.key);
    const reach = planet.extent + GAP;
    // Direction Soleil → planète à l'écran (y vers le bas).
    const radial = Math.atan2(planet.y - half, planet.x - half);
    const list: Candidate[] = [];
    const seen = new Set<string>();
    for (let turn = TURN_STEP - 180; turn <= 180; turn += TURN_STEP) {
      const angle = radial + (turn * Math.PI) / 180;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      // Première portée qui sort l'étiquette du groupe intérieur, dans cette direction.
      let start = reach;
      let first = labelRect(planet.x, planet.y, dx, dy, start, labelSize);
      while (first && !outsideGroup(first.rect) && start < reach + MAX_INNER_PUSH) {
        start += Math.max(1, innerGroup - distanceToRect(half, half, first.rect));
        first = labelRect(planet.x, planet.y, dx, dy, start, labelSize);
      }
      if (!first || !outsideGroup(first.rect)) continue;
      for (let extra = 0; extra <= EXTRA_MAX; extra += EXTRA_STEP) {
        const found = extra === 0 ? first : labelRect(planet.x, planet.y, dx, dy, start + extra, labelSize);
        if (!found) continue;
        const { rect } = found;
        const id = `${Math.round(rect.left * 4)}:${Math.round(rect.top * 4)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        if (
          rect.left < EDGE ||
          rect.top < EDGE ||
          rect.right > size - EDGE ||
          rect.bottom > size - EDGE ||
          !outsideGroup(rect) ||
          others.some((other) => distanceToRect(other.x, other.y, rect) < other.extent + PLANET_MARGIN)
        ) {
          continue;
        }
        const gap = distanceToRect(planet.x, planet.y, rect) - planet.extent;
        const turnCost = TURN_COST * Math.abs(turn);
        if (gap <= LEADER_MIN) {
          list.push({ rect, cost: gap + turnCost });
          continue;
        }
        // Le filet arrive sur l'ancre, au milieu du bord d'attache (gauche, droit, bas ou haut), et s'arrête à
        // LEADER_END px de ce bord : en oblique, il recule d'autant plus le long de sa direction.
        const back = LEADER_END / (Math.abs(dx) > SIDE_COS ? Math.abs(dx) : Math.abs(dy));
        const leader = {
          x1: planet.x + dx * (planet.extent + LEADER_START),
          y1: planet.y + dy * (planet.extent + LEADER_START),
          x2: planet.x + dx * (found.reach - back),
          y2: planet.y + dy * (found.reach - back),
        };
        if (distanceToSegment(half, half, leader) < glow) continue;
        if (others.some((other) => distanceToSegment(other.x, other.y, leader) < other.disc + LEADER_DISC_MARGIN)) {
          continue;
        }
        const crossesRing = others.some(
          (other) => distanceToSegment(other.x, other.y, leader) < other.extent + LEADER_MARGIN,
        );
        list.push({ rect, leader, cost: gap + turnCost + LEADER_COST + (crossesRing ? RING_COST : 0) });
      }
    }
    candidates.set(
      planet.key,
      list.sort((a, b) => a.cost - b.cost),
    );
  }

  let best: { cost: number; labels: PlacedLabel[] } | null = null;
  for (const order of LABEL_ORDERS) {
    const placed: Candidate[] = [];
    const labels: PlacedLabel[] = [];
    let cost = 0;
    for (const key of order) {
      const list = candidates.get(key);
      if (!list) continue;
      const choice = list.find((candidate) => fitsAmong(candidate, placed));
      if (!choice) {
        cost += MISSING_COST;
        continue;
      }
      cost += choice.cost;
      placed.push(choice);
      labels.push({
        key,
        left: choice.rect.left,
        top: choice.rect.top,
        ...(choice.leader ? { leader: choice.leader } : {}),
      });
    }
    if (!best || cost < best.cost) best = { cost, labels };
  }
  return best?.labels ?? [];
}
