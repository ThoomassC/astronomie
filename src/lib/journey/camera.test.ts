import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import type { PlanetKey } from "@/lib/astro/planets";
import {
  angleDiff,
  blendCameras,
  cameraFor,
  RAIL_STOPS,
  railPercent,
  scrollState,
  sectionRanges,
  smootherstep,
  type CamState,
  type SectionRange,
  type StopCameraContext,
} from "@/lib/journey/camera";

const DEG = Math.PI / 180;

/** Deux angles désignent la même direction (égalité modulo 2π). */
function expectSameAngle(actual: number, expected: number, label = "angle") {
  expect(Math.cos(actual), `cos ${label}`).toBeCloseTo(Math.cos(expected), 9);
  expect(Math.sin(actual), `sin ${label}`).toBeCloseTo(Math.sin(expected), 9);
}

/** Compare deux caméras champ par champ ; l'azimut est comparé modulo 2π. */
function expectCamera(actual: CamState, expected: CamState) {
  expect(actual.tx, "tx").toBeCloseTo(expected.tx, 9);
  expect(actual.ty, "ty").toBeCloseTo(expected.ty, 9);
  expect(actual.tz, "tz").toBeCloseTo(expected.tz, 9);
  expect(actual.dist, "dist").toBeCloseTo(expected.dist, 9);
  expectSameAngle(actual.azim, expected.azim, "azim");
  expect(actual.elev, "elev").toBeCloseTo(expected.elev, 9);
  expect(actual.offX, "offX").toBeCloseTo(expected.offX, 9);
  expect(actual.offY, "offY").toBeCloseTo(expected.offY, 9);
  expect(actual.planet, "planet").toBe(expected.planet);
}

/** Contexte de scène minimal : positions et rayons fournis par le test, (1, 0, 0) et 1 sinon. */
function context({
  positions = {},
  radii = {},
  realScale = 0,
  portrait = false,
}: {
  positions?: Partial<Record<PlanetKey, Vec3>>;
  radii?: Partial<Record<PlanetKey, number>>;
  realScale?: number;
  portrait?: boolean;
} = {}): StopCameraContext {
  return {
    planetPosition: (key) => positions[key] ?? { x: 1, y: 0, z: 0 },
    planetRadius: (key) => radii[key] ?? 1,
    realScale,
    portrait,
  };
}

