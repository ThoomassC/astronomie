import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import { sceneFromEquatorial } from "@/lib/astro/galactic";
import {
  GALAXY_EXTENT_RATIO,
  ellipticalGalaxyCloud,
  galaxyCloud,
  galaxySeed,
  irregularGalaxyCloud,
  shufflePointCloud,
  spiralGalaxyCloud,
} from "@/lib/astro/galaxyShapes";
import { LOCAL_GROUP_KEYS, diskFrame, galaxyRadiusKly, type LocalGroupGalaxy } from "@/lib/astro/localGroup";
import { GALAXY_SEED, milkyWayCloud, type PointCloud } from "@/lib/astro/milkyWay";

/** Spirale fictive, indépendante du fichier de données : disque de 60 kly de rayon, incliné de 60°. */
const SPIRAL: LocalGroupGalaxy = {
  key: "andromeda",
  raDeg: 40,
  decDeg: 25,
  distanceMly: 1.5,
  diameterLy: 120_000,
  shape: "spiral",
  inclinationDeg: 60,
  positionAngleDeg: 30,
  apparentMagV: 5,
  source: "galaxie fictive du test",
};

/** Irrégulière fictive de 20 kly de rayon, sans orientation ni barre. */
const IRREGULAR: LocalGroupGalaxy = {
  key: "small-magellanic-cloud",
  raDeg: 300,
  decDeg: -40,
  distanceMly: 0.2,
  diameterLy: 40_000,
  shape: "irregular",
  apparentMagV: 3,
  source: "galaxie fictive du test",
};

/** Irrégulière fictive en disque incliné, barrée comme le Grand Nuage de Magellan. */
const BARRED: LocalGroupGalaxy = {
  ...IRREGULAR,
  key: "large-magellanic-cloud",
  inclinationDeg: 30,
  positionAngleDeg: 150,
  barred: true,
};

/** Elliptique naine fictive de 8 kly de rayon, d'ellipticité 0,4, grand axe à 30° du nord vers l'est. */
const ELLIPTICAL: LocalGroupGalaxy = {
  ...IRREGULAR,
  key: "m110",
  diameterLy: 16_000,
  shape: "elliptical",
  positionAngleDeg: 30,
  ellipticity: 0.4,
};

const SEED = 7;
const DEG = Math.PI / 180;

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (p: Vec3) => Math.hypot(p.x, p.y, p.z);
/** Part des points qui vérifient la condition. */
const shareOf = (points: readonly Vec3[], keep: (p: Vec3) => boolean) => points.filter(keep).length / points.length;

/** Points du nuage, en kly, relatifs au centre de la galaxie. */
function pointsOf(cloud: PointCloud): Vec3[] {
  return Array.from({ length: cloud.count }, (_, i) => ({
    x: cloud.positions[i * 3],
    y: cloud.positions[i * 3 + 1],
    z: cloud.positions[i * 3 + 2],
  }));
}

