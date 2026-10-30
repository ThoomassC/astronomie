import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import { GALACTIC_CENTER_DISTANCE_LY, GALACTIC_DISK_RADIUS_LY, galacticFromScene, sceneFromEquatorial } from "@/lib/astro/galactic";
import {
  LOCAL_GROUP,
  LOCAL_GROUP_KEYS,
  diskFrame,
  diskNormal,
  galaxyCenterKly,
  galaxyLuminosity,
  galaxyRadiusKly,
  isLocalGroupGalaxyKey,
  type LocalGroupGalaxy,
  type LocalGroupGalaxyKey,
} from "@/lib/astro/localGroup";

/** Galaxie fictive, indépendante du fichier de données : seuls comptent sa place, sa taille et son orientation. */
const fixture = (overrides: Partial<LocalGroupGalaxy> = {}): LocalGroupGalaxy => ({
  key: "andromeda",
  raDeg: 40,
  decDeg: 25,
  distanceMly: 1.5,
  diameterLy: 120_000,
  shape: "spiral",
  inclinationDeg: 50,
  positionAngleDeg: 30,
  apparentMagV: 5,
  source: "galaxie fictive du test",
  ...overrides,
});

const DEG = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const scaled = (v: Vec3, k: number): Vec3 => ({ x: v.x * k, y: v.y * k, z: v.z * k });
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const unit = (v: Vec3) => scaled(v, 1 / Math.hypot(v.x, v.y, v.z));
/** Angle entre deux directions, en degrés : atan2(|a × b|, a · b), précis même près de 0° (acos ne l'est pas). */
const angleDeg = (a: Vec3, b: Vec3) => {
  const c = cross(a, b);
  return Math.atan2(Math.hypot(c.x, c.y, c.z), dot(a, b)) / DEG;
};

const closeTo = (p: Vec3, digits: number) => ({
  x: expect.closeTo(p.x, digits),
  y: expect.closeTo(p.y, digits),
  z: expect.closeTo(p.z, digits),
});

/**
 * Repère du ciel à la place de la galaxie, recalculé ici : ligne de visée (du Soleil vers la galaxie), nord local
 * (vers le pôle nord céleste, perpendiculaire à la ligne de visée) et est local (ascension droite croissante).
 */
function skyAt(galaxy: LocalGroupGalaxy): { sight: Vec3; north: Vec3; east: Vec3 } {
  const sight = sceneFromEquatorial(galaxy.raDeg, galaxy.decDeg);
  const pole = sceneFromEquatorial(0, 90);
  const along = dot(pole, sight);
  const north = unit({ x: pole.x - along * sight.x, y: pole.y - along * sight.y, z: pole.z - along * sight.z });
  return { sight, north, east: cross(north, sight) };
}

/** Grand axe sur le ciel : angle de position compté du nord vers l'est. */
function majorAxisOnSky(galaxy: LocalGroupGalaxy): Vec3 {
  const { north, east } = skyAt(galaxy);
  const angle = (galaxy.positionAngleDeg ?? 0) * DEG;
  return {
    x: Math.cos(angle) * north.x + Math.sin(angle) * east.x,
    y: Math.cos(angle) * north.y + Math.sin(angle) * east.y,
    z: Math.cos(angle) * north.z + Math.sin(angle) * east.z,
  };
}

/** Orientations essayées : (inclinaison, angle de position), en degrés. */
const ORIENTATIONS = [
  [0, 0],
  [0, 140],
  [30, 0],
  [50, 30],
  [77, 38],
  [90, 0],
  [90, 90],
  [55, 201],
] as const;

describe("galaxyCenterKly", () => {
  it("devrait placer le centre à distanceMly × 1 000 kly du Soleil (1,5 Mal → 1 500 kly)", () => {
    const center = galaxyCenterKly(fixture());
    expect(Math.hypot(center.x, center.y, center.z)).toBeCloseTo(1500, 9);
  });

  it("devrait placer le centre dans la direction de ses coordonnées équatoriales (α, δ)", () => {
    const center = galaxyCenterKly(fixture());
    expect(scaled(center, 1 / 1500)).toEqual(closeTo(sceneFromEquatorial(40, 25), 12));
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = galaxyCenterKly(fixture(), out);
    expect(result).toBe(out);
    expect(out).toEqual(closeTo(scaled(sceneFromEquatorial(40, 25), 1500), 9));
  });
});

