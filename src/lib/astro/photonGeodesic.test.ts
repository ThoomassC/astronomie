import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import {
  BLACKBODY_FIT,
  DESKTOP_RAY_STEPS,
  LITE_RAY_STEPS,
  START_IMPACT_RATIO,
  WEAK_DEFLECTION_SERIES,
  blackbodyColor,
  deflectionAtInfinity,
  diskRedshift,
  diskTemperatureRatio,
  flowRedshift,
  observedImpact,
  rayStep,
  shadowAngularRadius,
  startRay,
  traceRay,
  weakDeflection,
  type DiskPlane,
  type RayStepOptions,
} from "@/lib/astro/photonGeodesic";
import { ISCO_RS, SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";

/*
 * Modèle exécutable du shader des trous noirs (r_s = 1, repère du trou noir) : départ du tracé depuis la caméra,
 * schéma de Verlet sur a = −1,5 h² x / |x|⁵, traversées du disque, décalages spectraux, lentille faible du fond et
 * couleur de corps noir. Références : intégration fine (pas de 0,002 r, départ et sortie lointains), formule de Synge
 * pour l'ombre vue à distance finie, table des couleurs de corps noir de la fiche documentaire (CIE 1931, sRGB D65).
 */

const PRESETS: [string, RayStepOptions][] = [
  ["ordinateur", DESKTOP_RAY_STEPS],
  ["allégé", LITE_RAY_STEPS],
];
/** Intégration fine : la référence de tous les écarts mesurés ici. */
const FINE: RayStepOptions = {
  stepFactor: 0.002,
  minStep: 0.0005,
  maxStep: 20,
  farStepFactor: 0.002,
  maxSteps: 5_000_000,
  maxCrossings: 8,
};

const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const angleBetween = (a: Vec3, b: Vec3) => Math.atan2(length(cross(a, b)), dot(a, b));

/** Caméra sur l'axe z, à `distance` r_s ; direction vers le trou noir, écartée de `angle` radians vers +x. */
const camera = (distance: number) => v3(0, 0, distance);
const aimed = (angle: number) => v3(Math.sin(angle), 0, -Math.cos(angle));

/** Trace depuis la caméra comme le shader : départ (startRay), puis le tracé jusqu'à la sphère de sortie. */
function fromCamera(cameraLocal: Vec3, direction: Vec3, steps: RayStepOptions, quadRs = 10, disk: DiskPlane | null = null) {
  const start = startRay(cameraLocal, direction, quadRs);
  return traceRay(start.position, start.velocity, start.escapeRs, disk, steps, quadRs);
}

/** Direction finale (à l'infini) d'un rayon échappé, sinon null. */
function escapedDirection(result: ReturnType<typeof traceRay>): Vec3 | null {
  return result.outcome.kind === "escaped" ? result.outcome.direction : null;
}

describe("WEAK_DEFLECTION_SERIES et deflectionAtInfinity", () => {
  it("devrait reprendre la série de champ faible jusqu'au quatrième ordre (Keeton et Petters 2005, M = r_s/2)", () => {
    expect(WEAK_DEFLECTION_SERIES[0]).toBe(2);
    expect(WEAK_DEFLECTION_SERIES[1]).toBeCloseTo((15 * Math.PI) / 16, 15);
    expect(WEAK_DEFLECTION_SERIES[2]).toBeCloseTo(16 / 3, 15);
    expect(WEAK_DEFLECTION_SERIES[3]).toBeCloseTo((3465 * Math.PI) / 1024, 15);
  });

  it("devrait tendre vers la déviation d'Einstein 2 r_s/b loin du trou noir", () => {
    expect(Math.abs(deflectionAtInfinity(1000) / (2 / 1000) - 1)).toBeLessThan(0.002);
    expect(Math.abs(deflectionAtInfinity(100) / (2 / 100) - 1)).toBeLessThan(0.016);
  });

  it.each([
    [10, 0.2361],
    [20, 0.1081],
  ])("devrait suivre l'intégration fine à b = %f r_s (%f rad) à 0,3 % près", (b, reference) => {
    expect(Math.abs(deflectionAtInfinity(b) / reference - 1)).toBeLessThan(0.003);
  });
});

describe("weakDeflection", () => {
  it("devrait donner toute la déviation à une caméra très lointaine, la moitié au périastre, rien après", () => {
    expect(weakDeflection(8, -1e9)).toBeCloseTo(deflectionAtInfinity(8), 9);
    expect(weakDeflection(8, 0)).toBeCloseTo(deflectionAtInfinity(8) / 2, 12);
    expect(weakDeflection(8, 1e9)).toBeLessThan(1e-15);
  });

  it("devrait rester continue au périastre et positive sans perte de précision loin derrière", () => {
    expect(weakDeflection(5, -1e-9)).toBeCloseTo(weakDeflection(5, 1e-9), 9);
    // Au-delà du périastre : α∞ b² / (4 s²) quand s ≫ b, sans soustraction de deux nombres voisins.
    expect(weakDeflection(10, 1e7) / ((deflectionAtInfinity(10) * 100) / (4 * 1e14))).toBeCloseTo(1, 6);
  });

  it.each([
    [60, 8],
    [60, 10],
    [60, 14],
    [40, 10],
  ])(
    "devrait suivre le tracé fin depuis une caméra à %f r_s (b = %f r_s) à 1 % près, paramètre d'impact de l'observateur",
    (distance, b) => {
      const cameraLocal = camera(distance);
      const direction = aimed(Math.asin(b / distance));
      const fine = escapedDirection(fromCamera(cameraLocal, direction, FINE, 1e4));
      expect(fine).not.toBeNull();
      const traced = angleBetween(direction, fine ?? direction);
      const weak = weakDeflection(observedImpact(cameraLocal, direction), dot(cameraLocal, direction));
      expect(Math.abs(weak / traced - 1)).toBeLessThan(0.01);
    },
  );

  it("devrait suivre le tracé fin à 3 % près même depuis une caméra à 15 r_s", () => {
    const cameraLocal = camera(15);
    const direction = aimed(Math.asin(10 / 15));
    const fine = escapedDirection(fromCamera(cameraLocal, direction, FINE, 1e4));
    const traced = angleBetween(direction, fine ?? direction);
    const weak = weakDeflection(observedImpact(cameraLocal, direction), dot(cameraLocal, direction));
    expect(Math.abs(weak / traced - 1)).toBeLessThan(0.03);
  });
});

describe("observedImpact", () => {
  it("devrait tenir compte de l'observateur immobile : b = D sin θ / √(1 − 1/D)", () => {
    const angle = 0.1;
    expect(observedImpact(camera(40), aimed(angle))).toBeCloseTo((40 * Math.sin(angle)) / Math.sqrt(1 - 1 / 40), 12);
  });
});

describe("shadowAngularRadius", () => {
  it("devrait valoir 45° à 3 r_s : sin α = (√27/2) √(1 − 1/D) / D (Synge 1966)", () => {
    expect(shadowAngularRadius(3)).toBeCloseTo(Math.PI / 4, 12);
  });

  it("devrait tendre vers √27/2 / D de loin", () => {
    expect(shadowAngularRadius(1e6) * 1e6).toBeCloseTo(SHADOW_RADIUS_RS, 5);
  });
});

describe("startRay", () => {
  it("devrait conserver le paramètre d'impact de l'observateur et l'énergie |v|² = 1 + b²/r³ au départ du tracé", () => {
    const cameraLocal = camera(500);
    const direction = aimed(0.008);
    const start = startRay(cameraLocal, direction, 10);
    const b = observedImpact(cameraLocal, direction);
    expect(start.impact).toBeCloseTo(b, 12);
    expect(length(cross(start.position, start.velocity))).toBeCloseTo(b, 10);
    const r = length(start.position);
    expect(dot(start.velocity, start.velocity)).toBeCloseTo(1 + (b * b) / r ** 3, 10);
    // Départ sur la sphère max(R_q, 3 b), en approche.
    expect(r).toBeCloseTo(Math.max(10, START_IMPACT_RATIO * b), 9);
    expect(dot(start.position, start.velocity)).toBeLessThan(0);
  });

  it("devrait partir de la caméra elle-même quand elle est déjà dans la sphère de départ", () => {
    const cameraLocal = v3(1, 2, 6);
    const start = startRay(cameraLocal, aimed(0.3), 10);
    expect(start.position).toEqual(cameraLocal);
    expect(start.escapeRs).toBe(Math.max(10, START_IMPACT_RATIO * start.impact));
  });
});

describe("rayStep", () => {
  it("devrait faire des pas proportionnels à r, bornés dans la sphère tracée, plus longs au-delà", () => {
    expect(rayStep(5, 10, DESKTOP_RAY_STEPS)).toBeCloseTo(0.4, 12);
    expect(rayStep(0.1, 10, DESKTOP_RAY_STEPS)).toBe(DESKTOP_RAY_STEPS.minStep);
    expect(rayStep(9.9, 10, LITE_RAY_STEPS)).toBeCloseTo(0.99, 12);
    expect(rayStep(30, 10, DESKTOP_RAY_STEPS)).toBeCloseTo(30 * DESKTOP_RAY_STEPS.farStepFactor, 12);
  });
});

describe.each(PRESETS)("traceRay (%s)", (_name, steps) => {
  it("devrait capturer b = 2,55 r_s et laisser échapper b = 2,65 r_s, départ sur la sphère de 15 r_s", () => {
    const direction = v3(0, 0, -1);
    for (const [b, kind] of [
      [2.55, "captured"],
      [2.65, "escaped"],
    ] as const) {
      const start = startRay(v3(b, 0, 1e5), direction, 15);
      expect(traceRay(start.position, start.velocity, start.escapeRs, null, steps, 15).outcome.kind).toBe(kind);
    }
  });

  it("devrait capturer la lumière jusqu'à √27/2 r_s à 0,5 % près (balayage au pas de 0,002)", () => {
    // Plus grand b capturé (r < 1) ; juste au-delà, un rayon tourne autour de la sphère des photons et peut finir
    // « inachevé » faute de pas : le shader le peint en anneau, sans ciel.
    let captured = 0;
    for (let b = 2.5; b < 2.7; b += 0.002) {
      const start = startRay(v3(b, 0, 1e5), v3(0, 0, -1), 15);
      if (traceRay(start.position, start.velocity, start.escapeRs, null, steps, 15).outcome.kind === "captured") captured = b;
    }
    expect(Math.abs(captured / SHADOW_RADIUS_RS - 1)).toBeLessThan(0.005);
  });

  it.each([15, 40, 1000])(
    "devrait dessiner l'ombre vue d'une caméra à %f r_s au rayon angulaire de Synge, à 0,5 % près",
    (distance) => {
      const expected = shadowAngularRadius(distance);
      let edge = 0;
      for (let k = 0; k < 200; k++) {
        const angle = expected * (0.98 + k * 0.0002);
        if (escapedDirection(fromCamera(camera(distance), aimed(angle), steps)) !== null) {
          edge = angle;
          break;
        }
      }
      expect(Math.abs(edge / expected - 1)).toBeLessThan(0.005);
    },
  );

  it.each([
    [3, 1.7194],
    [5, 0.5904],
    [10, 0.2361],
  ])("devrait dévier de %f r_s un rayon venu de 2 000 r_s comme l'intégration fine (%f rad) à 1 % près", (b, reference) => {
    const start = startRay(v3(b, 0, 2000), v3(0, 0, -1), 2000);
    const result = traceRay(start.position, start.velocity, 2000, null, { ...steps, maxSteps: 4000 }, 10);
    const direction = escapedDirection(result);
    expect(direction).not.toBeNull();
    expect(Math.abs(angleBetween(v3(0, 0, -1), direction ?? v3(0, 0, -1)) / reference - 1)).toBeLessThan(0.01);
  });

  it.each([4, 6, 8, 9.7])("devrait suivre le tracé fin depuis une caméra à 40 r_s (b = %f r_s) à 3 mrad près", (b) => {
    const direction = aimed(Math.asin(b / 40));
    const traced = escapedDirection(fromCamera(camera(40), direction, steps));
    const fine = escapedDirection(fromCamera(camera(40), direction, FINE, 1e4));
    expect(traced).not.toBeNull();
    expect(angleBetween(traced ?? direction, fine ?? direction)).toBeLessThan(3e-3);
  });

  it("devrait voir, par la tranche, l'image du disque passer derrière le trou noir au-dessus et au-dessous de l'ombre", () => {
    // Disque de normale +y, caméra sur +z : visé 0,5 r_s au-dessus puis au-dessous du bord de l'ombre.
    for (const side of [1, -1]) {
      const start = startRay(v3(0, side * (SHADOW_RADIUS_RS + 0.5), 1e5), v3(0, 0, -1), 15);
      const disk: DiskPlane = { normal: v3(0, 1, 0), innerRs: 1, outerRs: 100 };
      const { crossings } = traceRay(start.position, start.velocity, start.escapeRs, disk, steps, 15);
      expect(crossings.some((crossing) => crossing.position.z < 0)).toBe(true);
    }
  });

  it("ne devrait jamais dépasser maxSteps ni produire de NaN, de b = 0 à 15 r_s", () => {
    for (let b = 0; b <= 15; b += 0.25) {
      const disk: DiskPlane = { normal: v3(0, 0.94, 0.34), innerRs: ISCO_RS, outerRs: 8 };
      const result = fromCamera(camera(60), aimed(Math.asin(b / 60)), steps, 10, disk);
      expect(result.outcome.steps).toBeLessThanOrEqual(steps.maxSteps);
      for (const crossing of result.crossings) expect(Number.isFinite(crossing.radiusRs)).toBe(true);
      const direction = escapedDirection(result);
      if (direction) expect([direction.x, direction.y, direction.z].every(Number.isFinite)).toBe(true);
    }
  });

  it("devrait respecter la symétrie miroir : b et −b donnent des directions finales symétriques", () => {
    const right = escapedDirection(fromCamera(camera(40), aimed(0.12), steps));
    const left = escapedDirection(fromCamera(camera(40), aimed(-0.12), steps));
    expect(right).not.toBeNull();
    expect(left?.x).toBeCloseTo(-(right?.x ?? 0), 12);
    expect(left?.z).toBeCloseTo(right?.z ?? 0, 12);
  });

  it("devrait être invariant par rotation : caméra et direction tournées, direction finale tournée", () => {
    // Quart de tour autour de z : (x, y, z) → (−y, x, z).
    const turn = (p: Vec3) => v3(-p.y, p.x, p.z);
    const cameraLocal = v3(3, -4, 39);
    const direction = v3(0.05, 0.13, -0.99);
    const norm = length(direction);
    const unit = v3(direction.x / norm, direction.y / norm, direction.z / norm);
    const reference = escapedDirection(fromCamera(cameraLocal, unit, steps));
    const turned = escapedDirection(fromCamera(turn(cameraLocal), turn(unit), steps));
    expect(reference).not.toBeNull();
    expect(angleBetween(turned ?? unit, turn(reference ?? unit))).toBeLessThan(1e-9);
  });
});

describe("diskRedshift", () => {
  /** Vitesse affine d'un photon au point `p`, de paramètre d'impact b, dans le plan du disque (normale +z). */
  function photonAt(p: Vec3, tangential: number, radial: number): Vec3 {
    const r = length(p);
    return v3((p.x / r) * radial - (p.y / r) * tangential, (p.y / r) * radial + (p.x / r) * tangential, 0);
  }

  it("devrait donner g = √(1 − 1,5/r) quand le photon part perpendiculairement au mouvement : √0,5 à l'ISCO", () => {
    const p = v3(ISCO_RS, 0, 0);
    expect(diskRedshift(p, photonAt(p, 0, 1), v3(0, 0, 1))).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it("devrait rendre plus énergétique le côté qui s'approche à r = 6, moins celui qui s'éloigne", () => {
    const p = v3(6, 0, 0);
    // Le gaz tourne dans le sens direct autour de +z : en (6, 0, 0) il va vers +y. Le rayon tracé va à l'inverse de
    // la lumière : remonter vers −y, c'est regarder du gaz qui vient vers soi.
    const approaching = diskRedshift(p, photonAt(p, -1, 0), v3(0, 0, 1));
    const receding = diskRedshift(p, photonAt(p, 1, 0), v3(0, 0, 1));
    expect(approaching).toBeGreaterThan(1);
    expect(receding).toBeLessThan(1);
    // Formule fermée : g = √(1 − 1,5/r) / (1 + L_z Ω), Ω = (2r³)^−½, L_z = ±r |v_t|.
    expect(approaching).toBeCloseTo(Math.sqrt(0.75) / (1 - 6 / Math.sqrt(2 * 216)), 12);
  });
});

describe("flowRedshift", () => {
  it("devrait se réduire au décalage gravitationnel seul pour un gaz immobile : √(1 − 1/r)", () => {
    expect(flowRedshift(v3(0, 2, 1), v3(0.3, -1, 0.2), v3(0, 0, 1), 0)).toBeCloseTo(Math.sqrt(1 - 1 / Math.sqrt(5)), 12);
  });

  it("devrait retrouver le disque képlérien dans son plan, rotation 1", () => {
    const p = v3(4, 3, 0);
    const v = v3(-0.4, 0.9, 0.1);
    expect(flowRedshift(p, v, v3(0, 0, 1), 1)).toBeCloseTo(diskRedshift(p, v, v3(0, 0, 1)), 12);
  });
});

describe("diskTemperatureRatio", () => {
  it("devrait s'annuler au bord intérieur et culminer à 1 en r = 49/36 r_in", () => {
    expect(diskTemperatureRatio(ISCO_RS, ISCO_RS)).toBe(0);
    expect(diskTemperatureRatio((49 / 36) * ISCO_RS, ISCO_RS)).toBeCloseTo(1, 12);
    expect(diskTemperatureRatio(1.3 * ISCO_RS, ISCO_RS)).toBeLessThan(1);
    expect(diskTemperatureRatio(1.45 * ISCO_RS, ISCO_RS)).toBeLessThan(1);
  });

  it("devrait décroître en r^(−3/4) loin du bord intérieur", () => {
    expect(diskTemperatureRatio(2000, 3) / diskTemperatureRatio(1000, 3)).toBeCloseTo(2 ** -0.75, 2);
  });
});

describe("blackbodyColor", () => {
  /** Couleur linéaire → « #rrggbb » sRGB, canal le plus fort à 255 (convention de la fiche documentaire). */
  function hex(rgb: readonly number[]): number[] {
    const peak = Math.max(...rgb);
    return rgb.map((c) => {
      const x = Math.max(0, c) / peak;
      return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
    });
  }
  const channels = (srgb: string) => [1, 3, 5].map((i) => parseInt(srgb.slice(i, i + 2), 16));

  it.each([
    [3_500, "#ffc88c"],
    [4_300, "#ffdab3"],
    [5_772, "#fff1ea"],
    [10_000, "#cdd9ff"],
    [20_000, "#abc1ff"],
    [29_000, "#a3bbff"],
    [40_000, "#9fb8ff"],
    [1e6, "#95b1ff"],
  ])("devrait donner à %f K la chromaticité de la fiche (%s) à 2/255 près", (temperature, srgb) => {
    const got = hex(blackbodyColor(temperature));
    channels(srgb).forEach((channel, i) => expect(Math.abs(got[i] - channel)).toBeLessThanOrEqual(2));
  });

  it("devrait être de luminance 1 : l'éclat se règle à part, la couleur ne dit que la température", () => {
    for (const temperature of [1500, 3000, 6500, 25_000, 1e7]) {
      const [r, g, b] = blackbodyColor(temperature);
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeCloseTo(1, 9);
      expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(0);
    }
  });

  it("devrait bleuir quand la température monte : le côté qui s'approche, plus chaud à l'œil, est plus bleu", () => {
    const blueness = (temperature: number) => {
      const [r, , b] = blackbodyColor(temperature);
      return b / r;
    };
    expect(blueness(1.3 * 8000)).toBeGreaterThan(blueness(8000));
    expect(blueness(8000)).toBeGreaterThan(blueness(0.7 * 8000));
  });

  it("devrait tendre vers la limite de Rayleigh-Jeans, et exposer les constantes que reprend le GLSL", () => {
    const limit = blackbodyColor(1e12);
    const far = blackbodyColor(1e9);
    limit.forEach((c, i) => expect(c).toBeCloseTo(far[i], 4));
    expect(BLACKBODY_FIT.minTemperatureK).toBeGreaterThanOrEqual(1000);
  });
});