describe("cameraFor", () => {
  describe("vue d'ensemble (hero)", () => {
    it("devrait viser le centre de loin, cible décalée à droite, quand l'écran est en paysage", () => {
      expectCamera(cameraFor("hero", context()), {
        tx: 0, ty: 0, tz: 0, dist: 420, elev: 24 * DEG, azim: 206 * DEG, offX: 0.23, offY: 0.05, planet: false,
      });
    });

    it("devrait reculer de × 1,75, centrer et remonter la cible quand l'écran est en portrait", () => {
      expectCamera(cameraFor("hero", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 735, elev: 24 * DEG, azim: 206 * DEG, offX: 0, offY: -0.29, planet: false,
      });
    });
  });

  describe("Soleil", () => {
    it("devrait viser le centre avec les décalages par défaut quand l'écran est en paysage", () => {
      expectCamera(cameraFor("sun", context()), {
        tx: 0, ty: 0, tz: 0, dist: 46, elev: 8 * DEG, azim: 226 * DEG, offX: 0.17, offY: 0, planet: false,
      });
    });

    it("devrait reculer de × 1,45 quand l'écran est en portrait", () => {
      expectCamera(cameraFor("sun", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 66.7, elev: 8 * DEG, azim: 226 * DEG, offX: 0, offY: -0.21, planet: false,
      });
    });
  });

  describe("au-delà (beyond)", () => {
    it("devrait viser le centre de très loin et de haut quand l'écran est en paysage", () => {
      expectCamera(cameraFor("beyond", context()), {
        tx: 0, ty: 0, tz: 0, dist: 640, elev: 62 * DEG, azim: 206 * DEG, offX: 0.14, offY: 0, planet: false,
      });
    });

    it("devrait reculer de × 1,75 et remonter la cible de 0,1 quand l'écran est en portrait", () => {
      expectCamera(cameraFor("beyond", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 1120, elev: 62 * DEG, azim: 206 * DEG, offX: 0, offY: -0.1, planet: false,
      });
    });
  });

  describe("planète", () => {
    const earthCtx = { positions: { earth: { x: 34, y: 0, z: 0 } }, radii: { earth: 1.02 } };

    it("devrait viser la planète à k × rayon, 55° derrière elle, quand l'écran est en paysage", () => {
      expectCamera(cameraFor("earth", context(earthCtx)), {
        tx: 34, ty: 0, tz: 0, dist: 8.16, elev: 11 * DEG, azim: Math.PI + 55 * DEG, offX: 0.17, offY: 0, planet: true,
      });
    });

    it("devrait reculer de × 1,4 et remonter la cible quand l'écran est en portrait", () => {
      expectCamera(cameraFor("earth", context({ ...earthCtx, portrait: true })), {
        tx: 34, ty: 0, tz: 0, dist: 8.16 * 1.4, elev: 11 * DEG, azim: Math.PI + 55 * DEG, offX: 0, offY: -0.21, planet: true,
      });
    });

    it("devrait suivre la position 3D de la planète et l'élévation propre à l'escale (Saturne)", () => {
      const ctx = context({ positions: { saturn: { x: 0, y: 3, z: -90 } }, radii: { saturn: 2.8 } });
      expectCamera(cameraFor("saturn", ctx), {
        tx: 0, ty: 3, tz: -90, dist: 9.8 * 2.8, elev: 17 * DEG, azim: -Math.PI / 2 + Math.PI + 55 * DEG, offX: 0.17, offY: 0, planet: true,
      });
    });
  });

  describe("ceinture d'astéroïdes", () => {
    const marsCtx = { positions: { mars: { x: 0, y: 0, z: 39.16 } } };
    const theta = Math.PI / 2 - 0.55; // atan2(mars.z, mars.x) − 0,55
    const compressedBeltRadius = 12 + 22 * Math.sqrt(2.7); // sceneRadius(2,7, 0)

    it("devrait viser la ceinture à 2,7 UA, un peu en retrait de Mars, quand l'écran est en paysage", () => {
      expectCamera(cameraFor("belt", context(marsCtx)), {
        tx: compressedBeltRadius * Math.cos(theta),
        ty: 0,
        tz: compressedBeltRadius * Math.sin(theta),
        dist: 82,
        elev: 38 * DEG,
        azim: theta + Math.PI + 30 * DEG,
        offX: 0.17,
        offY: 0,
        planet: true,
      });
    });

    it("devrait reculer de × 1,3 et remonter la cible quand l'écran est en portrait", () => {
      const cam = cameraFor("belt", context({ ...marsCtx, portrait: true }));
      expect(cam.dist).toBeCloseTo(82 * 1.3, 9);
      expect(cam.offX).toBeCloseTo(0, 9);
      expect(cam.offY).toBeCloseTo(-0.21, 9);
    });

    it("devrait placer la cible au rayon de l'échelle réelle quand realScale = 1", () => {
      const realBeltRadius = 4.41 * 2.7;
      const cam = cameraFor("belt", context({ ...marsCtx, realScale: 1 }));
      expect(cam.tx).toBeCloseTo(realBeltRadius * Math.cos(theta), 9);
      expect(cam.tz).toBeCloseTo(realBeltRadius * Math.sin(theta), 9);
    });
  });

  it("devrait écrire dans out, le renvoyer et en écraser tous les champs quand out est fourni", () => {
    const out: CamState = { tx: 9, ty: 9, tz: 9, dist: 9, azim: 9, elev: 9, offX: 9, offY: 9, planet: true };
    const result = cameraFor("hero", context(), out);
    expect(result).toBe(out);
    expectCamera(out, {
      tx: 0, ty: 0, tz: 0, dist: 420, elev: 24 * DEG, azim: 206 * DEG, offX: 0.23, offY: 0.05, planet: false,
    });
  });

  it("ne devrait pas partager l'état renvoyé entre deux appels sans out", () => {
    const hero = cameraFor("hero", context());
    cameraFor("sun", context());
    expect(hero.dist).toBeCloseTo(420, 9);
  });
});