/** Valeur affichée (sRGB) d'une composante linéaire : ce que le mélange additif cumule. */
const encode = (value: number) => (value <= 0.003_130_8 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

/** Lumière affichée totale du nuage, composante verte : somme des valeurs affichées de ses points. */
function displayedLight(cloud: PointCloud): number {
  let sum = 0;
  for (let i = 0; i < cloud.count; i++) sum += encode(cloud.colors[i * 3 + 1]);
  return sum;
}

function barycenter(points: readonly Vec3[]): Vec3 {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
}

/** Écart quadratique moyen des points le long d'un axe unitaire. */
const rmsAlong = (points: readonly Vec3[], axis: Vec3) => Math.sqrt(points.reduce((sum, p) => sum + dot(p, axis) ** 2, 0) / points.length);

/** Grand et petit axes sur le ciel (angle de position compté du nord vers l'est), vus du Soleil. */
function skyAxes(galaxy: LocalGroupGalaxy): { major: Vec3; minor: Vec3 } {
  const sight = sceneFromEquatorial(galaxy.raDeg, galaxy.decDeg);
  const pole = sceneFromEquatorial(0, 90);
  const along = dot(pole, sight);
  const raw = { x: pole.x - along * sight.x, y: pole.y - along * sight.y, z: pole.z - along * sight.z };
  const north = { x: raw.x / length(raw), y: raw.y / length(raw), z: raw.z / length(raw) };
  const east = {
    x: north.y * sight.z - north.z * sight.y,
    y: north.z * sight.x - north.x * sight.z,
    z: north.x * sight.y - north.y * sight.x,
  };
  const angle = (galaxy.positionAngleDeg ?? 0) * DEG;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  return {
    major: { x: cos * north.x + sin * east.x, y: cos * north.y + sin * east.y, z: cos * north.z + sin * east.z },
    minor: { x: -sin * north.x + cos * east.x, y: -sin * north.y + cos * east.y, z: -sin * north.z + cos * east.z },
  };
}

describe.each([
  ["spiralGalaxyCloud", SPIRAL, spiralGalaxyCloud],
  ["irregularGalaxyCloud", IRREGULAR, irregularGalaxyCloud],
  ["irregularGalaxyCloud (barrée)", BARRED, irregularGalaxyCloud],
  ["ellipticalGalaxyCloud", ELLIPTICAL, ellipticalGalaxyCloud],
] as const)("%s", (_name, galaxy, generate) => {
  const cloud = generate(galaxy, 3000, SEED);
  const radius = galaxyRadiusKly(galaxy);

  it("devrait compter 3 000 points : 3 coordonnées, 3 composantes de couleur et 1 taille par point", () => {
    expect(cloud.count).toBe(3000);
    expect(cloud.positions).toHaveLength(9000);
    expect(cloud.colors).toHaveLength(9000);
    expect(cloud.sizes).toHaveLength(3000);
  });

  it("devrait redonner exactement le même nuage pour la même graine", () => {
    const again = generate(galaxy, 3000, SEED);
    expect(again.positions).toEqual(cloud.positions);
    expect(again.colors).toEqual(cloud.colors);
    expect(again.sizes).toEqual(cloud.sizes);
  });

  it("devrait donner un autre nuage pour une autre graine", () => {
    expect(generate(galaxy, 3000, SEED + 1).positions).not.toEqual(cloud.positions);
  });

  it("ne devrait produire aucune valeur infinie ni NaN", () => {
    const values = [...cloud.positions, ...cloud.colors, ...cloud.sizes];
    expect(values.filter((value) => !Number.isFinite(value))).toEqual([]);
  });

  it("devrait donner des tailles de 1 à 2,2 px et des couleurs linéaires positives ou nulles", () => {
    expect(Math.min(...cloud.sizes)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...cloud.sizes)).toBeLessThanOrEqual(2.2);
    expect(Math.min(...cloud.colors)).toBeGreaterThanOrEqual(0);
  });

  it("devrait tenir 99 % des points à moins de 1,3 × le rayon du centre", () => {
    expect(shareOf(pointsOf(cloud), (p) => length(p) < 1.3 * radius)).toBeGreaterThanOrEqual(0.99);
  });

  it("devrait tenir tous les points dans GALAXY_EXTENT_RATIO × le rayon (sphère englobante posée sans calcul)", () => {
    expect(GALAXY_EXTENT_RATIO).toBeLessThanOrEqual(1.3);
    expect(Math.max(...pointsOf(cloud).map(length))).toBeLessThanOrEqual(GALAXY_EXTENT_RATIO * radius);
  });

  it("devrait garder la même lumière affichée totale avec deux fois moins de points, deux fois plus éclatants (à 5 % près)", () => {
    const fine = displayedLight(generate(galaxy, 4000, SEED, 1));
    const coarse = displayedLight(generate(galaxy, 2000, SEED, 2));
    expect(coarse / fine).toBeGreaterThan(0.95);
    expect(coarse / fine).toBeLessThan(1.05);
  });

  it("devrait mêler les composantes : les 600 premiers points s'étalent comme le nuage entier (rayon quadratique à 10 % près)", () => {
    const points = pointsOf(cloud);
    const rms = (sample: readonly Vec3[]) => Math.sqrt(sample.reduce((sum, p) => sum + dot(p, p), 0) / sample.length);
    expect(rms(points.slice(0, 600)) / rms(points)).toBeGreaterThan(0.9);
    expect(rms(points.slice(0, 600)) / rms(points)).toBeLessThan(1.1);
  });

  it("devrait multiplier l'éclat affiché de chaque point par glow, aux mêmes places", () => {
    const plain = generate(galaxy, 500, SEED, 1);
    const bright = generate(galaxy, 500, SEED, 3);
    expect(bright.positions).toEqual(plain.positions);
    expect(displayedLight(bright) / displayedLight(plain)).toBeCloseTo(3, 4);
  });
});

