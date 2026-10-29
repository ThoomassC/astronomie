import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/lib/astro/constants";
import { galacticFromScene } from "@/lib/astro/galactic";
import type { PlanetKey } from "@/lib/astro/planets";
import {
  angleDiff,
  blendCameras,
  cameraFor,
  isCosmicStop,
  mixCameras,
  RAIL_BREAK,
  RAIL_STOPS,
  railPercent,
  RING_EXTENT,
  STOP_ORDER,
  type CamState,
  type StopCameraContext,
  type StopKey,
} from "@/lib/journey/camera";
import type { ScreenBand, ScreenZone } from "@/lib/journey/screen";

const DEG = Math.PI / 180;
/** Unités astronomiques par année-lumière (UAI : 1 al = 9 460 730 472 580,8 km, 1 UA = 149 597 870,7 km). */
const AU_PER_LY = 63_241.077;

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
  expect(actual.zoom, "zoom").toBeCloseTo(expected.zoom, 9);
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

/** iPhone 375 × 812 : barre haute jusqu'à 8 %, plaque compacte à partir de 53 %. */
const PHONE = { aspect: 375 / 812, fov: 50, band: { top: 0.08, bottom: 0.53 } };
/** 1440 × 900 : la plaque s'arrête à 41 % de la largeur, la règle commence à 86 %. */
const DESK = { aspect: 1440 / 900, fov: 36, zone: { left: 0.41, right: 0.86 } };

/** Les douze escales d'avant le zoom cosmique, dans l'ordre du voyage. */
const HISTORICAL_STOPS = [
  "hero", "sun", "mercury", "venus", "earth", "mars", "belt", "jupiter", "saturn", "uranus", "neptune", "beyond",
] as const;

/**
 * Système de référence de la caractérisation : positions et rayons repris des cas de ce fichier
 * (Terre, Mars, Jupiter, Saturne) ; Mercure, Vénus, Uranus et Neptune hors des axes et hors du plan.
 */
const JOURNEY = {
  positions: {
    mercury: { x: -21, y: 0.8, z: 14 },
    venus: { x: 12, y: -0.6, z: -28 },
    earth: { x: 34, y: 0, z: 0 },
    mars: { x: 0, y: 0, z: 39.16 },
    jupiter: { x: 70, y: 0, z: 0 },
    saturn: { x: 0, y: 3, z: -90 },
    uranus: { x: -95, y: -1.2, z: 60 },
    neptune: { x: 80, y: 2.1, z: 110 },
  },
  radii: { mercury: 0.62, venus: 0.98, earth: 1.02, mars: 0.74, jupiter: 3.1, saturn: 2.8, uranus: 1.85, neptune: 1.8 },
};

/** 10 chiffres significatifs : insensible au dernier bit d'un calcul réordonné, sensible à tout vrai changement. */
const sig = (value: number) => Number(value.toPrecision(10));

/** Caméra sur une ligne : cible, distance, azimut ramené dans [0°, 360°[, élévation, décalages d'écran, drapeau planet. */
function describeCamera(cam: CamState): string {
  const azimDeg = (((cam.azim / DEG) % 360) + 360) % 360;
  return (
    `cible (${sig(cam.tx)}, ${sig(cam.ty)}, ${sig(cam.tz)}) · dist ${sig(cam.dist)} · azim ${sig(azimDeg)}° · ` +
    `élév ${sig(cam.elev / DEG)}° · décalage (${sig(cam.offX)}, ${sig(cam.offY)}) · planet ${cam.planet}`
  );
}

/** Caméra de chacune des douze escales historiques dans un contexte donné. */
const historicalCameras = (ctx: StopCameraContext) =>
  Object.fromEntries(HISTORICAL_STOPS.map((key) => [key, describeCamera(cameraFor(key, ctx))]));

/*
 * Caractérisation, figée avec le code d'avant le zoom cosmique : ajouter les escales lointaines
 * ne doit déplacer aucune caméra du système solaire, ni aucun vol entre elles.
 */