describe("angleDiff", () => {
  it.each([
    [0, Math.PI / 2, Math.PI / 2],
    [Math.PI / 2, 0, -Math.PI / 2],
    [0.1, 2 * Math.PI - 0.1, -0.2],
    [2 * Math.PI - 0.1, 0.1, 0.2],
    [3, -3, 2 * Math.PI - 6],
  ])("devrait donner le plus court écart signé de %f vers %f (%f)", (a, b, expected) => {
    expect(angleDiff(a, b)).toBeCloseTo(expected, 12);
  });

  it.each([
    [0, 4 * Math.PI + 0.5, 0.5],
    [-3 * Math.PI, 0.3, 0.3 - Math.PI],
  ])("devrait ignorer les tours complets (%f → %f : %f)", (a, b, expected) => {
    expect(angleDiff(a, b)).toBeCloseTo(expected, 9);
  });

  it.each([
    [0, Math.PI],
    [0, -Math.PI],
    [Math.PI, 0],
  ])("devrait renvoyer +π, borne incluse de ]−π, π], pour deux directions opposées (%f → %f)", (a, b) => {
    expect(angleDiff(a, b)).toBeCloseTo(Math.PI, 12);
  });
});

describe("smootherstep", () => {
  it.each([
    [0, 0],
    [0.25, 0.103515625],
    [0.5, 0.5],
    [0.75, 0.896484375],
    [1, 1],
  ])("devrait suivre 6t⁵ − 15t⁴ + 10t³ (t = %f → %f)", (t, expected) => {
    expect(smootherstep(t)).toBeCloseTo(expected, 12);
  });

  it.each([
    [-0.5, 0],
    [1.5, 1],
  ])("devrait borner t à [0, 1] (t = %f → %f)", (t, expected) => {
    expect(smootherstep(t)).toBeCloseTo(expected, 12);
  });
});

