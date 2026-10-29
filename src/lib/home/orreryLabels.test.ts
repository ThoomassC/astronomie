import { describe, expect, it } from "vitest";
import { julianDate } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
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
import { LABEL_ORDER, placeOrreryLabels, type LabelSize, type PlacedLabel } from "@/lib/home/orreryLabels";

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

/** Distance d'un point au rectangle d'une étiquette (0 dedans). */
function distanceToLabel(label: PlacedLabel, sizeOf: LabelSize, point: { x: number; y: number }) {
  const dx = Math.max(label.left - point.x, 0, point.x - (label.left + sizeOf.width));
  const dy = Math.max(label.top - point.y, 0, point.y - (label.top + sizeOf.height));
  return Math.hypot(dx, dy);
}

describe("LABEL_ORDER", () => {
  it("devrait poser « Vous êtes ici » d'abord, puis les géantes de l'extérieur vers Mercure", () => {
    expect(LABEL_ORDER).toEqual(["earth", "neptune", "uranus", "saturn", "jupiter", "mars", "venus", "mercury"]);
  });
});

describe("placeOrreryLabels, une planète seule", () => {
  const size = 440; // 2 px par unité
  const k = size / (2 * ORRERY_HALF_SIZE);
  const label = { width: 80, height: LINE };

  it("devrait poser l'étiquette à droite, alignée par son début, quand la planète est à droite du Soleil", () => {
    const earth = at("earth", 0);
    const [placed] = placeOrreryLabels([earth], size, { earth: label });
    const { x, y } = centre(earth, size);
    expect(placed.key).toBe("earth");
    expect(placed.left).toBeCloseTo(x + EARTH_HALO_RADIUS * k + 4, 9);
    expect(placed.top).toBeCloseTo(y - LINE / 2, 9);
  });

  it("devrait aligner l'étiquette par sa fin quand la planète est à gauche du Soleil", () => {
    const mars = at("mars", 180);
    const [placed] = placeOrreryLabels([mars], size, { mars: label });
    const { x } = centre(mars, size);
    expect(placed.left + label.width).toBeCloseTo(x - ORRERY_PLANET_RADIUS.mars * k - 4, 9);
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
    expect(distanceToLabel(placed, label, centre(uranus, size))).toBeGreaterThanOrEqual(reach - 1e-9);
    // Alignée par son début, à droite de l'astre (cos 63° > 0,3).
    expect(placed.left).toBeGreaterThan(centre(uranus, size).x);
  });

  it("devrait se replier vers l'intérieur quand l'extérieur sort du dessin", () => {
    const neptune = at("neptune", 0);
    const [placed] = placeOrreryLabels([neptune], size, { neptune: label });
    const { x } = centre(neptune, size);
    expect(placed.left + label.width).toBeCloseTo(x - ORRERY_PLANET_RADIUS.neptune * k - 4, 9);
  });

  it("devrait ignorer une planète dont l'étiquette n'a pas été mesurée", () => {
    expect(placeOrreryLabels([at("earth", 0)], size, {})).toEqual([]);
  });
});

describe("placeOrreryLabels, des planètes alignées", () => {
  it("devrait abandonner les étiquettes qui ne trouvent pas de place, et garder « Vous êtes ici »", () => {
    const planets = [at("mercury", 0), at("venus", 0), at("earth", 0)];
    const placed = placeOrreryLabels(planets, 343, FRENCH_SIZES);
    expect(placed.map((label) => label.key)).toEqual(["earth"]);
  });
});

describe("placeOrreryLabels, positions réelles", () => {
  const days = Array.from({ length: 24 }, (_, i) => Date.UTC(2026, i, 1));
  const sizes = [343, 448, 544];

  it.each(sizes)("ne devrait chevaucher ni étiquette, ni astre, ni lueur du Soleil, ni bord (%i px)", (size) => {
    const k = size / (2 * ORRERY_HALF_SIZE);
    for (const day of days) {
      const planets = orreryPlanets(julianDate(day));
      const placed = placeOrreryLabels(planets, size, FRENCH_SIZES);
      placed.forEach((label, i) => {
        const own = FRENCH_SIZES[label.key];
        expect(label.left).toBeGreaterThanOrEqual(4);
        expect(label.top).toBeGreaterThanOrEqual(4);
        expect(label.left + own.width).toBeLessThanOrEqual(size - 4);
        expect(label.top + own.height).toBeLessThanOrEqual(size - 4);
        expect(distanceToLabel(label, own, { x: size / 2, y: size / 2 })).toBeGreaterThanOrEqual(ORRERY_SUN.glow * k);
        planets
          .filter((planet) => planet.key !== label.key)
          .forEach((planet) => {
            const clearance = ORRERY_PLANET_RADIUS[planet.key] * k + 2;
            expect(distanceToLabel(label, own, centre(planet, size))).toBeGreaterThanOrEqual(clearance);
          });
        placed.slice(i + 1).forEach((other) => {
          const size2 = FRENCH_SIZES[other.key];
          const apart =
            label.left + own.width + 4 <= other.left ||
            other.left + size2.width + 4 <= label.left ||
            label.top + own.height + 4 <= other.top ||
            other.top + size2.height + 4 <= label.top;
          expect(apart).toBe(true);
        });
      });
    }
  });

  it("devrait garder « Vous êtes ici » au-dessus de la Terre quand Vénus et Saturne bouchent les côtés", () => {
    // 29 octobre 2026 : Vénus passe entre la Terre et le Soleil (conjonction inférieure), Saturne barre la droite.
    const planets = orreryPlanets(julianDate(Date.UTC(2026, 9, 29, 12)));
    const earth = placeOrreryLabels(planets, 544, FRENCH_SIZES).find((label) => label.key === "earth");
    const earthCentre = centre(planets.find((planet) => planet.key === "earth") ?? planets[0], 544);
    expect(earth).toBeDefined();
    expect((earth?.top ?? 0) + LINE).toBeLessThanOrEqual(earthCentre.y);
  });

  it("devrait poser toutes les étiquettes de géantes et « Vous êtes ici » à 544 px le 29 octobre 2026", () => {
    const planets = orreryPlanets(julianDate(Date.UTC(2026, 9, 29, 12)));
    const keys = placeOrreryLabels(planets, 544, FRENCH_SIZES).map((label) => label.key);
    expect(keys).toEqual(expect.arrayContaining(["earth", "jupiter", "saturn", "uranus", "neptune"]));
  });
});