describe("caractérisation des caméras historiques", () => {
  it("devrait garder les caméras des douze escales quand l'écran est en paysage 16:9", () => {
    expect(historicalCameras(context(JOURNEY))).toMatchInlineSnapshot(`
      {
        "belt": "cible (25.16722741, 0, 41.04879043) · dist 82 · azim 268.4873213° · élév 38° · décalage (0.17, 0) · planet true",
        "beyond": "cible (0, 0, 0) · dist 640 · azim 206° · élév 62° · décalage (0.14, 0) · planet false",
        "earth": "cible (34, 0, 0) · dist 8.16 · azim 235° · élév 11° · décalage (0.17, 0) · planet true",
        "hero": "cible (0, 0, 0) · dist 420 · azim 206° · élév 24° · décalage (0.23, 0.05) · planet false",
        "jupiter": "cible (70, 0, 0) · dist 20.46 · azim 235° · élév 11° · décalage (0.17, 0) · planet true",
        "mars": "cible (0, 0, 39.16) · dist 6.29 · azim 325° · élév 11° · décalage (0.17, 0) · planet true",
        "mercury": "cible (-21, 0.8, 14) · dist 5.58 · azim 21.30993247° · élév 11° · décalage (0.17, 0) · planet true",
        "neptune": "cible (80, 2.1, 110) · dist 14.04 · azim 288.9726266° · élév 11° · décalage (0.17, 0) · planet true",
        "saturn": "cible (0, 3, -90) · dist 27.44 · azim 145° · élév 17° · décalage (0.17, 0) · planet true",
        "sun": "cible (0, 0, 0) · dist 46 · azim 226° · élév 8° · décalage (0.17, 0) · planet false",
        "uranus": "cible (-95, -1.2, 60) · dist 14.43 · azim 22.72435569° · élév 11° · décalage (0.17, 0) · planet true",
        "venus": "cible (12, -0.6, -28) · dist 7.35 · azim 168.1985905° · élév 11° · décalage (0.17, 0) · planet true",
      }
    `);
  });

  it("devrait garder les caméras des douze escales quand l'écran est en portrait", () => {
    expect(historicalCameras(context({ ...JOURNEY, portrait: true }))).toMatchInlineSnapshot(`
      {
        "belt": "cible (25.16722741, 0, 41.04879043) · dist 106.6 · azim 268.4873213° · élév 38° · décalage (0, -0.21) · planet true",
        "beyond": "cible (0, 0, 0) · dist 1120 · azim 206° · élév 62° · décalage (0, -0.1) · planet false",
        "earth": "cible (34, 0, 0) · dist 11.424 · azim 235° · élév 11° · décalage (0, -0.21) · planet true",
        "hero": "cible (0, 0, 0) · dist 735 · azim 206° · élév 24° · décalage (0, -0.29) · planet false",
        "jupiter": "cible (70, 0, 0) · dist 28.644 · azim 235° · élév 11° · décalage (0, -0.21) · planet true",
        "mars": "cible (0, 0, 39.16) · dist 8.806 · azim 325° · élév 11° · décalage (0, -0.21) · planet true",
        "mercury": "cible (-21, 0.8, 14) · dist 7.812 · azim 21.30993247° · élév 11° · décalage (0, -0.21) · planet true",
        "neptune": "cible (80, 2.1, 110) · dist 19.656 · azim 288.9726266° · élév 11° · décalage (0, -0.21) · planet true",
        "saturn": "cible (0, 3, -90) · dist 38.416 · azim 145° · élév 17° · décalage (0, -0.21) · planet true",
        "sun": "cible (0, 0, 0) · dist 66.7 · azim 226° · élév 8° · décalage (0, -0.21) · planet false",
        "uranus": "cible (-95, -1.2, 60) · dist 20.202 · azim 22.72435569° · élév 11° · décalage (0, -0.21) · planet true",
        "venus": "cible (12, -0.6, -28) · dist 10.29 · azim 168.1985905° · élév 11° · décalage (0, -0.21) · planet true",
      }
    `);
  });

  it("devrait garder les caméras des douze escales quand la bande libre du téléphone est mesurée", () => {
    expect(historicalCameras(context({ ...JOURNEY, portrait: true, ...PHONE }))).toMatchInlineSnapshot(`
      {
        "belt": "cible (25.16722741, 0, 41.04879043) · dist 106.6 · azim 268.4873213° · élév 38° · décalage (0, -0.21) · planet true",
        "beyond": "cible (0, 0, 0) · dist 1120 · azim 206° · élév 62° · décalage (0, -0.195) · planet false",
        "earth": "cible (34, 0, 0) · dist 6.007775631 · azim 235° · élév 11° · décalage (0, -0.195) · planet true",
        "hero": "cible (0, 0, 0) · dist 735 · azim 206° · élév 24° · décalage (0, -0.29) · planet false",
        "jupiter": "cible (70, 0, 0) · dist 18.25892594 · azim 235° · élév 11° · décalage (0, -0.195) · planet true",
        "mars": "cible (0, 0, 39.16) · dist 4.35858232 · azim 325° · élév 11° · décalage (0, -0.195) · planet true",
        "mercury": "cible (-21, 0.8, 14) · dist 3.651785187 · azim 21.30993247° · élév 11° · décalage (0, -0.195) · planet true",
        "neptune": "cible (80, 2.1, 110) · dist 10.601957 · azim 288.9726266° · élév 11° · décalage (0, -0.195) · planet true",
        "saturn": "cible (0, 3, -90) · dist 38.54164766 · azim 145° · élév 17° · décalage (0, -0.195) · planet true",
        "sun": "cible (0, 0, 0) · dist 41.22983276 · azim 226° · élév 8° · décalage (0, -0.195) · planet false",
        "uranus": "cible (-95, -1.2, 60) · dist 22.33773439 · azim 22.72435569° · élév 11° · décalage (0, -0.195) · planet true",
        "venus": "cible (12, -0.6, -28) · dist 5.772176586 · azim 168.1985905° · élév 11° · décalage (0, -0.195) · planet true",
      }
    `);
  });

  it("devrait garder les caméras des douze escales quand la zone libre du grand écran est mesurée", () => {
    expect(historicalCameras(context({ ...JOURNEY, ...DESK }))).toMatchInlineSnapshot(`
      {
        "belt": "cible (25.16722741, 0, 41.04879043) · dist 82 · azim 268.4873213° · élév 38° · décalage (0.17, 0) · planet true",
        "beyond": "cible (0, 0, 0) · dist 640 · azim 206° · élév 62° · décalage (0.14, 0) · planet false",
        "earth": "cible (34, 0, 0) · dist 8.16 · azim 235° · élév 11° · décalage (0.135, 0) · planet true",
        "hero": "cible (0, 0, 0) · dist 420 · azim 206° · élév 24° · décalage (0.23, 0.05) · planet false",
        "jupiter": "cible (70, 0, 0) · dist 20.46 · azim 235° · élév 11° · décalage (0.135, 0) · planet true",
        "mars": "cible (0, 0, 39.16) · dist 6.29 · azim 325° · élév 11° · décalage (0.135, 0) · planet true",
        "mercury": "cible (-21, 0.8, 14) · dist 5.58 · azim 21.30993247° · élév 11° · décalage (0.135, 0) · planet true",
        "neptune": "cible (80, 2.1, 110) · dist 14.04 · azim 288.9726266° · élév 11° · décalage (0.135, 0) · planet true",
        "saturn": "cible (0, 3, -90) · dist 31.76030532 · azim 145° · élév 17° · décalage (0.135, 0) · planet true",
        "sun": "cible (0, 0, 0) · dist 46 · azim 226° · élév 8° · décalage (0.135, 0) · planet false",
        "uranus": "cible (-95, -1.2, 60) · dist 18.40744513 · azim 22.72435569° · élév 11° · décalage (0.135, 0) · planet true",
        "venus": "cible (12, -0.6, -28) · dist 7.35 · azim 168.1985905° · élév 11° · décalage (0.135, 0) · planet true",
      }
    `);
  });

  it("devrait garder trois vols du voyage (accueil → Soleil, Mars → Jupiter, Neptune → au-delà)", () => {
    const ctx = context(JOURNEY);
    const flight = (from: StopKey, to: StopKey, t: number) =>
      describeCamera(blendCameras(cameraFor(from, ctx), cameraFor(to, ctx), t));
    expect({
      "hero → sun, t = 0,3": flight("hero", "sun", 0.3),
      "mars → jupiter, t = 0,5": flight("mars", "jupiter", 0.5),
      "neptune → beyond, t = 0,8": flight("neptune", "beyond", 0.8),
    }).toMatchInlineSnapshot(`
      {
        "hero → sun, t = 0,3": "cible (0, 0, 0) · dist 293.3263823 · azim 212° · élév 22.1666086° · décalage (0.212, 0.035) · planet false",
        "mars → jupiter, t = 0,5": "cible (38.59388812, 0, 38.59388812) · dist 27.56667658 · azim 280° · élév 22.91752214° · décalage (0.17, 0) · planet true",
        "neptune → beyond, t = 0,8": "cible (16, 0.42, 22) · dist 375.2441505 · azim 222.5945253° · élév 53.95536731° · décalage (0.146, 0) · planet false",
      }
    `);
  });
});

