import { describe, expect, it } from "vitest";
import { DAY_MS, J2000_JD, type Vec3 } from "@/lib/astro/constants";
import {
  distance,
  eclipticLongitudeDeg,
  elementsAt,
  heliocentric,
  julianDate,
  positionAt,
  solveKepler,
  type OrbitalElements,
} from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY } from "@/lib/astro/planets";

const DEG = Math.PI / 180;
const JULIAN_CENTURY_DAYS = 36525;

/** Jour julien d'une date ISO, calculé ici sans passer par `julianDate` pour isoler les tests. */
const jdOf = (iso: string) => Date.parse(iso) / DAY_MS + 2_440_587.5;

/** Deux angles désignent la même direction (égalité modulo 2π). */
function expectSameAngle(actual: number, expected: number, label = "angle") {
  expect(Math.cos(actual), `cos ${label}`).toBeCloseTo(Math.cos(expected), 9);
  expect(Math.sin(actual), `sin ${label}`).toBeCloseTo(Math.sin(expected), 9);
}

/** |actual − expected| ≤ tolerance, avec un message qui montre la valeur obtenue. */
function expectNear(actual: number, expected: number, tolerance: number) {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

const norm = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

describe("julianDate", () => {
  it.each([
    [Date.UTC(2000, 0, 1, 12), 2_451_545],
    [0, 2_440_587.5],
    [DAY_MS, 2_440_588.5],
    [-DAY_MS / 2, 2_440_587],
  ])("devrait convertir %i ms Unix en jour julien %f", (ms, expected) => {
    expect(julianDate(ms)).toBeCloseTo(expected, 9);
  });
});

describe("elementsAt", () => {
  it("devrait renvoyer les éléments de la Terre en radians quand jd = J2000", () => {
    const el = elementsAt(PLANET_BY_KEY.earth, J2000_JD);
    expect(el.a).toBeCloseTo(1.00000261, 12);
    expect(el.e).toBeCloseTo(0.01671123, 12);
    expect(el.inclination).toBeCloseTo(-0.00001531 * DEG, 14);
    expectSameAngle(el.node, 0, "Ω");
    expectSameAngle(el.argPerihelion, 102.93768193 * DEG, "ω");
    expect(el.meanAnomaly).toBeCloseTo((100.46457166 - 102.93768193) * DEG, 10);
  });

  it("devrait ajouter rates × T à chaque élément quand un siècle julien s'est écoulé", () => {
    const el = elementsAt(PLANET_BY_KEY.earth, J2000_JD + JULIAN_CENTURY_DAYS);
    expect(el.a).toBeCloseTo(1.00000261 + 0.00000562, 12);
    expect(el.e).toBeCloseTo(0.01671123 - 0.00004392, 12);
    expect(el.inclination).toBeCloseTo((-0.00001531 - 0.01294668) * DEG, 12);
    expectSameAngle(el.argPerihelion, (102.93768193 + 0.32327364) * DEG, "ω");
  });

  it("devrait ramener l'anomalie moyenne dans [−π, π] quand L − ϖ fait près de cent tours", () => {
    // L − ϖ = 35 996,5760659° ≡ −3,4239341°
    const el = elementsAt(PLANET_BY_KEY.earth, J2000_JD + JULIAN_CENTURY_DAYS);
    expect(el.meanAnomaly).toBeCloseTo(-3.4239341 * DEG, 8);
  });

  it("devrait ramener l'anomalie moyenne dans [−π, π] quand L − ϖ est très négatif", () => {
    // L − ϖ = −36 001,52228644° ≡ −1,52228644°
    const el = elementsAt(PLANET_BY_KEY.earth, J2000_JD - JULIAN_CENTURY_DAYS);
    expect(el.meanAnomaly).toBeCloseTo(-1.52228644 * DEG, 8);
  });

  it("devrait calculer Ω et ω = ϖ − Ω quand le nœud ascendant n'est pas nul (Mars)", () => {
    const el = elementsAt(PLANET_BY_KEY.mars, J2000_JD);
    expectSameAngle(el.node, 49.55953891 * DEG, "Ω");
    expectSameAngle(el.argPerihelion, (-23.94362959 - 49.55953891) * DEG, "ω");
    expect(el.meanAnomaly).toBeCloseTo((-4.55343205 + 23.94362959) * DEG, 10);
    expect(el.inclination).toBeCloseTo(1.84969142 * DEG, 12);
  });
});

describe("solveKepler", () => {
  const ECCENTRICITIES = [0, 0.0167, 0.2056, 0.3];
  const MEAN_ANOMALIES = [-Math.PI + 1e-6, -2.5, -1, -0.1, 0, 0.1, 1, 2.5, Math.PI];
  const cases = ECCENTRICITIES.flatMap((e) => MEAN_ANOMALIES.map((m) => [e, m] as const));

  it.each(cases)("devrait vérifier E − e·sin E = M à 1e-9 près (e = %f, M = %f)", (e, m) => {
    const E = solveKepler(m, e);
    expect(Math.abs(E - e * Math.sin(E) - m)).toBeLessThan(1e-9);
  });

  it("devrait renvoyer M quand l'orbite est circulaire (e = 0)", () => {
    expect(solveKepler(1.234, 0)).toBeCloseTo(1.234, 12);
  });

  it.each([[0], [Math.PI]])(
    "devrait renvoyer E = M au périhélie et à l'aphélie quelle que soit l'excentricité (M = %f)",
    (m) => {
      expect(solveKepler(m, 0.2056)).toBeCloseTo(m, 12);
    },
  );
});

describe("positionAt", () => {
  const flat = (over: Partial<OrbitalElements> = {}): OrbitalElements => ({
    a: 2,
    e: 0.5,
    inclination: 0,
    node: 0,
    argPerihelion: 0,
    meanAnomaly: 0,
    ...over,
  });

  it("devrait placer le périhélie à a(1 − e) sur +x quand tous les angles sont nuls", () => {
    const p = positionAt(flat(), 0);
    expect(p.x).toBeCloseTo(1, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it("devrait placer l'aphélie à a(1 + e) sur −x quand E = π", () => {
    const p = positionAt(flat(), Math.PI);
    expect(p.x).toBeCloseTo(-3, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it("devrait appliquer le facteur √(1 − e²) sur y' quand E = π/2", () => {
    const p = positionAt(flat(), Math.PI / 2);
    expect(p.x).toBeCloseTo(-1, 12); // a(cos E − e) = 2 × (0 − 0,5)
    expect(p.y).toBeCloseTo(2 * Math.sqrt(0.75), 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it("devrait tourner le périhélie vers +y quand Ω = 90°", () => {
    const p = positionAt(flat({ node: Math.PI / 2 }), 0);
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(1, 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it("devrait sortir le périhélie au nord de l'écliptique (+z) quand i = 90° et ω = 90°", () => {
    const p = positionAt(flat({ inclination: Math.PI / 2, argPerihelion: Math.PI / 2 }), 0);
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.z).toBeCloseTo(1, 12);
  });

  it("devrait placer le point à r = a(1 − e·cos E) du Soleil quelles que soient les rotations", () => {
    const el = flat({ a: 1.5, e: 0.2, inclination: 0.3, node: 1.1, argPerihelion: -2.2 });
    const E = 0.8;
    expect(norm(positionAt(el, E))).toBeCloseTo(1.5 * (1 - 0.2 * Math.cos(E)), 12);
  });
});

describe("heliocentric", () => {
  it("devrait placer la Terre au périhélie (≈ 0,9833 UA) début janvier 2026", () => {
    const earth = heliocentric(PLANET_BY_KEY.earth, jdOf("2026-01-03T00:00Z"));
    expectNear(norm(earth), 0.9833, 0.001);
  });

  it("devrait placer la Terre à l'aphélie (≈ 1,0167 UA) début juillet 2026", () => {
    const earth = heliocentric(PLANET_BY_KEY.earth, jdOf("2026-07-06T00:00Z"));
    expectNear(norm(earth), 1.0167, 0.001);
  });

  it("devrait placer la Terre à 180° de longitude à l'équinoxe de mars 2026", () => {
    const earth = heliocentric(PLANET_BY_KEY.earth, jdOf("2026-03-20T14:46Z"));
    expectNear(eclipticLongitudeDeg(earth), 180, 0.6);
  });

  it("devrait placer la Terre à 270° de longitude au solstice de juin 2026", () => {
    const earth = heliocentric(PLANET_BY_KEY.earth, jdOf("2026-06-21T08:24Z"));
    expectNear(eclipticLongitudeDeg(earth), 270, 0.6);
  });

  it("devrait garder la Terre dans le plan de l'écliptique", () => {
    const earth = heliocentric(PLANET_BY_KEY.earth, jdOf("2026-06-21T08:24Z"));
    expect(Math.abs(earth.z)).toBeLessThan(1e-4);
  });

  describe("Mercure échantillonné chaque jour de 2026", () => {
    const start = jdOf("2026-01-01T00:00Z");
    const sampleYear = () => Array.from({ length: 366 }, (_, day) => heliocentric(PLANET_BY_KEY.mercury, start + day));

    it("devrait rester entre son périhélie (0,3074 UA) et son aphélie (0,4668 UA)", () => {
      const distances = sampleYear().map(norm);
      expect(Math.min(...distances)).toBeGreaterThanOrEqual(0.3074);
      expect(Math.max(...distances)).toBeLessThanOrEqual(0.4668);
    });

    it("devrait parcourir toute son orbite excentrique (distance de < 0,31 à > 0,46 UA)", () => {
      const distances = sampleYear().map(norm);
      expect(Math.min(...distances)).toBeLessThan(0.31);
      expect(Math.max(...distances)).toBeGreaterThan(0.46);
    });

    it("devrait s'écarter de l'écliptique d'au plus son inclinaison (≈ 7°) et l'atteindre", () => {
      const latitudesDeg = sampleYear().map((v) => Math.abs(Math.asin(v.z / norm(v))) / DEG);
      expect(Math.max(...latitudesDeg)).toBeGreaterThan(6.9);
      expect(Math.max(...latitudesDeg)).toBeLessThanOrEqual(7.01);
    });
  });
});

describe("eclipticLongitudeDeg", () => {
  it.each([
    [{ x: 1, y: 0, z: 0 }, 0],
    [{ x: 0, y: 1, z: 0 }, 90],
    [{ x: -1, y: 0, z: 0 }, 180],
    [{ x: 0, y: -1, z: 0 }, 270],
    [{ x: 1, y: -1, z: 0 }, 315],
  ])("devrait donner la longitude de %o dans [0, 360[ (%f°)", (v, expected) => {
    expect(eclipticLongitudeDeg(v)).toBeCloseTo(expected, 9);
  });

  it("devrait ignorer la composante z (latitude)", () => {
    expect(eclipticLongitudeDeg({ x: 1, y: 1, z: 5 })).toBeCloseTo(45, 9);
  });

  it("devrait rester strictement sous 360 quand l'angle est infinitésimalement négatif", () => {
    const longitude = eclipticLongitudeDeg({ x: 1, y: -1e-20, z: 0 });
    expect(longitude).toBeGreaterThanOrEqual(0);
    expect(longitude).toBeLessThan(360);
  });
});

describe("distance", () => {
  it.each([
    [{ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, 5],
    [{ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 15 }, 13],
    [{ x: -1, y: -2, z: -3 }, { x: -1, y: -2, z: -3 }, 0],
  ])("devrait mesurer la distance euclidienne entre %o et %o (%f)", (a, b, expected) => {
    expect(distance(a, b)).toBeCloseTo(expected, 12);
  });

  it("devrait être symétrique", () => {
    const a = { x: 0.3, y: -1.2, z: 0.05 };
    const b = { x: -5.1, y: 0.4, z: 0.2 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a), 12);
  });
});