describe("blendCameras", () => {
  const cam = (over: Partial<CamState> = {}): CamState => ({
    tx: 0, ty: 0, tz: 0, dist: 100, azim: 0, elev: 0.2, offX: 0, offY: 0, planet: false, ...over,
  });
  /** Caméra qui vise une planète à `radius` du Soleil, dans la direction `angle` du plan xz. */
  const planetCam = (angle: number, radius: number, over: Partial<CamState> = {}): CamState =>
    cam({ tx: radius * Math.cos(angle), tz: radius * Math.sin(angle), planet: true, ...over });

  const A = planetCam(0.4, 34, { ty: 1, dist: 8.16, azim: 4.1, elev: 0.19, offX: 0.17, offY: 0 });
  const B = cam({ tx: -40, ty: -2, tz: 25, dist: 27, azim: 1.2, elev: 0.3, offX: 0, offY: -0.21, planet: false });

  it("devrait renvoyer la caméra de départ quand t = 0", () => {
    expectCamera(blendCameras(A, B, 0), A);
  });

  it("devrait renvoyer la caméra d'arrivée quand t = 1", () => {
    expectCamera(blendCameras(A, B, 1), B);
  });

  it("devrait reculer de × 3,2 la moyenne géométrique des distances à mi-vol entre deux planètes opposées", () => {
    const from = planetCam(0, 34, { dist: 8 });
    const to = planetCam(Math.PI, 50, { dist: 18 });
    const mid = blendCameras(from, to, 0.5);
    expect(mid.dist).toBeCloseTo(Math.sqrt(8 * 18) * (1 + 2.2), 9);
  });

  it("devrait relever la caméra de 0,32 rad à mi-vol entre deux planètes opposées", () => {
    const from = planetCam(0, 34, { elev: 0.2 });
    const to = planetCam(Math.PI, 50, { elev: 0.4 });
    expect(blendCameras(from, to, 0.5).elev).toBeCloseTo(0.3 + 0.32, 9);
  });

  it("devrait doser le recul selon l'écart angulaire des cibles, pas des azimuts (quart de tour → hop 0,65)", () => {
    const from = planetCam(0, 34, { dist: 8, azim: 1 });
    const to = planetCam(Math.PI / 2, 50, { dist: 18, azim: 1 });
    expect(blendCameras(from, to, 0.5).dist).toBeCloseTo(Math.sqrt(8 * 18) * (1 + 2.2 * 0.65), 9);
  });

  it("devrait reculer de 44 % de la moyenne géométrique à mi-vol quand une des cibles n'est pas une planète", () => {
    const from = cam({ dist: 100, planet: false });
    const to = planetCam(1, 34, { dist: 400 });
    expect(blendCameras(from, to, 0.5).dist).toBeCloseTo(200 * (1 + 2.2 * 0.2), 9);
  });

  it("devrait faire partir la cible dans la direction de b quand a vise le centre", () => {
    const mid = blendCameras(cam(), planetCam(2, 34), 0.5);
    expect(mid.tx).toBeCloseTo(17 * Math.cos(2), 9);
    expect(mid.tz).toBeCloseTo(17 * Math.sin(2), 9);
  });

  it("devrait garder la direction de a quand b vise le centre", () => {
    const mid = blendCameras(planetCam(2, 34), cam(), 0.5);
    expect(mid.tx).toBeCloseTo(17 * Math.cos(2), 9);
    expect(mid.tz).toBeCloseTo(17 * Math.sin(2), 9);
  });

  it("devrait traiter comme centrale une cible à moins de 0,01 du Soleil", () => {
    const mid = blendCameras(cam({ tx: 0.005 }), planetCam(2, 34), 0.5);
    const radius = (0.005 + 34) / 2;
    expect(mid.tx).toBeCloseTo(radius * Math.cos(2), 9);
    expect(mid.tz).toBeCloseTo(radius * Math.sin(2), 9);
  });

  it("devrait laisser la cible au centre quand les deux caméras visent le Soleil", () => {
    const mid = blendCameras(cam({ dist: 420 }), cam({ dist: 46 }), 0.5);
    expect(mid.tx).toBeCloseTo(0, 9);
    expect(mid.tz).toBeCloseTo(0, 9);
  });

  it("devrait faire tourner la cible autour du Soleil par le plus court chemin", () => {
    const mid = blendCameras(planetCam(3, 40), planetCam(-3, 40), 0.5);
    expect(mid.tx).toBeCloseTo(-40, 9);
    expect(mid.tz).toBeCloseTo(0, 9);
  });

  it("devrait faire tourner l'azimut par le plus court chemin (3,1 → −3,1 passe par π)", () => {
    const mid = blendCameras(cam({ azim: 3.1 }), cam({ azim: -3.1 }), 0.5);
    expectSameAngle(mid.azim, Math.PI, "azim");
  });

  it("devrait interpoler linéairement la hauteur de cible et les décalages d'écran", () => {
    const quarter = blendCameras(cam({ ty: 2, offX: 0.2, offY: 0 }), cam({ ty: -2, offX: 0, offY: -0.2 }), 0.25);
    expect(quarter.ty).toBeCloseTo(1, 12);
    expect(quarter.offX).toBeCloseTo(0.15, 12);
    expect(quarter.offY).toBeCloseTo(-0.05, 12);
  });

  it.each([
    [0.49, true],
    [0.5, false],
  ])("devrait basculer le drapeau planet à mi-vol (t = %f → %s)", (t, expected) => {
    expect(blendCameras(cam({ planet: true }), cam({ planet: false }), t).planet).toBe(expected);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out = cam({ tx: 9, ty: 9, tz: 9, dist: 9, azim: 9, elev: 9, offX: 9, offY: 9, planet: true });
    const result = blendCameras(A, B, 0.3, out);
    expect(result).toBe(out);
    expectCamera(out, blendCameras(A, B, 0.3));
  });

  it("ne devrait modifier ni a ni b", () => {
    const a = cam({ tx: 34, dist: 8, planet: true });
    const b = cam({ tz: 50, dist: 18, planet: true });
    blendCameras(a, b, 0.4);
    expect(a).toEqual(cam({ tx: 34, dist: 8, planet: true }));
    expect(b).toEqual(cam({ tz: 50, dist: 18, planet: true }));
  });
});

