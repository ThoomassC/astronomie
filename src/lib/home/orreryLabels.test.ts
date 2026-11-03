import { describe, expect, it } from "vitest";
import { julianDate } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY, PLANETS, type PlanetKey } from "@/lib/astro/planets";
import {
  EARTH_HALO_RADIUS,
  ORRERY_HALF_SIZE,
  ORRERY_ORBIT_UNITS,
  ORRERY_PLANET_RADIUS,
  ORRERY_SUN,
  orreryOrbit,
  orreryPlanets,
  SATURN_RING,
  type OrreryPlanet,
} from "@/lib/home/orrery";
import {
  LABEL_ORDERS,
  placeOrreryLabels,
  type LabelSize,
  type Leader,
  type PlacedLabel,
} from "@/lib/home/orreryLabels";

/** Hauteur d'une ligne d'étiquette (13 px, interligne 1,2). */
const LINE = 16;

/** Largeurs mesurées avec la police du site à 13 px, en gras (design v2) : « Vous êtes ici » pour la Terre. */
const FRENCH_SIZES: Readonly<Record<PlanetKey, LabelSize>> = {
  earth: { width: 75, height: LINE },
  mercury: { width: 49, height: LINE },
  venus: { width: 36, height: LINE },
  mars: { width: 29, height: LINE },
  jupiter: { width: 42, height: LINE },
  saturn: { width: 46, height: LINE },
  uranus: { width: 42, height: LINE },
  neptune: { width: 51, height: LINE },
};

/** Largeurs espagnoles, estimées dans la même police : « Estás aquí », « Mercurio »… les noms les plus longs. */
const SPANISH_SIZES: Readonly<Record<PlanetKey, LabelSize>> = {
  earth: { width: 66, height: LINE },
  mercury: { width: 56, height: LINE },
  venus: { width: 36, height: LINE },
  mars: { width: 36, height: LINE },
  jupiter: { width: 45, height: LINE },
  saturn: { width: 50, height: LINE },
  uranus: { width: 38, height: LINE },
  neptune: { width: 53, height: LINE },
};

/** Côtés du dessin : 320 px de large moins les marges, téléphone, tablette, grand écran. */
const DRAWING_SIZES = [288, 343, 448, 544] as const;

/**
 * Jours où les planètes intérieures se serrent autour du Soleil : conjonctions inférieures de Vénus (24 octobre 2026,
 * 6 janvier 2030), Mercure, Vénus et la Terre alignées à moins d'un degré (2 juin 2028, 12 août 2031), les quatre
 * planètes intérieures dans 36° (26 juillet 2031), et le groupe de début novembre 2026, à 7° les unes des autres.
 */
const CROWDED_DAYS = [
  "2026-10-24",
  "2026-11-03",
  "2026-11-04",
  "2026-11-14",
  "2028-06-02",
  "2030-01-06",
  "2031-07-26",
  "2031-08-12",
] as const;

/** Rayon du groupe intérieur, en unités du dessin : l'orbite de Mars et son disque. */
const INNER_GROUP = orreryOrbit(PLANET_BY_KEY.mars.elements[0]) * ORRERY_ORBIT_UNITS + ORRERY_PLANET_RADIUS.mars;

/** Planète posée sur son orbite à la longitude `deg`. */
function at(key: PlanetKey, deg: number): OrreryPlanet {
  const orbit = orreryOrbit(PLANET_BY_KEY[key].elements[0]);
  const angle = (deg * Math.PI) / 180;
  return { key, x: orbit * Math.cos(angle), y: orbit * Math.sin(angle), orbit, longitudeDeg: deg };
}

/** Centre de la planète à l'écran, en px, pour un dessin de `size` px (y vers le bas). */
function centre(planet: OrreryPlanet, size: number) {
  const k = size / (2 * ORRERY_HALF_SIZE);
  return { x: size / 2 + planet.x * ORRERY_ORBIT_UNITS * k, y: size / 2 - planet.y * ORRERY_ORBIT_UNITS * k };
}