describe("galaxyRadiusKly", () => {
  it("devrait donner le rayon en milliers d'al : la moitié du diamètre (120 000 al → 60 kly)", () => {
    expect(galaxyRadiusKly(fixture())).toBe(60);
  });
});

describe("galaxyLuminosity", () => {
  // 10 pc × 10^5 = 1 Mpc = 3,261 56 Mal : module de distance de 25, donc M_V = m − 25.
  const atOneMegaparsec = (apparentMagV: number) => fixture({ distanceMly: 3.261_56, apparentMagV });

  it("devrait valoir 10^(−0,4 M_V), M_V = m − 5 log10(d / 10 pc) : m = 5 à 1 Mpc → M_V = −20 → 10^8", () => {
    expect(galaxyLuminosity(atOneMegaparsec(5))).toBeCloseTo(1e8, -3);
  });

  it("devrait multiplier la luminosité par 100 pour 5 magnitudes de moins", () => {
    const ratio = (galaxyLuminosity(atOneMegaparsec(0)) ?? 0) / (galaxyLuminosity(atOneMegaparsec(5)) ?? 1);
    expect(ratio).toBeCloseTo(100, 9);
  });

  it("devrait multiplier la luminosité par 4 quand la même magnitude est vue deux fois plus loin", () => {
    const near = galaxyLuminosity(fixture({ distanceMly: 1 })) ?? 0;
    const far = galaxyLuminosity(fixture({ distanceMly: 2 })) ?? 0;
    expect(far / near).toBeCloseTo(4, 9);
  });

  it("devrait renvoyer null sans magnitude (la Voie lactée, vue de l'intérieur)", () => {
    expect(galaxyLuminosity(fixture({ apparentMagV: null }))).toBeNull();
  });
});

describe("diskNormal", () => {
  it.each(ORIENTATIONS)("devrait renvoyer une normale unitaire (inclinaison %i°, angle de position %i°)", (inclinationDeg, positionAngleDeg) => {
    const normal = diskNormal(fixture({ inclinationDeg, positionAngleDeg }));
    expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 12);
  });

  it.each([0, 75, 140, 300])("devrait pointer vers le Soleil (− ligne de visée) quand la galaxie est vue de face, quel que soit l'angle de position (%i°)", (positionAngleDeg) => {
    const galaxy = fixture({ inclinationDeg: 0, positionAngleDeg });
    expect(diskNormal(galaxy)).toEqual(closeTo(scaled(skyAt(galaxy).sight, -1), 12));
  });

  it.each(ORIENTATIONS)("devrait écarter la normale de la direction du Soleil d'un angle égal à l'inclinaison (%i°, angle de position %i°)", (inclinationDeg, positionAngleDeg) => {
    const galaxy = fixture({ inclinationDeg, positionAngleDeg });
    const towardSun = scaled(skyAt(galaxy).sight, -1);
    expect(angleDeg(diskNormal(galaxy), towardSun)).toBeCloseTo(inclinationDeg, 9);
  });

  it.each(ORIENTATIONS)("devrait garder le grand axe, posé sur le ciel à l'angle de position, dans le plan du disque (%i°, %i°)", (inclinationDeg, positionAngleDeg) => {
    const galaxy = fixture({ inclinationDeg, positionAngleDeg });
    expect(dot(diskNormal(galaxy), majorAxisOnSky(galaxy))).toBeCloseTo(0, 12);
  });

  // Convention (le côté proche du disque n'est pas dans les données) : la normale penche vers l'angle de position + 90°.
  it("devrait pencher la normale vers l'est local quand un disque vu par la tranche a son grand axe nord-sud", () => {
    const galaxy = fixture({ inclinationDeg: 90, positionAngleDeg: 0 });
    expect(diskNormal(galaxy)).toEqual(closeTo(skyAt(galaxy).east, 12));
  });

  it("devrait pencher la normale vers le sud local quand un disque vu par la tranche a son grand axe est-ouest", () => {
    const galaxy = fixture({ inclinationDeg: 90, positionAngleDeg: 90 });
    expect(diskNormal(galaxy)).toEqual(closeTo(scaled(skyAt(galaxy).north, -1), 12));
  });

  it("devrait traiter une galaxie sans orientation publiée (irrégulière) comme vue de face", () => {
    const galaxy = fixture({ shape: "irregular", inclinationDeg: undefined, positionAngleDeg: undefined });
    expect(diskNormal(galaxy)).toEqual(closeTo(scaled(skyAt(galaxy).sight, -1), 12));
  });

  it("devrait rester définie au pôle nord céleste, où le nord local n'existe plus", () => {
    const galaxy = fixture({ raDeg: 0, decDeg: 90, inclinationDeg: 40, positionAngleDeg: 10 });
    const normal = diskNormal(galaxy);
    const towardSun = scaled(sceneFromEquatorial(0, 90), -1);
    expect([normal.x, normal.y, normal.z].every(Number.isFinite)).toBe(true);
    expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 12);
    expect(angleDeg(normal, towardSun)).toBeCloseTo(40, 9);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: Vec3 = { x: 99, y: 99, z: 99 };
    const result = diskNormal(fixture(), out);
    expect(result).toBe(out);
    expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(1, 12);
  });
});