describe("sectionRanges", () => {
  const HERO = { key: "hero", top: 0, height: 900 } as const;
  const SUN = { key: "sun", top: 900, height: 1500 } as const;

  it("devrait faire arriver la première section à 0 et les suivantes 12 % de vue avant leur haut", () => {
    expect(sectionRanges([HERO, SUN], 800)).toEqual([
      { key: "hero", arrive: 0, depart: 100 },
      { key: "sun", arrive: expect.closeTo(804, 9), depart: 1600 },
    ]);
  });

  it("devrait repartir dès l'arrivée quand la section est plus courte que la vue", () => {
    const [, , short] = sectionRanges([HERO, SUN, { key: "mercury", top: 2400, height: 500 }], 800);
    expect(short).toEqual({ key: "mercury", arrive: expect.closeTo(2304, 9), depart: expect.closeTo(2304, 9) });
  });

  it("devrait faire arriver la première section à 0 même quand elle ne commence pas en haut du document", () => {
    expect(sectionRanges([{ key: "hero", top: 120, height: 900 }], 800)).toEqual([
      { key: "hero", arrive: 0, depart: 220 },
    ]);
  });

  it("devrait renvoyer une liste vide quand il n'y a aucune section", () => {
    expect(sectionRanges([], 800)).toEqual([]);
  });
});

describe("scrollState", () => {
  const RANGES: readonly SectionRange[] = [
    { key: "hero", arrive: 0, depart: 100 },
    { key: "sun", arrive: 804, depart: 1600 },
  ];

  it.each([[-40], [50], [100]])("devrait rester au repos sur la première escale quand y = %f ≤ depart", (y) => {
    expect(scrollState(RANGES, y)).toEqual({ from: 0, to: 0, t: 0 });
  });

  it("devrait voler à mi-chemin vers l'escale suivante quand y est au milieu de l'intervalle depart → arrive", () => {
    expect(scrollState(RANGES, 452)).toEqual({ from: 0, to: 1, t: 0.5 });
  });

  it("devrait commencer le vol dès que y dépasse depart", () => {
    expect(scrollState(RANGES, 101)).toEqual({ from: 0, to: 1, t: expect.closeTo(1 / 704, 12) });
  });

  it.each([[804], [900], [5000]])("devrait être au repos sur la dernière escale quand y = %f ≥ son arrivée", (y) => {
    expect(scrollState(RANGES, y)).toEqual({ from: 1, to: 1, t: 0 });
  });

  it("devrait voler depuis une escale intermédiaire vers la suivante", () => {
    const three: SectionRange[] = [...RANGES, { key: "mercury", arrive: 2304, depart: 2304 }];
    expect(scrollState(three, 1952)).toEqual({ from: 1, to: 2, t: 0.5 });
  });

  it("devrait diviser par au moins 1 px quand deux escales sont séparées de moins d'un pixel", () => {
    const tight: SectionRange[] = [
      { key: "hero", arrive: 0, depart: 100 },
      { key: "sun", arrive: 100.5, depart: 300 },
    ];
    expect(scrollState(tight, 100.25)).toEqual({ from: 0, to: 1, t: expect.closeTo(0.25, 12) });
  });

  it("devrait renvoyer {0, 0, 0} quand la liste est vide", () => {
    expect(scrollState([], 500)).toEqual({ from: 0, to: 0, t: 0 });
  });
});

describe("railPercent", () => {
  it("devrait placer 0 UA (le Soleil) à 2 %", () => {
    expect(railPercent(0)).toBe(2);
  });

  it.each([
    [0.3, 6],
    [1, 26.7095],
    [50, 94],
  ])("devrait suivre l'échelle logarithmique 6 + 88 × ln(au / 0,3) / ln(50 / 0,3) (%f UA → %f %%)", (au, expected) => {
    expect(railPercent(au)).toBeCloseTo(expected, 4);
  });

  const consecutiveStops = RAIL_STOPS.slice(1).map((stop, i) => [RAIL_STOPS[i].key, stop.key, RAIL_STOPS[i].au, stop.au] as const);

  it.each(consecutiveStops)("devrait placer %s avant %s sur la règle", (_inner, _outer, innerAu, outerAu) => {
    expect(railPercent(outerAu)).toBeGreaterThan(railPercent(innerAu));
  });
});
