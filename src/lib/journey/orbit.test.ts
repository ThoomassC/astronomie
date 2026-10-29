import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import {
  cameraFor,
  type CamState,
  type CosmicStopKey,
  type StopCameraContext,
} from "@/lib/journey/camera";
import {
  EXPLORE_COSMIC_BAND,
  applyOrbitInput,
  directionToView,
  distanceBeforeSphere,
  dragToRotation,
  easeOrbitView,
  isExploreStop,
  orbitCamera,
  orbitFromCamera,
  orbitKeyCommand,
  orbitLimits,
  pinchToZoom,
  sunClearance,
  wheelToZoom,
  type ExploreStop,
  type OrbitContext,
  type OrbitInput,
  type OrbitLimits,
  type OrbitView,
} from "@/lib/journey/orbit";
import type { ScreenBand, ScreenZone } from "@/lib/journey/screen";

const DEG = Math.PI / 180;
/** Élévation maximale de l'orbite : 85°. */
const MAX_ELEV = 85 * DEG;
/** Recul maximal : 4 fois la distance de base. */
const MAX_DISTANCE_LOG = Math.log(4);

const cam = (over: Partial<CamState> = {}): CamState => ({
  tx: 0, ty: 0, tz: 0, dist: 100, azim: 0, elev: 0.2, offX: 0, offY: 0, planet: false, zoom: 0, ...over,
});
const view = (azim: number, elev: number, distanceLog: number): OrbitView => ({ azim, elev, distanceLog });
const gesture = (over: Partial<OrbitInput> = {}): OrbitInput => ({
  azim: 0, elev: 0, distanceLog: 0, recenter: false, ...over,
});
/** Contexte de scène : échelle et rayon affiché (unités de scène) de toutes les planètes. */
const context = (realScale: number, radius: number): OrbitContext => ({ realScale, planetRadius: () => radius });
const LIMITS: OrbitLimits = { minDistanceLog: -1.2, maxDistanceLog: MAX_DISTANCE_LOG };

/** Deux angles désignent la même direction (égalité modulo 2π). */
function expectSameAngle(actual: number, expected: number, label = "angle") {
  expect(Math.cos(actual), `cos ${label}`).toBeCloseTo(Math.cos(expected), 9);
  expect(Math.sin(actual), `sin ${label}`).toBeCloseTo(Math.sin(expected), 9);
}

/** Compare deux vues d'orbite ; l'azimut est comparé modulo 2π. */
function expectView(actual: OrbitView, expected: OrbitView) {
  expectSameAngle(actual.azim, expected.azim, "azim");
  expect(actual.elev, "elev").toBeCloseTo(expected.elev, 9);
  expect(actual.distanceLog, "distanceLog").toBeCloseTo(expected.distanceLog, 9);
}

describe("isExploreStop", () => {
  it.each([
    "hero", "sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "beyond", "stars", "galaxy",
  ] as const)("devrait permettre de tourner autour de l'escale %s", (key) => {
    expect(isExploreStop(key)).toBe(true);
  });

  it("ne devrait pas permettre de tourner autour de la ceinture d'astéroïdes (interlude)", () => {
    expect(isExploreStop("belt")).toBe(false);
  });
});

describe("orbitFromCamera", () => {
  it("devrait partir des angles de la caméra de base, à sa distance (distanceLog 0)", () => {
    expectView(orbitFromCamera(cam({ azim: 2.4, elev: 0.3, dist: 27.44 })), view(2.4, 0.3, 0));
  });

  it("devrait borner l'élévation de départ à 85° quand la caméra de base regarde de plus haut", () => {
    expect(orbitFromCamera(cam({ elev: 1.6 })).elev).toBeCloseTo(MAX_ELEV, 12);
  });
});

describe("sunClearance", () => {
  it.each([
    [0, 0, 17.5],
    [1, 0, 0.875],
    [0, 2, 0.175],
  ])("devrait tenir la caméra à 2,5 rayons solaires affichés (realScale %f, zoom %f → %f)", (realScale, zoom, expected) => {
    expect(sunClearance(realScale, zoom)).toBeCloseTo(expected, 12);
  });
});