describe("diskFrame", () => {
  it.each(ORIENTATIONS)("devrait former un repère orthonormé direct (grand axe, second axe, normale) pour %i° et %i°", (inclinationDeg, positionAngleDeg) => {
    const { major, minor, normal } = diskFrame(fixture({ inclinationDeg, positionAngleDeg }));
    for (const axis of [major, minor, normal]) expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1, 12);
    expect(dot(major, minor)).toBeCloseTo(0, 12);
    expect(dot(major, normal)).toBeCloseTo(0, 12);
    expect(dot(minor, normal)).toBeCloseTo(0, 12);
    expect(cross(major, minor)).toEqual(closeTo(normal, 12));
  });

  it("devrait poser le grand axe sur le ciel, à l'angle de position compté du nord vers l'est", () => {
    const galaxy = fixture({ inclinationDeg: 77, positionAngleDeg: 38 });
    expect(diskFrame(galaxy).major).toEqual(closeTo(majorAxisOnSky(galaxy), 12));
  });

  it("devrait rendre la même normale que diskNormal", () => {
    const galaxy = fixture({ inclinationDeg: 64, positionAngleDeg: 112 });
    expect(diskFrame(galaxy).normal).toEqual(closeTo(diskNormal(galaxy), 12));
  });
});

/** Les cinq galaxies que le voyage nomme d'office. */
const MAIN_KEYS: readonly LocalGroupGalaxyKey[] = ["milky-way", "large-magellanic-cloud", "small-magellanic-cloud", "andromeda", "triangulum"];

function galaxyOf(key: LocalGroupGalaxyKey): LocalGroupGalaxy {
  const galaxy = LOCAL_GROUP.find((candidate) => candidate.key === key);
  if (!galaxy) throw new Error(`Galaxie absente : ${key}`);
  return galaxy;
}