describe("spiralGalaxyCloud", () => {
  const points = pointsOf(spiralGalaxyCloud(SPIRAL, 6000, SEED));
  const { normal } = diskFrame(SPIRAL);
  const radius = galaxyRadiusKly(SPIRAL);

  it("devrait aplatir la spirale dans son disque : 95 % des points à moins de 0,15 × le rayon de son plan", () => {
    expect(shareOf(points, (p) => Math.abs(dot(p, normal)) < 0.15 * radius)).toBeGreaterThanOrEqual(0.95);
  });

  it("devrait étaler le disque bien plus qu'il n'est épais (écart quadratique dans le plan > 5 × sur la normale)", () => {
    const height = rmsAlong(points, normal);
    const spread = Math.sqrt(points.reduce((sum, p) => sum + dot(p, p) - dot(p, normal) ** 2, 0) / points.length);
    expect(spread).toBeGreaterThan(5 * height);
  });

  it("devrait centrer la spirale sur son centre (barycentre à moins de 0,05 × le rayon)", () => {
    expect(length(barycenter(points))).toBeLessThan(0.05 * radius);
  });

  it("devrait concentrer la lumière au centre : plus de points à moins de 0,2 × le rayon qu'entre 0,8 et 1 × le rayon", () => {
    const core = points.filter((p) => length(p) < 0.2 * radius).length;
    const rim = points.filter((p) => length(p) >= 0.8 * radius && length(p) < radius).length;
    expect(core).toBeGreaterThan(rim);
  });
});

describe("irregularGalaxyCloud", () => {
  it("devrait centrer une irrégulière sans barre sur son centre (barycentre à moins de 0,05 × le rayon)", () => {
    const points = pointsOf(irregularGalaxyCloud(IRREGULAR, 6000, SEED));
    expect(length(barycenter(points))).toBeLessThan(0.05 * galaxyRadiusKly(IRREGULAR));
  });

  it("devrait décentrer la lumière d'une irrégulière barrée vers sa barre (barycentre à plus de 0,04 × le rayon)", () => {
    const points = pointsOf(irregularGalaxyCloud(BARRED, 6000, SEED));
    expect(length(barycenter(points))).toBeGreaterThan(0.04 * galaxyRadiusKly(BARRED));
  });

  it("devrait aplatir un disque irrégulier incliné le long de sa normale", () => {
    const points = pointsOf(irregularGalaxyCloud(BARRED, 6000, SEED));
    const { major, normal } = diskFrame(BARRED);
    expect(rmsAlong(points, normal)).toBeLessThan(0.6 * rmsAlong(points, major));
  });
});

describe("ellipticalGalaxyCloud", () => {
  const points = pointsOf(ellipticalGalaxyCloud(ELLIPTICAL, 6000, SEED));

  it("devrait centrer l'elliptique sur son centre (barycentre à moins de 0,05 × le rayon)", () => {
    expect(length(barycenter(points))).toBeLessThan(0.05 * galaxyRadiusKly(ELLIPTICAL));
  });

  it("devrait reproduire l'ellipticité observée : petit axe / grand axe sur le ciel ≈ 1 − 0,4 (à 0,05 près)", () => {
    const { major, minor } = skyAxes(ELLIPTICAL);
    expect(rmsAlong(points, minor) / rmsAlong(points, major)).toBeCloseTo(0.6, 1);
  });

  it("devrait dessiner une elliptique ronde sur le ciel sans ellipticité publiée", () => {
    const round = pointsOf(ellipticalGalaxyCloud({ ...ELLIPTICAL, ellipticity: undefined }, 6000, SEED));
    const { major, minor } = skyAxes(ELLIPTICAL);
    expect(rmsAlong(round, minor) / rmsAlong(round, major)).toBeCloseTo(1, 1);
  });
});

