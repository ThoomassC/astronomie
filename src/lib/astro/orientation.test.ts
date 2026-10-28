import { describe, expect, it } from "vitest";
import { J2000_JD, type Vec3 } from "@/lib/astro/constants";
import { heliocentric, julianDate } from "@/lib/astro/ephemeris";
import { ROTATION, equatorNode, poleDirection, primeMeridianDeg, subsolarPoint } from "@/lib/astro/orientation";
import { PLANETS, PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { toScene } from "@/lib/astro/scale";

const R2D = 180 / Math.PI;
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const unit = (v: Vec3): Vec3 => {
  const n = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / n, y: v.y / n, z: v.z / n };
};
const angleDeg = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, dot(unit(a), unit(b))))) * R2D;
const jdOf = (iso: string) => julianDate(Date.parse(iso));
const ECLIPTIC_NORTH: Vec3 = { x: 0, y: 1, z: 0 };

/** Direction du Soleil vue de la planète, en coordonnées de scène. */
function sunDirection(key: PlanetKey, jd: number): Vec3 {
  const p = toScene(heliocentric(PLANET_BY_KEY[key], jd), 0);
  return unit({ x: -p.x, y: -p.y, z: -p.z });
}

/** Normale du plan de l'orbite, dans le sens du mouvement. */
function orbitNormal(key: PlanetKey, jd: number): Vec3 {
  const a = toScene(heliocentric(PLANET_BY_KEY[key], jd), 0);
  const b = toScene(heliocentric(PLANET_BY_KEY[key], jd + 30), 0);
  return unit(cross(a, b));
}

const subsolarLatitude = (key: PlanetKey, iso: string) => {
  const jd = jdOf(iso);
  return subsolarPoint(ROTATION[key], jd, sunDirection(key, jd)).latDeg;
};

describe("poleDirection et equatorNode", () => {
  it("devraient donner deux vecteurs unitaires et orthogonaux pour chaque planète", () => {
    for (const planet of PLANETS) {
      const pole = poleDirection(ROTATION[planet.key], J2000_JD);
      const node = equatorNode(ROTATION[planet.key], J2000_JD);
      expect(Math.hypot(pole.x, pole.y, pole.z)).toBeCloseTo(1, 9);
      expect(Math.hypot(node.x, node.y, node.z)).toBeCloseTo(1, 9);
      expect(dot(pole, node)).toBeCloseTo(0, 9);
    }
  });

  it("devrait incliner l'axe de la Terre de 23,44° sur l'écliptique", () => {
    expect(angleDeg(poleDirection(ROTATION.earth, J2000_JD), ECLIPTIC_NORTH)).toBeCloseTo(23.44, 1);
  });

  it("devrait incliner l'axe de Mars de 25,19° sur son orbite", () => {
    const jd = jdOf("2026-10-27T00:00:00Z");
    expect(Math.abs(angleDeg(poleDirection(ROTATION.mars, jd), orbitNormal("mars", jd)) - 25.19)).toBeLessThan(0.3);
  });

  it("devrait faire tourner Vénus à l'envers, pôle nord près de celui de l'écliptique", () => {
    expect(ROTATION.venus.w[1]).toBeLessThan(0);
    expect(angleDeg(poleDirection(ROTATION.venus, J2000_JD), ECLIPTIC_NORTH)).toBeLessThan(3);
  });
});

describe("primeMeridianDeg", () => {
  it("devrait valoir W₀ à J2000", () => {
    expect(primeMeridianDeg(ROTATION.earth, J2000_JD)).toBeCloseTo(190.147, 6);
  });

  it("devrait rester dans [0, 360[, y compris pour une rotation rétrograde", () => {
    for (const days of [-123_456.7, 0.3, 98_765.4]) {
      const w = primeMeridianDeg(ROTATION.venus, J2000_JD + days);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(360);
    }
  });
});

describe("subsolarPoint", () => {
  it("devrait placer le Soleil au zénith du tropique du Cancer au solstice de juin 2026", () => {
    expect(Math.abs(subsolarLatitude("earth", "2026-06-21T08:24:00Z") - 23.44)).toBeLessThan(0.1);
  });

  it("devrait placer le Soleil près de Greenwich à midi UTC à l'équinoxe (équation du temps : +1,9° Est)", () => {
    const jd = jdOf("2026-03-20T12:00:00Z");
    const point = subsolarPoint(ROTATION.earth, jd, sunDirection("earth", jd));
    expect(Math.abs(point.latDeg)).toBeLessThan(0.2);
    expect(Math.abs(point.lonDeg - 1.9)).toBeLessThan(1);
  });

  it("devrait éclairer les anneaux de Saturne par la tranche à l'équinoxe du 6 mai 2025", () => {
    expect(Math.abs(subsolarLatitude("saturn", "2025-05-06T00:00:00Z"))).toBeLessThan(1);
  });

  it("devrait éclairer la face nord des anneaux à 26,7° au solstice de mai 2017", () => {
    expect(Math.abs(subsolarLatitude("saturn", "2017-05-24T00:00:00Z") - 26.7)).toBeLessThan(1);
  });

  it("devrait mettre le Soleil dans le plan de l'équateur d'Uranus à l'équinoxe de décembre 2007", () => {
    expect(Math.abs(subsolarLatitude("uranus", "2007-12-07T00:00:00Z"))).toBeLessThan(1.5);
  });

  it("devrait tourner le pôle nord d'Uranus vers le Soleil en 2026", () => {
    expect(subsolarLatitude("uranus", "2026-10-27T00:00:00Z")).toBeGreaterThan(60);
  });
});
