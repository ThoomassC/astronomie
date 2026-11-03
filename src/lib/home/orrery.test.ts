import { describe, expect, it } from "vitest";
import { eclipticLongitudeDeg, heliocentric, julianDate } from "@/lib/astro/ephemeris";
import { PLANETS, PLANET_BY_KEY } from "@/lib/astro/planets";
import { clockHour, glideLongitude, orreryOrbit, orreryPlanets } from "@/lib/home/orrery";

/** Jour julien d'une date ISO à 0 h UTC. */
const jdOf = (day: string) => julianDate(Date.parse(`${day}T00:00:00Z`));

/** Dates de contrôle : le jour de rédaction, J2000 et les deux bouts de la validité des éléments JPL. */
const DATES = ["2026-10-29", "2000-01-01", "1800-06-15", "2049-12-31"] as const;

describe("orreryOrbit", () => {
  it("devrait poser l'orbite de Neptune au bord du schéma (rayon 1)", () => {
    expect(orreryOrbit(PLANET_BY_KEY.neptune.elements[0])).toBe(1);
  });

  it("devrait reprendre la compression de la scène, 12 + 22 √a, rapportée à Neptune", () => {
    const neptune = 12 + 22 * Math.sqrt(PLANET_BY_KEY.neptune.elements[0]);
    expect(orreryOrbit(1)).toBeCloseTo(34 / neptune, 12);
    expect(orreryOrbit(4)).toBeCloseTo(56 / neptune, 12);
  });

  it("devrait grandir avec le demi-grand axe", () => {
    const radii = [0, 0.39, 0.72, 1, 1.52, 5.2, 9.54, 19.19, 30.07].map(orreryOrbit);
    radii.slice(1).forEach((radius, i) => expect(radius).toBeGreaterThan(radii[i]));
  });

  it("devrait garder chaque orbite de planète dans ]0, 1], de Mercure à Neptune", () => {
    const radii = PLANETS.map((planet) => orreryOrbit(planet.elements[0]));
    radii.forEach((radius) => {
      expect(radius).toBeGreaterThan(0);
      expect(radius).toBeLessThanOrEqual(1);
    });
    radii.slice(1).forEach((radius, i) => expect(radius).toBeGreaterThan(radii[i]));
  });
});

describe("orreryPlanets", () => {
  it("devrait donner les huit planètes, dans l'ordre depuis le Soleil", () => {
    expect(orreryPlanets(jdOf("2026-10-29")).map((planet) => planet.key)).toEqual(PLANETS.map((planet) => planet.key));
  });

  it.each(DATES)("devrait garder les huit planètes dans le carré [−1, 1]² le %s", (day) => {
    orreryPlanets(jdOf(day)).forEach(({ x, y }) => {
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    });
  });

  it.each(DATES)("devrait poser chaque planète sur son orbite dessinée le %s (|(x, y)| = orbit)", (day) => {
    orreryPlanets(jdOf(day)).forEach(({ key, x, y, orbit }) => {
      expect(orbit).toBe(orreryOrbit(PLANET_BY_KEY[key].elements[0]));
      expect(Math.hypot(x, y)).toBeCloseTo(orbit, 12);
    });
  });

  it.each(DATES)("devrait orienter chaque planète selon sa longitude héliocentrique le %s", (day) => {
    const jd = jdOf(day);
    orreryPlanets(jd).forEach(({ key, x, y, orbit, longitudeDeg }) => {
      const angle = (longitudeDeg * Math.PI) / 180;
      expect(x).toBeCloseTo(orbit * Math.cos(angle), 12);
      expect(y).toBeCloseTo(orbit * Math.sin(angle), 12);
      expect(longitudeDeg).toBeCloseTo(eclipticLongitudeDeg(heliocentric(PLANET_BY_KEY[key], jd)), 9);
      expect(longitudeDeg).toBeGreaterThanOrEqual(0);
      expect(longitudeDeg).toBeLessThan(360);
    });
  });

  it("devrait placer la Terre à l'opposé du point vernal (180°) à l'équinoxe de mars 2026", () => {
    const jd = jdOf("2026-03-20");
    const earth = orreryPlanets(jd).find((planet) => planet.key === "earth");
    expect(earth?.longitudeDeg).toBeCloseTo(eclipticLongitudeDeg(heliocentric(PLANET_BY_KEY.earth, jd)), 9);
    expect(Math.abs((earth?.longitudeDeg ?? 0) - 180)).toBeLessThan(1);
    // 180° : à gauche du Soleil, sur l'horizontale.
    expect(earth?.x).toBeCloseTo(-(earth?.orbit ?? 0), 3);
  });

  it("devrait compter y vers le haut, vu du nord de l'écliptique : la Terre en bas au solstice de juin (270°)", () => {
    const earth = orreryPlanets(jdOf("2026-06-21")).find((planet) => planet.key === "earth");
    expect(Math.abs((earth?.longitudeDeg ?? 0) - 270)).toBeLessThan(1);
    expect(earth?.y).toBeCloseTo(-(earth?.orbit ?? 0), 3);
    expect(Math.abs(earth?.x ?? 1)).toBeLessThan(0.01);
  });
});

describe("glideLongitude", () => {
  it.each([
    [10, 40, 40],
    [350, 10, 370],
    [10, 350, 350],
    [120, 120, 120],
    [-30, 15, 15],
  ])("devrait aller de %f° à %f° dans le sens direct quand le temps avance (arrivée écrite %f°)", (from, to, arrival) => {
    expect(glideLongitude(from, to, true)).toBeCloseTo(arrival, 9);
  });

  it.each([
    [40, 10, 10],
    [10, 350, -10],
    [350, 10, 10],
    [120, 120, 120],
  ])("devrait reculer de %f° à %f° quand le temps recule (arrivée écrite %f°)", (from, to, arrival) => {
    expect(glideLongitude(from, to, false)).toBeCloseTo(arrival, 9);
  });

  it("devrait toujours arriver sur la longitude visée, à un tour près, en moins d'un tour", () => {
    for (let from = 0; from < 360; from += 7) {
      for (let to = 0; to < 360; to += 11) {
        for (const forward of [true, false]) {
          const arrival = glideLongitude(from, to, forward);
          const turns = (arrival - to) / 360;
          expect(turns).toBeCloseTo(Math.round(turns), 9);
          expect(Math.abs(arrival - from)).toBeLessThan(360);
          if (forward) expect(arrival).toBeGreaterThanOrEqual(from);
          else expect(arrival).toBeLessThanOrEqual(from);
        }
      }
    }
  });
});

describe("clockHour", () => {
  it.each([
    [0, 3],
    [90, 12],
    [180, 9],
    [270, 6],
    [359, 3],
    [60, 1],
    [120, 11],
    [16, 2],
  ])("devrait lire la longitude %f° comme %i heures sur un cadran, midi en haut, 0° à droite", (longitudeDeg, hour) => {
    expect(clockHour(longitudeDeg)).toBe(hour);
  });

  it("devrait toujours donner une heure de 1 à 12", () => {
    for (let longitudeDeg = 0; longitudeDeg < 360; longitudeDeg += 0.5) {
      const hour = clockHour(longitudeDeg);
      expect(Number.isInteger(hour)).toBe(true);
      expect(hour).toBeGreaterThanOrEqual(1);
      expect(hour).toBeLessThanOrEqual(12);
    }
  });
});
