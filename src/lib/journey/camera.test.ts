import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import type { PlanetKey } from "@/lib/astro/planets";
import {
  angleDiff,
  blendCameras,
  cameraFor,
  clampToRest,
  freeBand,
  RAIL_STOPS,
  railPercent,
  restProgress,
  restRange,
  scrollState,
  sectionRanges,
  smootherstep,
  type CamState,
  type ScreenBand,
  type ScreenZone,
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
  aspect = 16 / 9,
  fov = 36,
  band,
  zone,
}: {
  positions?: Partial<Record<PlanetKey, Vec3>>;
  radii?: Partial<Record<PlanetKey, number>>;
  realScale?: number;
  portrait?: boolean;
  aspect?: number;
  fov?: number;
  band?: ScreenBand;
  zone?: ScreenZone;
} = {}): StopCameraContext {
  return {
    planetPosition: (key) => positions[key] ?? { x: 1, y: 0, z: 0 },
    planetRadius: (key) => radii[key] ?? 1,
    realScale,
    portrait,
    aspect,
    fov,
    band: band ? () => band : undefined,
    zone: zone ? () => zone : undefined,
  };
}

const tanHalf = (fov: number) => Math.tan((fov * DEG) / 2);
/** Diamètre apparent d'une sphère, en fraction de la hauteur d'écran. */
const heightShare = (radius: number, dist: number, fov: number) => Math.tan(Math.asin(radius / dist)) / tanHalf(fov);
/** Demi-largeur apparente (anneaux compris), en fraction de la demi-largeur d'écran. */
const widthShare = (extent: number, dist: number, fov: number, aspect: number) =>
  Math.tan(Math.asin(extent / dist)) / (tanHalf(fov) * aspect);

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

describe("cameraFor en mise en page mobile (bande libre mesurée)", () => {
  /** iPhone 375 × 812 : barre haute jusqu'à 8 %, plaque compacte à partir de 53 %. */
  const PHONE = { aspect: 375 / 812, fov: 50, band: { top: 0.08, bottom: 0.53 } };
  /** iPhone SE dans Safari (375 × 553) : la plaque commence à 31 % de la hauteur. */
  const SHORT_PHONE = { aspect: 375 / 553, fov: 50, band: { top: 0.12, bottom: 0.31 } };
  const earth = { positions: { earth: { x: 34, y: 0, z: 0 } }, radii: { earth: 1.02 } };

  it("devrait centrer l'astre dans la bande libre, au milieu de l'écran en largeur", () => {
    const cam = cameraFor("earth", context({ ...earth, portrait: true, ...PHONE }));
    expect(cam.offX).toBe(0);
    expect(cam.offY).toBeCloseTo((0.08 + 0.53) / 2 - 0.5, 9);
  });

  it("devrait remplir la bande ou la largeur au plus près, sans déborder de l'une ni de l'autre", () => {
    const cam = cameraFor("earth", context({ ...earth, portrait: true, ...PHONE }));
    const height = heightShare(1.02, cam.dist, PHONE.fov) / (0.9 * (PHONE.band.bottom - PHONE.band.top));
    const width = widthShare(1.02, cam.dist, PHONE.fov, PHONE.aspect) / 0.8;
    expect(Math.max(height, width)).toBeCloseTo(1, 9);
  });

  it("devrait rapetisser l'astre sur un écran court pour qu'il reste au-dessus de la plaque", () => {
    const tall = cameraFor("earth", context({ ...earth, portrait: true, ...PHONE }));
    const short = cameraFor("earth", context({ ...earth, portrait: true, ...SHORT_PHONE }));
    expect(short.dist).toBeGreaterThan(tall.dist);
    expect(heightShare(1.02, short.dist, SHORT_PHONE.fov)).toBeLessThanOrEqual(0.9 * 0.19 + 1e-9);
  });

  it("devrait faire tenir les anneaux de Saturne dans 80 % de la largeur", () => {
    const ctx = context({ positions: { saturn: { x: 0, y: 3, z: -90 } }, radii: { saturn: 2.8 }, portrait: true, ...PHONE });
    const cam = cameraFor("saturn", ctx);
    expect(widthShare(2.8 * 2.337, cam.dist, PHONE.fov, PHONE.aspect)).toBeLessThanOrEqual(0.8 + 1e-9);
  });

  it("devrait cadrer le Soleil dans la bande, comme une planète", () => {
    const cam = cameraFor("sun", context({ portrait: true, ...PHONE }));
    expect(cam.offY).toBeCloseTo((0.08 + 0.53) / 2 - 0.5, 9);
    expect(heightShare(7, cam.dist, PHONE.fov)).toBeLessThanOrEqual(0.9 * 0.45 + 1e-9);
  });

  it("devrait centrer la vue d'ensemble de l'au-delà dans la bande, à la même distance", () => {
    const cam = cameraFor("beyond", context({ portrait: true, ...PHONE }));
    expect(cam.offX).toBe(0);
    expect(cam.offY).toBeCloseTo((0.08 + 0.53) / 2 - 0.5, 9);
    expect(cam.dist).toBeCloseTo(640 * 1.75, 9);
  });

  it("ne devrait pas toucher à l'accueil ni à la ceinture (aucune plaque collée en bas)", () => {
    expect(cameraFor("hero", context({ portrait: true, ...PHONE })).offY).toBe(-0.29);
    expect(cameraFor("belt", context({ portrait: true, ...PHONE })).offY).toBe(-0.21);
  });
});