describe("LOCAL_GROUP", () => {
  it("devrait trier les galaxies par distance croissante, la Voie lactée en premier", () => {
    const distances = LOCAL_GROUP.map((galaxy) => galaxy.distanceMly);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(LOCAL_GROUP[0].key).toBe("milky-way");
  });

  it("devrait décrire chaque clé de LOCAL_GROUP_KEYS, une fois, dans le même ordre", () => {
    expect(LOCAL_GROUP.map((galaxy) => galaxy.key)).toEqual(LOCAL_GROUP_KEYS);
  });

  it("devrait donner à chaque galaxie une clé unique, en kebab-case ASCII", () => {
    const keys = LOCAL_GROUP.map((galaxy) => galaxy.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(MAIN_KEYS)("devrait contenir %s", (key) => {
    expect(LOCAL_GROUP.map((galaxy) => galaxy.key)).toContain(key);
  });

  it("devrait placer Andromède entre 2,4 et 2,6 millions d'al (Li et al. 2021 : 761 kpc)", () => {
    const { distanceMly } = galaxyOf("andromeda");
    expect(distanceMly).toBeGreaterThanOrEqual(2.4);
    expect(distanceMly).toBeLessThanOrEqual(2.6);
  });

  it("devrait reprendre pour la Voie lactée la distance de son centre et le rayon de son disque (galactic.ts)", () => {
    const milkyWay = galaxyOf("milky-way");
    expect(milkyWay.distanceMly * 1e6).toBeCloseTo(GALACTIC_CENTER_DISTANCE_LY, 6);
    expect(galaxyRadiusKly(milkyWay) * 1e3).toBeCloseTo(GALACTIC_DISK_RADIUS_LY, 6);
  });

  it("devrait poser la Voie lactée dans la direction du centre galactique (l = 0°, b = 0°, à 0,01° près)", () => {
    const { lDeg, bDeg } = galacticFromScene(galaxyCenterKly(galaxyOf("milky-way")));
    expect(Math.abs(((lDeg + 180) % 360) - 180)).toBeLessThan(0.01);
    expect(Math.abs(bDeg)).toBeLessThan(0.01);
  });

  it("devrait garder chaque galaxie, bord compris, à moins de 3 100 kly (précision float32 bien sous l'al)", () => {
    for (const galaxy of LOCAL_GROUP) {
      const center = galaxyCenterKly(galaxy);
      expect(Math.hypot(center.x, center.y, center.z) + galaxyRadiusKly(galaxy)).toBeLessThan(3100);
    }
  });

  it("devrait décrire des tailles, orientations et ellipticités plausibles", () => {
    for (const galaxy of LOCAL_GROUP) {
      expect(galaxy.diameterLy).toBeGreaterThan(1000);
      expect(galaxy.inclinationDeg ?? 0).toBeGreaterThanOrEqual(0);
      expect(galaxy.inclinationDeg ?? 0).toBeLessThanOrEqual(90);
      expect(galaxy.positionAngleDeg ?? 0).toBeGreaterThanOrEqual(0);
      expect(galaxy.positionAngleDeg ?? 0).toBeLessThan(360);
      expect(galaxy.ellipticity ?? 0).toBeGreaterThanOrEqual(0);
      expect(galaxy.ellipticity ?? 0).toBeLessThan(1);
    }
  });

  it("devrait donner une magnitude à chaque galaxie sauf la Voie lactée", () => {
    expect(LOCAL_GROUP.filter((galaxy) => galaxy.apparentMagV === null).map((galaxy) => galaxy.key)).toEqual(["milky-way"]);
  });

  it("devrait faire d'Andromède la plus lumineuse des galaxies dessinées, puis du Triangle", () => {
    const byLuminosity = LOCAL_GROUP.filter((galaxy) => galaxy.apparentMagV !== null)
      .sort((a, b) => (galaxyLuminosity(b) ?? 0) - (galaxyLuminosity(a) ?? 0))
      .map((galaxy) => galaxy.key);
    expect(byLuminosity.slice(0, 2)).toEqual(["andromeda", "triangulum"]);
  });

  it("devrait citer une source pour chaque galaxie", () => {
    for (const galaxy of LOCAL_GROUP) expect(galaxy.source.trim()).not.toBe("");
  });
});

describe("isLocalGroupGalaxyKey", () => {
  it.each(["andromeda", "milky-way", "wlm"])("devrait reconnaître « %s »", (key) => {
    expect(isLocalGroupGalaxyKey(key)).toBe(true);
  });

  it.each(["", "Andromeda", "andromède", "lg:andromeda", "m31"])("devrait refuser « %s »", (key) => {
    expect(isLocalGroupGalaxyKey(key)).toBe(false);
  });
});
