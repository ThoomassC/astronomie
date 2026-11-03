import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import { sceneFromGalactic } from "@/lib/astro/galactic";
import {
  ARMS,
  GALAXY_SEED,
  MILKY_WAY,
  armAzimuthDeg,
  galaxyPointBudget,
  milkyWayCloud,
  seededRandom,
  type ArmKey,
  type ArmSpec,
  type PointCloud,
} from "@/lib/astro/milkyWay";

/** Distance du Soleil au centre galactique retenue (GRAVITY 2021 ; ESO : environ 27 000 al). */
const SUN_TO_CENTER_LY = 27_000;

const ARM_KEYS: readonly ArmKey[] = ["scutum-centaurus", "perseus", "sagittarius-carina", "norma-outer", "local"];

function armOf(key: ArmKey): ArmSpec {
  const arm = ARMS.find((candidate) => candidate.key === key);
  if (!arm) throw new Error(`Bras absent : ${key}`);
  return arm;
}

/** Azimut ramené dans [0°, 360°[. */
const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Points du nuage, en années-lumière, axes de scène. */
function pointsOf(cloud: PointCloud): Vec3[] {
  return Array.from({ length: cloud.count }, (_, i) => ({
    x: cloud.positions[i * 3],
    y: cloud.positions[i * 3 + 1],
    z: cloud.positions[i * 3 + 2],
  }));
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** Part des points qui vérifient la condition. */
const shareOf = (points: readonly Vec3[], keep: (p: Vec3) => boolean) => points.filter(keep).length / points.length;

describe("seededRandom", () => {
  const draw = (seed: number) => {
    const next = seededRandom(seed);
    return Array.from({ length: 100 }, () => next());
  };

  it("devrait redonner la même suite pour la même graine", () => {
    expect(draw(GALAXY_SEED)).toEqual(draw(GALAXY_SEED));
  });

  it("devrait tirer des valeurs dans [0, 1[", () => {
    const values = draw(42);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it("devrait donner des suites différentes pour deux graines différentes (1 et 2)", () => {
    expect(draw(1)).not.toEqual(draw(2));
  });
});

describe("galaxyPointBudget", () => {
  it("devrait dessiner 40 000 points avec une souris ou un pavé tactile", () => {
    expect(galaxyPointBudget(false)).toBe(40_000);
  });

  it("devrait se limiter à 16 000 points sur un écran tactile", () => {
    expect(galaxyPointBudget(true)).toBe(16_000);
  });
});

describe("MILKY_WAY et ARMS", () => {
  it("devrait placer le Soleil à 27 000 al du centre galactique", () => {
    expect(MILKY_WAY.sunRadiusLy).toBe(SUN_TO_CENTER_LY);
  });

  it("devrait répartir tous les points entre les bras, le bulbe et le disque (somme des parts = 1)", () => {
    const armShares = ARMS.reduce((sum, arm) => sum + arm.share, 0);
    expect(armShares + MILKY_WAY.bulgeShare + MILKY_WAY.diskShare).toBeCloseTo(1, 12);
  });

  it("devrait décrire les cinq bras dans l'ordre du modèle", () => {
    expect(ARMS.map((arm) => arm.key)).toEqual(ARM_KEYS);
  });
});

describe("armAzimuthDeg", () => {
  it.each(ARM_KEYS)("devrait faire tourner le bras %s dans le sens direct en s'éloignant du centre (bras traînant d'une rotation horaire vue du nord)", (key) => {
    const arm = armOf(key);
    const radii = Array.from({ length: 50 }, (_, i) => arm.innerRadiusLy + ((arm.outerRadiusLy - arm.innerRadiusLy) * i) / 49);
    const azimuths = radii.map((radius) => armAzimuthDeg(arm, radius));
    const steps = azimuths.slice(1).map((azimuth, i) => azimuth - azimuths[i]);
    expect(Math.min(...steps)).toBeGreaterThan(0);
  });

  // Calage du modèle : à l'azimut du Soleil (180°), Sagittaire–Carène passe à 21 300 al, Persée à 31 200 al.
  it.each([
    ["perseus", 31_155],
    ["sagittarius-carina", 21_306],
    ["scutum-centaurus", 14_570],
  ] as const)("devrait faire passer le bras %s par l'azimut du Soleil (180° à 0,5° près) à %i al du centre", (key, radius) => {
    expect(wrap360(armAzimuthDeg(armOf(key), radius))).toBeCloseTo(180, 0);
  });

  it("devrait faire passer le bras local exactement par l'azimut du Soleil à son rayon de référence (27 000 al)", () => {
    expect(armAzimuthDeg(armOf("local"), 27_000)).toBe(180);
  });
});

describe("milkyWayCloud", () => {
  describe("2 000 points", () => {
    const cloud = milkyWayCloud(2000, GALAXY_SEED);

    it("devrait compter 2 000 points : 3 coordonnées, 3 composantes de couleur et 1 taille par point", () => {
      expect(cloud.count).toBe(2000);
      expect(cloud.positions).toHaveLength(6000);
      expect(cloud.colors).toHaveLength(6000);
      expect(cloud.sizes).toHaveLength(2000);
    });

    it("devrait redonner exactement le même nuage pour la même graine", () => {
      const again = milkyWayCloud(2000, GALAXY_SEED);
      expect(again.positions).toEqual(cloud.positions);
      expect(again.colors).toEqual(cloud.colors);
      expect(again.sizes).toEqual(cloud.sizes);
    });

    it("devrait donner un autre nuage pour une autre graine", () => {
      expect(milkyWayCloud(2000, GALAXY_SEED + 1).positions).not.toEqual(cloud.positions);
    });

    it("ne devrait produire aucune valeur infinie ni NaN", () => {
      const values = [...cloud.positions, ...cloud.colors, ...cloud.sizes];
      expect(values.filter((value) => !Number.isFinite(value))).toEqual([]);
    });

    it("devrait donner des tailles de 1 à 2,5 px", () => {
      expect(Math.min(...cloud.sizes)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...cloud.sizes)).toBeLessThanOrEqual(2.5);
    });

    it("devrait donner des couleurs linéaires positives ou nulles", () => {
      expect(Math.min(...cloud.colors)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("40 000 points (budget avec une souris)", () => {
    const points = pointsOf(milkyWayCloud(40_000, GALAXY_SEED));
    const center = sceneFromGalactic(0, 0);
    const galacticCenter = { x: center.x * SUN_TO_CENTER_LY, y: center.y * SUN_TO_CENTER_LY, z: center.z * SUN_TO_CENTER_LY };
    const northPole = sceneFromGalactic(0, 90);

    it("devrait centrer la galaxie sur le centre galactique, à 27 000 al du Soleil (barycentre à moins de 3 000 al)", () => {
      const barycenter = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        z: points.reduce((sum, p) => sum + p.z, 0) / points.length,
      };
      expect(distance(barycenter, galacticCenter)).toBeLessThan(3000);
    });

    // Le modèle met 5,0 % des points à plus de 2 000 al du plan, tous dans le bulbe (barre σz 1 200 al,
    // sphéroïde σz 2 500 al) : le seuil de 95 % du plan tomberait sur l'espérance, d'où 93 %.
    it("devrait aplatir la galaxie en disque : au moins 93 % des points à moins de 2 000 al de son plan", () => {
      expect(shareOf(points, (p) => Math.abs(dot(p, northPole)) < 2000)).toBeGreaterThanOrEqual(0.93);
    });

    it("devrait tenir dans le disque : au moins 99 % des points à moins de 55 000 al du centre", () => {
      expect(shareOf(points, (p) => distance(p, galacticCenter) < 55_000)).toBeGreaterThanOrEqual(0.99);
    });

    it("devrait entourer le Soleil d'étoiles du bras local (au moins 5 points à moins de 1 500 al)", () => {
      expect(points.filter((p) => Math.hypot(p.x, p.y, p.z) < 1500).length).toBeGreaterThanOrEqual(5);
    });
  });
});