describe("restRange", () => {
  it("devrait poser la caméra dès que la section arrive à 12 % du haut, jusqu'à ce que son bas atteigne le bas de l'écran", () => {
    expect(restRange({ top: 2000, height: 1340 }, 812)).toEqual({ arrive: 2000 - 0.12 * 812, depart: 2000 + 1340 - 812 });
  });

  it("ne devrait jamais partir avant d'être arrivée (section plus courte que l'écran)", () => {
    const range = restRange({ top: 2000, height: 300 }, 812);
    expect(range.depart).toBe(range.arrive);
  });
});

describe("clampToRest", () => {
  /** Vue de 800 px : caméra posée de 1904 (arrivée) à 2600 px de défilement (départ). */
  const BOX = { top: 2000, height: 1400 };

  it("devrait laisser tel quel un défilement déjà dans la plage de repos", () => {
    expect(clampToRest(2300, BOX, 800)).toBe(2300);
  });

  it("devrait s'arrêter au départ plutôt que de lancer le vol vers l'escale suivante", () => {
    expect(clampToRest(3000, BOX, 800)).toBe(2600);
  });

  it("devrait viser 2 px après l'arrivée, comme la navigation, plutôt que le vol précédent", () => {
    expect(clampToRest(100, BOX, 800)).toBe(1906);
  });

  it("devrait viser un pixel entier sous un départ fractionnaire (le navigateur arrondit le défilement)", () => {
    expect(clampToRest(3000, { top: 2000.4, height: 1400 }, 800)).toBe(2600);
  });

  it("devrait viser 2 px après l'arrivée quand la section est trop courte pour un repos", () => {
    expect(clampToRest(2500, { top: 2000, height: 500 }, 800)).toBe(1906);
  });
});

describe("freeBand", () => {
  it("devrait aller du bas des bandeaux du haut au haut de la plaque repliée, 8 px d'air de chaque côté", () => {
    expect(freeBand(800, 80, { height: 280, bottom: 82 })).toEqual({ top: 88 / 800, bottom: 430 / 800 });
  });

  it("devrait renoncer quand la bande tombe sous 8 % de l'écran (texte très agrandi)", () => {
    expect(freeBand(800, 80, { height: 560, bottom: 82 })).toBeNull();
  });
});

describe("cameraFor sur grand écran (zone libre entre la plaque et la règle)", () => {
  /** 1440 × 900 : la plaque s'arrête à 41 % de la largeur, la règle commence à 86 %. */
  const DESK = { aspect: 1440 / 900, fov: 36, zone: { left: 0.41, right: 0.86 } };
  const saturn = { positions: { saturn: { x: 120, y: 0, z: 0 } }, radii: { saturn: 2.8 } };
  const jupiter = { positions: { jupiter: { x: 70, y: 0, z: 0 } }, radii: { jupiter: 3.1 } };

  it("devrait centrer l'astre dans la zone libre, à la hauteur habituelle", () => {
    const cam = cameraFor("jupiter", context({ ...jupiter, ...DESK }));
    expect(cam.offX).toBeCloseTo((0.41 + 0.86) / 2 - 0.5, 9);
    expect(cam.offY).toBe(0);
  });

  it("devrait garder la distance habituelle quand l'astre tient dans la zone", () => {
    const cam = cameraFor("jupiter", context({ ...jupiter, ...DESK }));
    expect(cam.dist).toBeCloseTo(6.6 * 3.1, 9);
  });

  it("devrait reculer Saturne pour que ses anneaux tiennent dans 90 % de la zone", () => {
    const cam = cameraFor("saturn", context({ ...saturn, ...DESK }));
    expect(cam.dist).toBeGreaterThan(9.8 * 2.8);
    expect(widthShare(2.8 * 2.337, cam.dist, DESK.fov, DESK.aspect)).toBeCloseTo(0.9 * 0.45, 9);
  });

  it("devrait laisser la bande du téléphone l'emporter, et ne pas toucher aux escales sans astre", () => {
    const phone = cameraFor(
      "jupiter",
      context({ ...jupiter, ...DESK, portrait: true, band: { top: 0.08, bottom: 0.53 } }),
    );
    expect(phone.offX).toBe(0);
    expect(cameraFor("beyond", context(DESK)).offX).toBe(0.14);
    expect(cameraFor("hero", context(DESK)).offX).toBe(0.23);
  });
});

describe("restProgress", () => {
  const RANGE: SectionRange = { key: "mars", arrive: 1000, depart: 1600 };

  it("devrait aller de 0 à l'arrivée à 1 au départ", () => {
    expect(restProgress(RANGE, 1000)).toBe(0);
    expect(restProgress(RANGE, 1300)).toBe(0.5);
    expect(restProgress(RANGE, 1600)).toBe(1);
  });

  it("devrait rester borné avant l'arrivée et après le départ", () => {
    expect(restProgress(RANGE, 900)).toBe(0);
    expect(restProgress(RANGE, 1700)).toBe(1);
  });

  it("devrait valoir 1 pour une section sans repos (départ dès l'arrivée)", () => {
    expect(restProgress({ key: "mars", arrive: 1000, depart: 1000 }, 1000)).toBe(1);
  });
});