/** Ce qu'occupe une planète autour de son centre, en unités : disque, anneau de Saturne, anneau de la Terre. */
function extent(key: PlanetKey): number {
  if (key === "saturn") return SATURN_RING.rx;
  if (key === "earth") return EARTH_HALO_RADIUS;
  return ORRERY_PLANET_RADIUS[key];
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boxOf(label: PlacedLabel, sizeOf: LabelSize): Box {
  return { left: label.left, top: label.top, right: label.left + sizeOf.width, bottom: label.top + sizeOf.height };
}

/** Distance d'un point au rectangle d'une étiquette (0 dedans). */
function distanceToBox(box: Box, point: { x: number; y: number }) {
  return Math.hypot(
    Math.max(box.left - point.x, 0, point.x - box.right),
    Math.max(box.top - point.y, 0, point.y - box.bottom),
  );
}

/** Distance d'un point à un filet. */
function distanceToLeader(leader: Leader, point: { x: number; y: number }) {
  const dx = leader.x2 - leader.x1;
  const dy = leader.y2 - leader.y1;
  const t = Math.max(0, Math.min(1, ((point.x - leader.x1) * dx + (point.y - leader.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (leader.x1 + t * dx), point.y - (leader.y1 + t * dy));
}

/** Vrai si deux segments se coupent. */
function cross(a: Leader, b: Leader): boolean {
  const side = (p: Leader, x: number, y: number) => (p.x2 - p.x1) * (y - p.y1) - (p.y2 - p.y1) * (x - p.x1);
  return side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0 && side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0;
}

/** Distance d'un filet au rectangle d'une étiquette, échantillonnée tous les 0,25 px (0 s'il le traverse). */
function leaderToBox(leader: Leader, box: Box): number {
  const length = Math.hypot(leader.x2 - leader.x1, leader.y2 - leader.y1);
  const steps = Math.max(1, Math.ceil(length * 4));
  let min = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    min = Math.min(min, distanceToBox(box, { x: leader.x1 + t * (leader.x2 - leader.x1), y: leader.y1 + t * (leader.y2 - leader.y1) }));
  }
  return min;
}

/**
 * Règles d'une mise en page d'étiquettes : chacune dans le dessin (4 px du bord), hors du groupe intérieur (orbite de
 * Mars et 4 px), à 6 px au moins des autres étiquettes, sans couvrir un astre (anneaux compris, + 2 px) ; un filet part
 * du bord de son astre et s'arrête au bord de son étiquette, sans passer sur la lueur du Soleil, sur le disque d'une
 * autre planète, à moins de 2 px d'une autre étiquette, ni croiser un autre filet. Seule une étiquette éloignée de plus
 * de 8 px de son astre a un filet.
 */
function expectClean(
  planets: readonly OrreryPlanet[],
  size: number,
  sizes: Readonly<Record<PlanetKey, LabelSize>>,
  placed: readonly PlacedLabel[],
) {
  const k = size / (2 * ORRERY_HALF_SIZE);
  const sun = { x: size / 2, y: size / 2 };
  const byKey = new Map(planets.map((planet) => [planet.key, planet]));
  placed.forEach((label, i) => {
    const box = boxOf(label, sizes[label.key]);
    const own = byKey.get(label.key);
    expect(own).toBeDefined();
    if (!own) return;
    const ownCentre = centre(own, size);
    expect(box.left).toBeGreaterThanOrEqual(4);
    expect(box.top).toBeGreaterThanOrEqual(4);
    expect(box.right).toBeLessThanOrEqual(size - 4);
    expect(box.bottom).toBeLessThanOrEqual(size - 4);
    expect(distanceToBox(box, sun)).toBeGreaterThanOrEqual(INNER_GROUP * k + 4 - 1e-6);
    expect(distanceToBox(box, ownCentre)).toBeGreaterThanOrEqual(extent(label.key) * k + 4 - 1e-6);
    planets
      .filter((planet) => planet.key !== label.key)
      .forEach((planet) => {
        expect(distanceToBox(box, centre(planet, size))).toBeGreaterThanOrEqual(extent(planet.key) * k + 2 - 1e-6);
      });
    placed.forEach((other, j) => {
      if (j === i) return;
      const otherBox = boxOf(other, sizes[other.key]);
      const apart =
        box.right + 6 <= otherBox.left + 1e-6 ||
        otherBox.right + 6 <= box.left + 1e-6 ||
        box.bottom + 6 <= otherBox.top + 1e-6 ||
        otherBox.bottom + 6 <= box.top + 1e-6;
      expect(apart).toBe(true);
      if (other.leader) expect(leaderToBox(other.leader, box)).toBeGreaterThanOrEqual(2 - 0.3);
    });

    const gap = distanceToBox(box, ownCentre) - extent(label.key) * k;
    const { leader } = label;
    if (!leader) {
      expect(gap).toBeLessThanOrEqual(8 + 1e-6);
      return;
    }
    expect(gap).toBeGreaterThan(8);
    expect(Math.hypot(leader.x1 - ownCentre.x, leader.y1 - ownCentre.y)).toBeCloseTo(extent(label.key) * k + 1.5, 6);
    expect(distanceToBox(box, { x: leader.x2, y: leader.y2 })).toBeLessThanOrEqual(2.5);
    expect(leaderToBox(leader, box)).toBeGreaterThanOrEqual(1.5);
    expect(distanceToLeader(leader, sun)).toBeGreaterThanOrEqual(ORRERY_SUN.glow * k - 1e-6);
    planets
      .filter((planet) => planet.key !== label.key)
      .forEach((planet) => {
        expect(distanceToLeader(leader, centre(planet, size))).toBeGreaterThanOrEqual(
          ORRERY_PLANET_RADIUS[planet.key] * k + 1 - 1e-6,
        );
      });
    placed.forEach((other, j) => {
      if (j !== i && other.leader) expect(cross(leader, other.leader)).toBe(false);
    });
  });
}

describe("LABEL_ORDERS", () => {
  it("devrait poser « Vous êtes ici » d'abord, et chaque planète une fois, dans chacun des ordres essayés", () => {
    expect(LABEL_ORDERS.length).toBeGreaterThan(1);
    for (const order of LABEL_ORDERS) {
      expect(order[0]).toBe("earth");
      expect([...order].sort()).toEqual(PLANETS.map((planet) => planet.key).sort());
    }
  });
});

describe("placeOrreryLabels, une planète seule", () => {
  const size = 440; // 2 px par unité
  const k = size / (2 * ORRERY_HALF_SIZE);
  const label = { width: 80, height: LINE };

  it("devrait poser « Vous êtes ici » à droite de la Terre, juste hors du groupe intérieur, sans filet", () => {
    const earth = at("earth", 0);
    const [placed] = placeOrreryLabels([earth], size, { earth: label });
    const { y } = centre(earth, size);
    expect(placed.key).toBe("earth");
    expect(placed.left).toBeCloseTo(size / 2 + INNER_GROUP * k + 4, 6);
    expect(placed.top).toBeCloseTo(y - LINE / 2, 9);
    expect(placed.leader).toBeUndefined();
  });

  it("devrait aligner l'étiquette par sa fin quand la planète est à gauche du Soleil", () => {
    const mars = at("mars", 180);
    const [placed] = placeOrreryLabels([mars], size, { mars: label });
    const { x } = centre(mars, size);
    expect(placed.left + label.width).toBeCloseTo(x - ORRERY_PLANET_RADIUS.mars * k - 4, 6);
    expect(placed.leader).toBeUndefined();
  });

  it("devrait centrer l'étiquette au-dessus d'une planète en haut, au-dessous d'une planète en bas", () => {
    const top = at("jupiter", 90);
    const [above] = placeOrreryLabels([top], size, { jupiter: label });
    const up = centre(top, size);
    expect(above.left).toBeCloseTo(up.x - label.width / 2, 9);
    expect(above.top + LINE).toBeCloseTo(up.y - ORRERY_PLANET_RADIUS.jupiter * k - 4, 9);

    const bottom = at("jupiter", 270);
    const [below] = placeOrreryLabels([bottom], size, { jupiter: label });
    const down = centre(bottom, size);
    expect(below.top).toBeCloseTo(down.y + ORRERY_PLANET_RADIUS.jupiter * k + 4, 9);
  });

  it("devrait écarter l'étiquette de Saturne de son anneau, pas seulement de son disque", () => {
    const saturn = at("saturn", 0);
    const [placed] = placeOrreryLabels([saturn], size, { saturn: { width: 40, height: LINE } });
    expect(placed.left).toBeCloseTo(centre(saturn, size).x + SATURN_RING.rx * k + 4, 9);
  });

  it("devrait éloigner l'étiquette dans une direction oblique, sans que son coin revienne sur l'astre", () => {
    const uranus = at("uranus", 63);
    const [placed] = placeOrreryLabels([uranus], size, { uranus: label });
    const reach = ORRERY_PLANET_RADIUS.uranus * k + 4;
    expect(distanceToBox(boxOf(placed, label), centre(uranus, size))).toBeGreaterThanOrEqual(reach - 1e-9);
    // Alignée par son début, à droite de l'astre (cos 63° > 0,3).
    expect(placed.left).toBeGreaterThan(centre(uranus, size).x);
  });

  it("devrait se replier vers l'intérieur, collée à l'astre, quand l'extérieur sort du dessin", () => {
    const neptune = at("neptune", 0);
    const [placed] = placeOrreryLabels([neptune], size, { neptune: label });
    const { x } = centre(neptune, size);
    expect(placed.left + label.width).toBeLessThanOrEqual(x);
    expect(placed.leader).toBeUndefined();
    expectClean([neptune], size, { ...FRENCH_SIZES, neptune: label }, [placed]);
  });

  it("devrait ignorer une planète dont l'étiquette n'a pas été mesurée", () => {
    expect(placeOrreryLabels([at("earth", 0)], size, {})).toEqual([]);
  });
});

describe("placeOrreryLabels, des planètes alignées", () => {
  it("devrait reporter hors du groupe intérieur, au bout d'un filet, les étiquettes de Mercure et de Vénus", () => {
    const planets = [at("mercury", 0), at("venus", 0), at("earth", 0)];
    const placed = placeOrreryLabels(planets, 343, FRENCH_SIZES);
    expect(placed.map((label) => label.key).sort()).toEqual(["earth", "mercury", "venus"]);
    expect(placed.find((label) => label.key === "mercury")?.leader).toBeDefined();
    expect(placed.find((label) => label.key === "venus")?.leader).toBeDefined();
    expectClean(planets, 343, FRENCH_SIZES, placed);
  });
});

describe("placeOrreryLabels, positions réelles", () => {
  /** Un jour sur neuf, de 2026 à 2028 : toutes les configurations des planètes intérieures. */
  const days = Array.from({ length: 122 }, (_, i) => Date.UTC(2026, 0, 1 + 9 * i, 12));

  it.each(DRAWING_SIZES)("devrait nommer les huit planètes sans rien chevaucher, en français et en espagnol (%i px)", (size) => {
    for (const day of days) {
      const planets = orreryPlanets(julianDate(day));
      for (const sizes of [FRENCH_SIZES, SPANISH_SIZES]) {
        const placed = placeOrreryLabels(planets, size, sizes);
        expect(placed).toHaveLength(8);
        expectClean(planets, size, sizes, placed);
      }
    }
  });

  it.each(CROWDED_DAYS.flatMap((day) => DRAWING_SIZES.map((size) => [day, size] as const)))(
    "devrait séparer Mercure, Vénus et « Vous êtes ici » quand les planètes intérieures sont serrées (%s, %i px)",
    (day, size) => {
      const planets = orreryPlanets(julianDate(Date.parse(`${day}T12:00:00Z`)));
      const placed = placeOrreryLabels(planets, size, FRENCH_SIZES);
      expect(placed.map((label) => label.key).sort()).toEqual(PLANETS.map((planet) => planet.key).sort());
      expectClean(planets, size, FRENCH_SIZES, placed);
    },
  );

  it.each(DRAWING_SIZES)("devrait garder « Vous êtes ici » à 40 px au plus de l'anneau de la Terre (%i px)", (size) => {
    const k = size / (2 * ORRERY_HALF_SIZE);
    for (const day of days) {
      const planets = orreryPlanets(julianDate(day));
      const earth = planets.find((planet) => planet.key === "earth");
      const label = placeOrreryLabels(planets, size, FRENCH_SIZES).find((placed) => placed.key === "earth");
      if (!earth || !label) throw new Error("Terre ou « Vous êtes ici » absente");
      const gap = distanceToBox(boxOf(label, FRENCH_SIZES.earth), centre(earth, size)) - EARTH_HALO_RADIUS * k;
      expect(gap).toBeLessThanOrEqual(40);
    }
  });
});