describe("orbitLimits", () => {
  it.each<readonly [string, ExploreStop, CamState, OrbitContext, number]>([
    // 1,8 rayon de la Terre (1,836) depuis 8,16.
    ["la Terre : 1,8 rayon", "earth", cam({ tx: 34, dist: 8.16, planet: true }), context(0, 1.02), -1.491655],
    // Rayon affiché × 0,012 en échelle réelle : le plancher absolu de 0,4 l'emporte.
    ["la Terre en échelle réelle : plancher de 0,4", "earth", cam({ tx: 34, dist: 8.16, planet: true }), context(1, 1.02), -3.015535],
    // 1,15 × 2,337 rayons (anneaux) × 2,8 = 7,525 depuis 27,44.
    ["Saturne : 1,15 × ses anneaux", "saturn", cam({ tz: -90, dist: 27.44, planet: true }), context(0, 2.8), -1.293752],
    // Garde du Soleil : 7 × 2,5 = 17,5 depuis 46.
    ["le Soleil : sa sphère de garde", "sun", cam({ dist: 46 }), context(0, 1), -0.966441],
    ["l'accueil : la sphère de garde du Soleil", "hero", cam({ dist: 420 }), context(0, 1), -3.178054],
    ["l'au-delà : la sphère de garde du Soleil", "beyond", cam({ dist: 640 }), context(0, 1), -3.599267],
    ["les étoiles voisines : 0,25 × la base", "stars", cam({ dist: 640, zoom: 4.6 }), context(0, 1), Math.log(0.25)],
    ["la Voie lactée : 0,4 × la base", "galaxy", cam({ tx: -4.13, ty: -7.26, tz: 74.84, dist: 640, zoom: 8 }), context(0, 1), Math.log(0.4)],
  ])("devrait laisser approcher %s, et reculer jusqu'à 4 fois la base", (_label, stop, base, ctx, minDistanceLog) => {
    const limits = orbitLimits(stop, base, ctx);
    expect(limits.minDistanceLog).toBeCloseTo(minDistanceLog, 6);
    expect(limits.maxDistanceLog).toBeCloseTo(MAX_DISTANCE_LOG, 12);
  });

  it("ne devrait pas permettre d'approcher quand la base est déjà plus proche que la limite", () => {
    const limits = orbitLimits("saturn", cam({ tz: -90, dist: 5, planet: true }), context(0, 2.8));
    expect(limits.minDistanceLog).toBeCloseTo(0, 12);
  });
});

describe("applyOrbitInput", () => {
  const HOME = view(0.7, 0.3, 0);

  it("devrait ajouter les rotations et le changement de distance à la vue", () => {
    const next = applyOrbitInput(view(0.5, 0.2, 0), gesture({ azim: 0.3, elev: 0.1, distanceLog: 0.2 }), HOME, LIMITS);
    expectView(next, view(0.8, 0.3, 0.2));
  });

  it.each([
    [1.4, 0.3, MAX_ELEV],
    [-1.4, -0.3, -MAX_ELEV],
  ])("devrait borner l'élévation à ±85° (%f + %f → %f)", (elev, delta, expected) => {
    expect(applyOrbitInput(view(0, elev, 0), gesture({ elev: delta }), HOME, LIMITS).elev).toBeCloseTo(expected, 12);
  });

  it.each([
    [1.3, 0.5, MAX_DISTANCE_LOG],
    [-0.9, -0.5, -1.2],
  ])("devrait borner la distance aux limites de l'escale (%f + %f → %f)", (distanceLog, delta, expected) => {
    const next = applyOrbitInput(view(0, 0, distanceLog), gesture({ distanceLog: delta }), HOME, LIMITS);
    expect(next.distanceLog).toBeCloseTo(expected, 12);
  });

  it("devrait repartir de la vue de départ puis appliquer le reste quand on recentre", () => {
    const next = applyOrbitInput(
      view(2.5, 0.9, 1),
      gesture({ azim: 0.1, distanceLog: 0.2, recenter: true }),
      HOME,
      LIMITS,
    );
    expectView(next, view(0.8, 0.3, 0.2));
  });

  it.each([
    [3, 0.5, 3.5 - 2 * Math.PI],
    [-3, -0.5, 2 * Math.PI - 3.5],
  ])("devrait ramener l'azimut dans ]−π, π] (%f + %f → %f)", (azim, delta, expected) => {
    expect(applyOrbitInput(view(azim, 0, 0), gesture({ azim: delta }), HOME, LIMITS).azim).toBeCloseTo(expected, 12);
  });

  it("devrait ramener l'azimut −π à π, borne incluse de ]−π, π]", () => {
    const next = applyOrbitInput(view(-3, 0, 0), gesture({ azim: -(Math.PI - 3) }), HOME, LIMITS);
    expect(next.azim).toBeCloseTo(Math.PI, 12);
  });

  it("devrait écrire dans out, le renvoyer et laisser la vue d'entrée intacte", () => {
    const shown = view(0.5, 0.2, 0);
    const out = view(9, 9, 9);
    const result = applyOrbitInput(shown, gesture({ azim: 0.3 }), HOME, LIMITS, out);
    expect(result).toBe(out);
    expectView(out, view(0.8, 0.2, 0));
    expect(shown).toEqual(view(0.5, 0.2, 0));
  });
});