describe("galaxyCloud", () => {
  it.each([
    ["une spirale", SPIRAL, spiralGalaxyCloud],
    ["une irrégulière", BARRED, irregularGalaxyCloud],
    ["une elliptique", ELLIPTICAL, ellipticalGalaxyCloud],
  ] as const)("devrait dessiner %s avec son générateur", (_label, galaxy, generate) => {
    expect(galaxyCloud(galaxy, 500, SEED, 2).positions).toEqual(generate(galaxy, 500, SEED, 2).positions);
    expect(galaxyCloud(galaxy, 500, SEED, 2).colors).toEqual(generate(galaxy, 500, SEED, 2).colors);
  });
});

describe("galaxySeed", () => {
  it("devrait donner à chaque galaxie sa propre graine, entière sur 32 bits, toujours la même", () => {
    const seeds = LOCAL_GROUP_KEYS.map(galaxySeed);
    expect(new Set(seeds).size).toBe(seeds.length);
    for (const seed of seeds) {
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
    expect(LOCAL_GROUP_KEYS.map(galaxySeed)).toEqual(seeds);
  });
});

describe("shufflePointCloud", () => {
  /** Points du nuage, chacun avec sa couleur et sa taille, triés : le même ensemble quel que soit l'ordre. */
  const sortedPoints = (cloud: PointCloud) =>
    Array.from({ length: cloud.count }, (_, i) =>
      [...cloud.positions.subarray(i * 3, i * 3 + 3), ...cloud.colors.subarray(i * 3, i * 3 + 3), cloud.sizes[i]].join(" "),
    ).sort();

  it("devrait garder exactement les mêmes points, couleurs et tailles", () => {
    const original = milkyWayCloud(2000, GALAXY_SEED);
    const before = sortedPoints(original);
    expect(sortedPoints(shufflePointCloud(original, 1))).toEqual(before);
  });

  it("devrait mêler le nuage en place et le renvoyer", () => {
    const cloud = milkyWayCloud(500, GALAXY_SEED);
    const firstBefore = Array.from(cloud.positions.subarray(0, 30));
    expect(shufflePointCloud(cloud, 1)).toBe(cloud);
    expect(Array.from(cloud.positions.subarray(0, 30))).not.toEqual(firstBefore);
  });

  it("devrait redonner le même ordre pour la même graine", () => {
    const a = shufflePointCloud(milkyWayCloud(1000, GALAXY_SEED), 42);
    const b = shufflePointCloud(milkyWayCloud(1000, GALAXY_SEED), 42);
    expect(a.positions).toEqual(b.positions);
  });

  it("devrait faire d'un nuage tiré par composantes (bulbe, bras, disque) un nuage dont tout début est fidèle", () => {
    const cloud = shufflePointCloud(milkyWayCloud(6000, GALAXY_SEED), GALAXY_SEED);
    const points = pointsOf(cloud);
    const center = barycenter(points);
    const spread = (sample: readonly Vec3[]) =>
      Math.sqrt(sample.reduce((sum, p) => sum + (p.x - center.x) ** 2 + (p.y - center.y) ** 2 + (p.z - center.z) ** 2, 0) / sample.length);
    // Sans mélange, les 600 premiers points seraient tous dans le bulbe, cinq fois plus serré que la galaxie.
    expect(spread(points.slice(0, 600)) / spread(points)).toBeGreaterThan(0.9);
    expect(spread(points.slice(0, 600)) / spread(points)).toBeLessThan(1.1);
  });
});