describe("cameraFor", () => {
  describe("vue d'ensemble (hero)", () => {
    it("devrait viser le centre de loin, cible décalée à droite, quand l'écran est en paysage", () => {
      expectCamera(cameraFor("hero", context()), {
        tx: 0, ty: 0, tz: 0, dist: 420, elev: 24 * DEG, azim: 206 * DEG, offX: 0.23, offY: 0.05, planet: false, zoom: 0,
      });
    });

    it("devrait reculer de × 1,75, centrer et remonter la cible quand l'écran est en portrait", () => {
      expectCamera(cameraFor("hero", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 735, elev: 24 * DEG, azim: 206 * DEG, offX: 0, offY: -0.29, planet: false, zoom: 0,
      });
    });
  });

  describe("Soleil", () => {
    it("devrait viser le centre avec les décalages par défaut quand l'écran est en paysage", () => {
      expectCamera(cameraFor("sun", context()), {
        tx: 0, ty: 0, tz: 0, dist: 46, elev: 8 * DEG, azim: 226 * DEG, offX: 0.17, offY: 0, planet: false, zoom: 0,
      });
    });

    it("devrait reculer de × 1,45 quand l'écran est en portrait", () => {
      expectCamera(cameraFor("sun", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 66.7, elev: 8 * DEG, azim: 226 * DEG, offX: 0, offY: -0.21, planet: false, zoom: 0,
      });
    });
  });

  describe("au-delà (beyond)", () => {
    it("devrait viser le centre de très loin et de haut quand l'écran est en paysage", () => {
      expectCamera(cameraFor("beyond", context()), {
        tx: 0, ty: 0, tz: 0, dist: 640, elev: 62 * DEG, azim: 206 * DEG, offX: 0.14, offY: 0, planet: false, zoom: 0,
      });
    });

    it("devrait reculer de × 1,75 et remonter la cible de 0,1 quand l'écran est en portrait", () => {
      expectCamera(cameraFor("beyond", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 1120, elev: 62 * DEG, azim: 206 * DEG, offX: 0, offY: -0.1, planet: false, zoom: 0,
      });
    });
  });

  describe("planète", () => {
    const earthCtx = { positions: { earth: { x: 34, y: 0, z: 0 } }, radii: { earth: 1.02 } };

    it("devrait viser la planète à k × rayon, 55° derrière elle, quand l'écran est en paysage", () => {
      expectCamera(cameraFor("earth", context(earthCtx)), {
        tx: 34, ty: 0, tz: 0, dist: 8.16, elev: 11 * DEG, azim: Math.PI + 55 * DEG, offX: 0.17, offY: 0, planet: true, zoom: 0,
      });
    });

    it("devrait reculer de × 1,4 et remonter la cible quand l'écran est en portrait", () => {
      expectCamera(cameraFor("earth", context({ ...earthCtx, portrait: true })), {
        tx: 34, ty: 0, tz: 0, dist: 8.16 * 1.4, elev: 11 * DEG, azim: Math.PI + 55 * DEG, offX: 0, offY: -0.21, planet: true, zoom: 0,
      });
    });

    it("devrait suivre la position 3D de la planète et l'élévation propre à l'escale (Saturne)", () => {
      const ctx = context({ positions: { saturn: { x: 0, y: 3, z: -90 } }, radii: { saturn: 2.8 } });
      expectCamera(cameraFor("saturn", ctx), {
        tx: 0, ty: 3, tz: -90, dist: 9.8 * 2.8, elev: 17 * DEG, azim: -Math.PI / 2 + Math.PI + 55 * DEG, offX: 0.17, offY: 0, planet: true, zoom: 0,
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
        zoom: 0,
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
    const out: CamState = { tx: 9, ty: 9, tz: 9, dist: 9, azim: 9, elev: 9, offX: 9, offY: 9, planet: true, zoom: 9 };
    const result = cameraFor("hero", context(), out);
    expect(result).toBe(out);
    expectCamera(out, {
      tx: 0, ty: 0, tz: 0, dist: 420, elev: 24 * DEG, azim: 206 * DEG, offX: 0.23, offY: 0.05, planet: false, zoom: 0,
    });
  });

  it("ne devrait pas partager l'état renvoyé entre deux appels sans out", () => {
    const hero = cameraFor("hero", context());
    cameraFor("sun", context());
    expect(hero.dist).toBeCloseTo(420, 9);
  });
});

describe("cameraFor aux escales cosmiques (zoom cosmique)", () => {
  it.each(HISTORICAL_STOPS)("devrait laisser le zoom cosmique à 0 à l'escale %s", (key) => {
    expect(cameraFor(key, context(JOURNEY)).zoom).toBe(0);
  });

  describe("étoiles voisines (stars)", () => {
    it("devrait viser le Soleil de loin au zoom 4,6, cible décalée à droite, quand l'écran est en paysage", () => {
      expectCamera(cameraFor("stars", context()), {
        tx: 0, ty: 0, tz: 0, dist: 640, elev: 35 * DEG, azim: 206 * DEG, offX: 0.14, offY: 0, planet: false, zoom: 4.6,
      });
    });

    it("devrait reculer de × 1,75, centrer et remonter la cible de 0,1 quand l'écran est en portrait", () => {
      expectCamera(cameraFor("stars", context({ portrait: true })), {
        tx: 0, ty: 0, tz: 0, dist: 1120, elev: 35 * DEG, azim: 206 * DEG, offX: 0, offY: -0.1, planet: false, zoom: 4.6,
      });
    });
  });

  describe("Voie lactée (galaxy)", () => {
    it("devrait viser le centre galactique à l'échelle du zoom 8 (27 000 al × unitsPerLightYear(8))", () => {
      // sceneFromGalactic(0, 0) × 27 000 × 4,41 × 63 241,077 × 10⁻⁸, recalculé hors du dépôt.
      const cam = cameraFor("galaxy", context());
      expect(cam.tx).toBeCloseTo(-4.1321928, 6);
      expect(cam.ty).toBeCloseTo(-7.2648009, 6);
      expect(cam.tz).toBeCloseTo(74.8358931, 6);
    });

    it("devrait regarder de haut, au zoom 8, cible décalée à droite, quand l'écran est en paysage", () => {
      const cam = cameraFor("galaxy", context());
      expect(cam.dist).toBeCloseTo(640, 9);
      expect(cam.elev).toBeCloseTo(60 * DEG, 9);
      expectSameAngle(cam.azim, 180 * DEG, "azim");
      expect(cam.offX).toBeCloseTo(0.14, 9);
      expect(cam.offY).toBeCloseTo(0, 9);
      expect(cam.planet).toBe(false);
      expect(cam.zoom).toBe(8);
    });

    it("devrait voir le disque depuis le nord galactique, à 30° de sa face (latitude galactique ≈ 59,8°)", () => {
      const { azim, elev } = cameraFor("galaxy", context());
      const towardCamera = { x: Math.cos(elev) * Math.cos(azim), y: Math.sin(elev), z: Math.cos(elev) * Math.sin(azim) };
      expect(galacticFromScene(towardCamera).bDeg).toBeCloseTo(59.8, 0);
    });

    it("devrait reculer de × 1,75, centrer et remonter la cible de 0,1 quand l'écran est en portrait", () => {
      const cam = cameraFor("galaxy", context({ portrait: true }));
      expect(cam.dist).toBeCloseTo(1120, 9);
      expect(cam.offX).toBeCloseTo(0, 9);
      expect(cam.offY).toBeCloseTo(-0.1, 9);
    });
  });

  /**
   * Disque cadré par l'escale, centré sur sa cible : 17 al dans le plan de l'écliptique aux étoiles voisines (zoom 4,6,
   * élévation 35°), le disque de 50 000 al de la Galaxie à la Voie lactée (zoom 8, élévation 60°). Rayon en unités de scène.
   */
  const FRAME = {
    stars: { radius: 17 * 4.41 * AU_PER_LY * 10 ** -4.6, elev: 35 * DEG },
    galaxy: { radius: 50_000 * 4.41 * AU_PER_LY * 10 ** -8, elev: 60 * DEG },
  };
  /**
   * Demi-largeur et descente du bord proche du disque projeté, à la distance d, en tangentes : bord le plus large
   * r / √(d² − (r cos e)²), bord proche (en bas de l'écran, grossi par la perspective) r sin e / (d − r cos e).
   */
  const diskShares = (key: "stars" | "galaxy", d: number) => {
    const { radius, elev } = FRAME[key];
    return {
      width: radius / Math.sqrt(d * d - (radius * Math.cos(elev)) ** 2),
      near: (radius * Math.sin(elev)) / (d - radius * Math.cos(elev)),
    };
  };

  // Distances recalculées hors du dépôt : toutes les vues tiennent d'abord par la largeur.
  it.each([
    ["stars", 698.121835],
    ["galaxy", 812.41027],
  ] as const)(
    "devrait cadrer la vue au plus large dans la bande libre du téléphone, centrée, sans en déborder (%s : dist %f)",
    (key, dist) => {
      const cam = cameraFor(key, context({ portrait: true, ...PHONE }));
      expect(cam.offX).toBe(0);
      expect(cam.offY).toBeCloseTo((0.08 + 0.53) / 2 - 0.5, 9);
      expect(cam.dist).toBeCloseTo(dist, 5);
      const { width, near } = diskShares(key, cam.dist);
      const tan = tanHalf(PHONE.fov);
      expect(Math.max(width / (0.8 * PHONE.aspect * tan), near / (0.9 * 0.45 * tan))).toBeCloseTo(1, 9);
    },
  );

  it.each([
    ["stars", 573.985363],
    ["galaxy", 665.963041],
  ] as const)(
    "devrait cadrer la vue au plus large au milieu de la zone libre du grand écran, sans en déborder (%s : dist %f)",
    (key, dist) => {
      const cam = cameraFor(key, context(DESK));
      expect(cam.offX).toBeCloseTo((0.41 + 0.86) / 2 - 0.5, 9);
      expect(cam.offY).toBe(0);
      expect(cam.dist).toBeCloseTo(dist, 5);
      const { width, near } = diskShares(key, cam.dist);
      const tan = tanHalf(DESK.fov);
      expect(Math.max(width / (0.9 * 0.45 * DESK.aspect * tan), near / (0.8 * tan))).toBeCloseTo(1, 9);
    },
  );
});

describe("isCosmicStop", () => {
  it.each([
    ["stars", true],
    ["galaxy", true],
    ["hero", false],
    ["sun", false],
    ["earth", false],
    ["belt", false],
    ["beyond", false],
  ] as const)("devrait classer l'escale %s comme cosmique : %s", (key, expected) => {
    expect(isCosmicStop(key)).toBe(expected);
  });
});

describe("STOP_ORDER", () => {
  it("devrait finir par l'au-delà, les étoiles voisines puis la Voie lactée", () => {
    expect(STOP_ORDER.slice(-3)).toEqual(["beyond", "stars", "galaxy"]);
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

describe("blendCameras", () => {
  const cam = (over: Partial<CamState> = {}): CamState => ({
    tx: 0, ty: 0, tz: 0, dist: 100, azim: 0, elev: 0.2, offX: 0, offY: 0, planet: false, zoom: 0, ...over,
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

  it("devrait interpoler linéairement le zoom cosmique (0 → 4,6 : 1,15 au quart du vol)", () => {
    expect(blendCameras(cam({ zoom: 0 }), cam({ zoom: 4.6 }), 0.25).zoom).toBeCloseTo(1.15, 12);
  });

  it("devrait reculer de 44 % à mi-vol de l'au-delà aux étoiles voisines, cible restée sur le Soleil", () => {
    const ctx = context();
    const mid = blendCameras(cameraFor("beyond", ctx), cameraFor("stars", ctx), 0.5);
    expect(mid.tx).toBeCloseTo(0, 9);
    expect(mid.ty).toBeCloseTo(0, 9);
    expect(mid.tz).toBeCloseTo(0, 9);
    expect(mid.dist).toBeCloseTo(640 * 1.44, 9);
  });

  it("devrait faire glisser la cible en ligne droite du Soleil au centre galactique (étoiles → Voie lactée)", () => {
    const ctx = context();
    const mid = blendCameras(cameraFor("stars", ctx), cameraFor("galaxy", ctx), 0.5);
    // Moitié de la cible de la Voie lactée : rayon cylindrique 37,474 945, hauteur −3,632 400.
    expect(Math.hypot(mid.tx, mid.tz)).toBeCloseTo(37.4749447, 6);
    expect(mid.ty).toBeCloseTo(-3.6324005, 6);
    expect(mid.tx).toBeCloseTo(-2.0660964, 6);
    expect(mid.tz).toBeCloseTo(37.4179466, 6);
  });

  it.each([
    [0.49, true],
    [0.5, false],
  ])("devrait basculer le drapeau planet à mi-vol (t = %f → %s)", (t, expected) => {
    expect(blendCameras(cam({ planet: true }), cam({ planet: false }), t).planet).toBe(expected);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out = cam({ tx: 9, ty: 9, tz: 9, dist: 9, azim: 9, elev: 9, offX: 9, offY: 9, planet: true, zoom: 9 });
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

/*
 * Entrée et sortie de l'exploration : un fondu court entre la dernière caméra affichée et la caméra vivante.
 * Contrairement au vol (blendCameras), ni recul ni arc, et la cible va en ligne droite.
 */
describe("mixCameras", () => {
  const cam = (over: Partial<CamState> = {}): CamState => ({
    tx: 0, ty: 0, tz: 0, dist: 100, azim: 0, elev: 0.2, offX: 0, offY: 0, planet: false, zoom: 0, ...over,
  });

  /** Deux cibles de part et d'autre du Soleil : un vol y ferait reculer, monter et tourner autour du Soleil. */
  const A = cam({ tx: 34, ty: 1, tz: 0, dist: 8, azim: 0.4, elev: 0.1, offX: 0.17, offY: 0, planet: true, zoom: 0 });
  const B = cam({ tx: -50, ty: -3, tz: 20, dist: 18, azim: 2, elev: 0.5, offX: 0, offY: -0.21, planet: false, zoom: 4.6 });

  it("devrait renvoyer la première caméra quand t = 0", () => {
    expectCamera(mixCameras(A, B, 0), A);
  });

  it("devrait renvoyer la seconde caméra quand t = 1", () => {
    expectCamera(mixCameras(A, B, 1), B);
  });

  it("devrait prendre la moyenne géométrique des distances à mi-chemin, sans aucun recul", () => {
    expect(mixCameras(A, B, 0.5).dist).toBeCloseTo(Math.sqrt(8 * 18), 9);
  });

  it("devrait placer la cible au milieu du segment qui joint les deux cibles, sans tourner autour du Soleil", () => {
    const mid = mixCameras(A, B, 0.5);
    expect(mid.tx).toBeCloseTo(-8, 9);
    expect(mid.ty).toBeCloseTo(-1, 9);
    expect(mid.tz).toBeCloseTo(10, 9);
  });

  it("devrait faire tourner l'azimut par le plus court chemin (3,1 → −3,1 passe par π)", () => {
    expectSameAngle(mixCameras(cam({ azim: 3.1 }), cam({ azim: -3.1 }), 0.5).azim, Math.PI, "azim");
  });

  it("devrait interpoler linéairement l'élévation, sans arc, les décalages d'écran et le zoom", () => {
    const mid = mixCameras(A, B, 0.5);
    expect(mid.elev).toBeCloseTo(0.3, 12);
    expect(mid.offX).toBeCloseTo(0.085, 12);
    expect(mid.offY).toBeCloseTo(-0.105, 12);
    expect(mid.zoom).toBeCloseTo(2.3, 12);
  });

  it.each([
    [0.49, true],
    [0.5, false],
  ])("devrait basculer le drapeau planet à mi-chemin (t = %f → %s)", (t, expected) => {
    expect(mixCameras(cam({ planet: true }), cam({ planet: false }), t).planet).toBe(expected);
  });

  it("ne devrait modifier ni a ni b", () => {
    const a = cam({ tx: 34, dist: 8, planet: true });
    const b = cam({ tz: 50, dist: 18, zoom: 4.6 });
    mixCameras(a, b, 0.4);
    expect(a).toEqual(cam({ tx: 34, dist: 8, planet: true }));
    expect(b).toEqual(cam({ tz: 50, dist: 18, zoom: 4.6 }));
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out = cam({ tx: 9, ty: 9, tz: 9, dist: 9, azim: 9, elev: 9, offX: 9, offY: 9, planet: true, zoom: 9 });
    const result = mixCameras(A, B, 0.3, out);
    expect(result).toBe(out);
    expectCamera(out, mixCameras(A, B, 0.3));
  });
});

describe("RING_EXTENT", () => {
  it("devrait donner le rayon extérieur des anneaux visibles, en rayons de la planète : Saturne 2,337, Uranus 2,05", () => {
    expect(RING_EXTENT).toEqual({ saturn: 2.337, uranus: 2.05 });
  });
});

describe("railPercent", () => {
  it("devrait placer 0 UA (le Soleil) à 2 %", () => {
    expect(railPercent(0)).toBe(2);
  });

  it.each([
    [0.3, 6],
    [1, 24.8268],
    [50, 86],
  ])("devrait suivre l'échelle logarithmique 6 + 80 × ln(au / 0,3) / ln(50 / 0,3) jusqu'à 50 UA (%f UA → %f)", (au, expected) => {
    expect(railPercent(au)).toBeCloseTo(expected, 4);
  });

  it.each([
    [1000, 88.09706],
    [AU_PER_LY, 91],
  ])("devrait comprimer de 50 UA à 1 al : 86 + 5 × ln(au / 50) / ln(1 al / 50 UA) (%f UA → %f)", (au, expected) => {
    expect(railPercent(au)).toBeCloseTo(expected, 4);
  });

  it.each([
    [4.2465, 91.87924],
    [27_000, 97.20391],
    [100_000, 98],
    [200_000, 98],
  ])("devrait compter en années-lumière au-delà : 91 + 7 × ln(d / 1 al) / ln(100 000), au plus 98 (%f al → %f)", (ly, expected) => {
    expect(railPercent(ly * AU_PER_LY)).toBeCloseTo(expected, 4);
  });

  it.each([[50], [AU_PER_LY]])("devrait rester continue au raccord de deux segments (%f UA)", (au) => {
    expect(Math.abs(railPercent(au - 1e-7) - railPercent(au + 1e-7))).toBeLessThan(1e-5);
  });

  const consecutiveStops = RAIL_STOPS.slice(1).map((stop, i) => [RAIL_STOPS[i].key, stop.key, RAIL_STOPS[i].au, stop.au] as const);

  it.each(consecutiveStops)("devrait placer %s avant %s sur la règle", (_inner, _outer, innerAu, outerAu) => {
    expect(railPercent(outerAu)).toBeGreaterThan(railPercent(innerAu));
  });
});

describe("RAIL_STOPS", () => {
  it("devrait compter treize repères, du Soleil à la Voie lactée, dans l'ordre du voyage", () => {
    expect(RAIL_STOPS.map((stop) => stop.key)).toEqual([
      "sun", "mercury", "venus", "earth", "mars", "belt", "jupiter", "saturn", "uranus", "neptune", "beyond", "stars", "galaxy",
    ]);
  });

  it("devrait placer les étoiles voisines à Proxima du Centaure et la Voie lactée à son centre", () => {
    const lightYears = (key: StopKey) => (RAIL_STOPS.find((stop) => stop.key === key)?.au ?? Number.NaN) / AU_PER_LY;
    expect(lightYears("stars")).toBeCloseTo(4.2465, 6);
    expect(lightYears("galaxy")).toBeCloseTo(27_000, 3);
  });
});

describe("RAIL_BREAK", () => {
  it("devrait interrompre l'axe entre l'au-delà (84,35 %) et les étoiles voisines (91,88 %)", () => {
    expect(RAIL_BREAK.from).toBeGreaterThan(railPercent(45));
    expect(RAIL_BREAK.to).toBeGreaterThan(RAIL_BREAK.from);
    expect(RAIL_BREAK.to).toBeLessThan(railPercent(4.2465 * AU_PER_LY));
  });
});

describe("cameraFor en mise en page mobile (bande libre mesurée)", () => {
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

describe("cameraFor sur grand écran (zone libre entre la plaque et la règle)", () => {
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