describe("easeOrbitView", () => {
  it("devrait rejoindre la vue demandée quand le facteur vaut 1", () => {
    expectView(easeOrbitView(view(0.1, 0.2, 0), view(-2, 0.6, 1.1), 1), view(-2, 0.6, 1.1));
  });

  it("devrait faire la moitié du chemin, l'azimut par le plus court (3,1 → −3,1 passe par π), quand le facteur vaut 0,5", () => {
    expectView(easeOrbitView(view(3.1, 0.2, 0), view(-3.1, 0.4, 1), 0.5), view(Math.PI, 0.3, 0.5));
  });

  it("devrait se poser exactement sur la vue demandée quand l'écart passe sous 1e-4", () => {
    const target = view(1 + 5e-5, 0.3 - 5e-5, 0.5 + 5e-5);
    const next = easeOrbitView(view(1, 0.3, 0.5), target, 0.1);
    expect(next.azim).toBe(target.azim);
    expect(next.elev).toBe(target.elev);
    expect(next.distanceLog).toBe(target.distanceLog);
  });
});

describe("orbitCamera", () => {
  it.each([
    ["Jupiter", cam({ tx: 70, ty: 1, tz: -20, dist: 20, azim: 1, offX: 0.17, offY: -0.21, planet: true, zoom: 0 })],
    ["la Voie lactée", cam({ tx: -4.13, ty: -7.26, tz: 74.84, dist: 640, azim: 3, offX: 0.14, planet: false, zoom: 8 })],
  ] as const)("devrait garder la cible, le zoom et le drapeau planet de la base, sans décalage d'écran (%s)", (_label, base) => {
    const camera = orbitCamera(base, view(-2, 0.6, Math.log(2)), 17.5 * 10 ** -base.zoom);
    expect(camera).toEqual({
      tx: base.tx,
      ty: base.ty,
      tz: base.tz,
      dist: expect.closeTo(base.dist * 2, 9),
      azim: expect.closeTo(-2, 12),
      elev: expect.closeTo(0.6, 12),
      offX: 0,
      offY: 0,
      planet: base.planet,
      zoom: base.zoom,
    });
  });

  it("devrait raccourcir la distance pour ne pas entrer dans la sphère de garde du Soleil (Mercure vue côté Soleil)", () => {
    // Mercure à 25,686 du Soleil, vue depuis le Soleil (azimut π), reculée de 4 × 5,58 = 22,32 : la caméra
    // entrerait dans la sphère de 17,5 ; elle s'arrête à 25,686 − 17,5 = 8,186 de la planète.
    const base = cam({ tx: 25.686, dist: 5.58, planet: true });
    expect(orbitCamera(base, view(Math.PI, 0, Math.log(4)), 17.5).dist).toBeCloseTo(8.186, 9);
  });
});

describe("distanceBeforeSphere", () => {
  const MERCURY: Vec3 = { x: 25.686, y: 0, z: 0 };

  it.each([
    ["vers le Soleil", MERCURY, { x: -1, y: 0, z: 0 }, 8.186],
    ["perpendiculaire, sans rencontrer la sphère", MERCURY, { x: 0, y: 1, z: 0 }, 22.3],
    ["en s'éloignant du Soleil", MERCURY, { x: 1, y: 0, z: 0 }, 22.3],
    ["depuis une cible déjà dans la sphère (le Soleil)", { x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, 22.3],
  ] as const)("devrait s'arrêter avant la sphère de garde (%s : %f)", (_label, target, direction, expected) => {
    expect(distanceBeforeSphere(target, direction, 22.3, 17.5)).toBeCloseTo(expected, 9);
  });
});

describe("directionToView", () => {
  it("devrait donner azimut et élévation nuls pour l'axe x", () => {
    const { azim, elev } = directionToView({ x: 1, y: 0, z: 0 });
    expect(azim).toBeCloseTo(0, 12);
    expect(elev).toBeCloseTo(0, 12);
  });

  it("devrait donner un azimut de −π/2 pour l'axe −z", () => {
    expect(directionToView({ x: 0, y: 0, z: -1 }).azim).toBeCloseTo(-Math.PI / 2, 12);
  });

  it("devrait borner l'élévation à 85° pour la verticale", () => {
    expect(directionToView({ x: 0, y: 1, z: 0 }).elev).toBeCloseTo(MAX_ELEV, 12);
  });

  it("devrait retrouver les angles de la position que le moteur donne à la caméra (h cos azim, sin elev, h sin azim)", () => {
    const azim = 2;
    const elev = 0.4;
    const h = Math.cos(elev);
    const { azim: back, elev: backElev } = directionToView({ x: h * Math.cos(azim), y: Math.sin(elev), z: h * Math.sin(azim) });
    expect(back).toBeCloseTo(azim, 12);
    expect(backElev).toBeCloseTo(elev, 12);
  });
});

describe("gestes", () => {
  it("devrait faire suivre le doigt : glisser à droite et vers le haut ⇒ azimut +, élévation − (demi-tour par hauteur de vue)", () => {
    const { azim, elev } = dragToRotation(100, -50, 800);
    expect(azim).toBeCloseTo(0.3927, 4);
    expect(elev).toBeCloseTo(-0.19635, 5);
  });

  it.each([
    [100, 0, 0.15],
    [3, 1, 0.072],
    [1, 2, 0.5],
    [-10_000, 0, -0.5],
  ])("devrait convertir la molette en distance (deltaY %f, deltaMode %i → %f, borné à ±0,5)", (deltaY, deltaMode, expected) => {
    expect(wheelToZoom(deltaY, deltaMode, 800)).toBeCloseTo(expected, 12);
  });

  it("devrait rapprocher quand les doigts s'écartent (écart 100 → 200 : −ln 2)", () => {
    expect(pinchToZoom(100, 200)).toBeCloseTo(-0.6931, 4);
  });

  it("ne devrait rien changer quand l'écart précédent est nul", () => {
    expect(pinchToZoom(0, 50)).toBe(0);
  });
});

describe("orbitKeyCommand", () => {
  it.each([
    ["ArrowLeft", -15 * DEG, 0],
    ["ArrowRight", 15 * DEG, 0],
    ["ArrowUp", 0, -10 * DEG],
    ["ArrowDown", 0, 10 * DEG],
  ])("devrait faire tourner avec %s (azimut %f, élévation %f)", (key, azim, elev) => {
    expect(orbitKeyCommand(key)).toEqual({ kind: "rotate", azim: expect.closeTo(azim, 9), elev: expect.closeTo(elev, 9) });
  });

  it.each([
    ["+", -Math.log(1.25)],
    ["=", -Math.log(1.25)],
    ["-", Math.log(1.25)],
  ])("devrait changer la distance avec « %s » (%f)", (key, distanceLog) => {
    expect(orbitKeyCommand(key)).toEqual({ kind: "zoom", distanceLog: expect.closeTo(distanceLog, 9) });
  });

  it.each(["0", "Home"])("devrait recentrer avec « %s »", (key) => {
    expect(orbitKeyCommand(key)).toEqual({ kind: "recenter" });
  });

  it("devrait quitter avec Échap", () => {
    expect(orbitKeyCommand("Escape")).toEqual({ kind: "exit" });
  });

  it("devrait ignorer une autre touche", () => {
    expect(orbitKeyCommand("a")).toBeNull();
  });
});

describe("EXPLORE_COSMIC_BAND", () => {
  /** Écran sans astre cadré : bande libre (mise en page compacte), zone libre (grand écran), ou rien. */
  const screen = (aspect: number, fov: number, frame: { band?: ScreenBand; zone?: ScreenZone }): StopCameraContext => {
    const { band, zone } = frame;
    return {
      planetPosition: () => ({ x: 1, y: 0, z: 0 }),
      planetRadius: () => 1,
      realScale: 0,
      portrait: aspect < 0.9,
      aspect,
      fov,
      band: band ? () => band : undefined,
      zone: zone ? () => zone : undefined,
    };
  };

  /** Mêmes écrans que camera.test.ts : iPhone 375 × 812 (bande libre de 8 à 53 %), 1440 × 900 (zone de 41 à 86 %). */
  const CASES: readonly (readonly [CosmicStopKey, string, number, number, { band?: ScreenBand; zone?: ScreenZone }])[] = [
    ["stars", "téléphone", 375 / 812, 50, { band: { top: 0.08, bottom: 0.53 } }],
    ["stars", "grand écran", 1440 / 900, 36, { zone: { left: 0.41, right: 0.86 } }],
    ["galaxy", "téléphone", 375 / 812, 50, { band: { top: 0.08, bottom: 0.53 } }],
    ["galaxy", "grand écran", 1440 / 900, 36, { zone: { left: 0.41, right: 0.86 } }],
  ];

  it.each(CASES)(
    "devrait cadrer %s en plein écran, sans reculer à l'entrée de l'exploration (%s)",
    (stop, _label, aspect, fov, layout) => {
      const travel = cameraFor(stop, screen(aspect, fov, layout));
      const explore = cameraFor(stop, screen(aspect, fov, { band: EXPLORE_COSMIC_BAND }));
      // Sans cadre, la base serait 640 (1 120 en portrait) : la caméra reculerait en entrant.
      const unframed = cameraFor(stop, screen(aspect, fov, {}));
      expect(explore.dist).toBeLessThanOrEqual(travel.dist * (1 + 1e-12));
      expect(explore.dist).toBeLessThan(unframed.dist);
      expect(explore.offX).toBe(0);
      expect(explore.offY).toBeCloseTo(0, 12);
    },
  );
});
