import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";
import {
  BLACK_HOLE_LOOKS,
  BLACK_HOLE_RENDER_ORDER,
  diskAxis,
  LENS_QUAD_RS,
  requiredExtentRs,
} from "@/components/scene/blackHole";
import { createStarfieldBackground, MAX_STARFIELD_LENSES } from "@/components/scene/starfield";
import {
  BLACK_HOLE_LOOK_OF,
  createSizesObjects,
  labelJetOf,
  showObjects,
  updateBlackHoles,
  type SizesObjectMesh,
} from "@/components/sizes/sizesObjects";
import type { BlackHoleKey } from "@/lib/astro/blackHoles";
import { DESKTOP_RAY_STEPS, startRay, traceRay, type DiskPlane, type RayStart } from "@/lib/astro/photonGeodesic";
import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { placeObjects } from "@/lib/sizes/layout";
import { BLACK_HOLE_EXTENT_RS, BLACK_HOLE_VISIBLE_RS, COMPARED_OBJECTS, layoutInput } from "@/lib/sizes/objects";
import { SIZES_VIEW_ELEV_DEG } from "@/lib/sizes/sizesCamera";

/*
 * Astres 3D de la page « Tailles », construits sans WebGL (Three crée maillages et matériaux sans rendu) : une sphère
 * et un halo par étoile, un rectangle de lancer de rayons par trou noir, à la place de la disposition ; astres dessinés,
 * fondu d'arrivée, effacement près de la règle, lentilles du fond étoilé.
 */

const PLACED = placeObjects(COMPARED_OBJECTS.map(layoutInput));
const INDICES = COMPARED_OBJECTS.map((_, i) => i);
const HOLES = Object.keys(BLACK_HOLE_LOOK_OF) as BlackHoleKey[];

const build = () =>
  createSizesObjects(COMPARED_OBJECTS, PLACED, {
    time: { value: 0 },
    lite: false,
    sunSpots: null,
    starfield: createStarfieldBackground().uniforms,
  });

/** Astre dessiné : corps d'une étoile, rectangle d'un trou noir. */
const drawn = (item: SizesObjectMesh) => (item.kind === "star" ? item.body.visible : item.hole.mesh.visible);
const indexOf = (key: string) => COMPARED_OBJECTS.findIndex((object) => object.key === key);

function hole(items: readonly SizesObjectMesh[], key: BlackHoleKey) {
  const item = items[indexOf(key)];
  if (item.kind !== "black-hole") throw new Error(`${key} n'est pas un trou noir`);
  return item.hole;
}

function star(items: readonly SizesObjectMesh[], key: string) {
  const item = items[indexOf(key)];
  if (item.kind !== "star") throw new Error(`${key} n'est pas une étoile`);
  return item;
}

describe("BLACK_HOLE_LOOK_OF", () => {
  it.each(HOLES)("devrait garder ce qu'éclaire l'aspect de %s dans son encombrement", (key) => {
    expect(requiredExtentRs(BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF[key]])).toBeLessThanOrEqual(BLACK_HOLE_EXTENT_RS[key]);
  });

  it("devrait donner son aspect à chaque trou noir : binaire X, anneau ténu, anneau et jet, dormant", () => {
    expect(BLACK_HOLE_LOOK_OF).toEqual({
      "cygnus-x-1": "x-ray-binary",
      "sagittarius-a-star": "faint-ring",
      "m87-star": "jet-ring",
      "cosmic-horseshoe": "dormant",
    });
  });
});

/*
 * Ce qui se voit de chaque trou noir (BLACK_HOLE_VISIBLE_RS), d'après son aspect et le modèle de la lumière : rayons
 * tracés depuis une caméra élevée comme celle de l'onglet, de 35 à 10 000 r_s ; b(r) = r / √(1 − 1/r), rayon
 * apparent de la lumière émise au rayon r (blackHole.ts, lensedRadiusBound). Rien de ce qui compte ne dépasse la
 * valeur, qui le serre à 0,3 r_s près : l'étiquette se pose juste au-delà.
 */
describe("BLACK_HOLE_VISIBLE_RS, d'après les aspects", () => {
  const DEG = Math.PI / 180;
  const lensedBound = (radiusRs: number) => radiusRs / Math.sqrt(1 - 1 / radiusRs);

  /** Rayons d'une caméra à `distanceRs` du trou noir, élevée comme celle de l'onglet, par le point (u, w) de son plan. */
  function cameraAt(distanceRs: number): (u: number, w: number) => RayStart {
    const elevation = SIZES_VIEW_ELEV_DEG * DEG;
    const position = { x: 0, y: distanceRs * Math.sin(elevation), z: distanceRs * Math.cos(elevation) };
    const up = { y: Math.cos(elevation), z: -Math.sin(elevation) };
    return (u, w) => {
      const direction = { x: u, y: w * up.y - position.y, z: w * up.z - position.z };
      const length = Math.hypot(direction.x, direction.y, direction.z);
      return startRay(position, { x: direction.x / length, y: direction.y / length, z: direction.z / length }, LENS_QUAD_RS);
    };
  }

  const crossesDisk = (ray: RayStart, disk: DiskPlane) =>
    traceRay(ray.position, ray.velocity, ray.escapeRs, disk, DESKTOP_RAY_STEPS, LENS_QUAD_RS).crossings.length > 0;

  it("devrait borner l'image déviée du disque de Cygnus X-1, au-dessus et au-dessous de l'ombre", () => {
    const look = BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF["cygnus-x-1"]];
    if (!look.disk) throw new Error("Cygnus X-1 sans disque");
    const { innerRs, outerRs } = look.disk;
    const disk = { normal: diskAxis(look.inclinationDeg, look.positionAngleDeg), innerRs, outerRs };
    const { up, down } = BLACK_HOLE_VISIBLE_RS["cygnus-x-1"];
    const columns = Array.from({ length: 73 }, (_, k) => -9 + k * 0.25);
    const middle = columns.filter((u) => Math.abs(u) <= 1.5);
    const rowAt = (distanceRs: number) => {
      const ray = cameraAt(distanceRs);
      return (w: number, us: readonly number[]) => us.some((u) => crossesDisk(ray(u, w), disk));
    };
    for (const distanceRs of [35, 70, 1000, 10_000]) {
      const row = rowAt(distanceRs);
      for (let step = 1; step <= 40; step++) {
        expect(row(up + 0.05 * step, columns), `au-dessus, à ${distanceRs} r_s`).toBe(false);
        expect(row(-down - 0.05 * step, columns), `au-dessous, à ${distanceRs} r_s`).toBe(false);
      }
    }
    // Vue de loin, l'image est la plus haute (de près, la perspective la réduit de 0,5 r_s au plus).
    const far = rowAt(1000);
    expect(far(up - 0.3, middle), "sommet, vu de loin").toBe(true);
    expect(far(-down + 0.3, middle), "bas, vu de loin").toBe(true);
  });

  it("ne devrait compter de Cygnus X-1 que son disque : sa couronne reste ténue, son anneau de photons serré contre l'ombre", () => {
    const look = BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF["cygnus-x-1"]];
    expect(look.flow?.gain ?? 0).toBeLessThan(0.05);
    expect(SHADOW_RADIUS_RS + 5 * (look.glow?.ringWidthRs ?? 0)).toBeLessThan(BLACK_HOLE_VISIBLE_RS["cygnus-x-1"].down);
  });

  it.each(["sagittarius-a-star", "m87-star"] as const)("devrait borner l'anneau de %s par l'image du bord de son gaz", (key) => {
    const flow = BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF[key]].flow;
    if (!flow) throw new Error(`${key} sans gaz`);
    const bound = lensedBound(flow.outerRs);
    for (const reach of Object.values(BLACK_HOLE_VISIBLE_RS[key])) {
      expect(reach).toBeGreaterThanOrEqual(bound);
      expect(reach).toBeLessThan(bound + 0.1);
    }
  });

  it("devrait borner le Fer à cheval cosmique par son ombre et son anneau de photons, la lueur diffuse passant sous l'étiquette", () => {
    const glow = BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF["cosmic-horseshoe"]].glow;
    if (!glow) throw new Error("Fer à cheval cosmique sans lueur");
    for (const reach of Object.values(BLACK_HOLE_VISIBLE_RS["cosmic-horseshoe"])) {
      // L'anneau de photons y est éteint (moins de 1 % de son éclat), et l'étiquette reste près de lui.
      expect(Math.exp(-(reach - SHADOW_RADIUS_RS) / glow.ringWidthRs)).toBeLessThan(0.01);
      expect(reach - SHADOW_RADIUS_RS).toBeLessThan(0.3);
    }
  });
});

describe("labelJetOf", () => {
  it("devrait donner aux étiquettes le jet de M87* : l'axe du disque, côté qui s'approche, et les mesures de son aspect", () => {
    const look = BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF["m87-star"]];
    if (!look.jet) throw new Error("M87* sans jet");
    const axis = diskAxis(look.inclinationDeg, look.positionAngleDeg);
    expect(labelJetOf("m87-star")).toEqual({
      axis: { x: axis.x, y: axis.y, z: axis.z },
      lengthRs: look.jet.lengthRs,
      widthRs: look.jet.widthRs,
      spread: expect.closeTo(Math.tan((look.jet.halfAngleDeg * Math.PI) / 180), 12),
    });
  });

  it.each(["cygnus-x-1", "sagittarius-a-star", "cosmic-horseshoe"] as const)("ne devrait pas donner de jet à %s", (key) => {
    expect(labelJetOf(key)).toBeNull();
  });
});

describe("createSizesObjects", () => {
  it("devrait poser un astre par escale, dans l'ordre et à la place de la disposition", () => {
    const { items } = build();
    expect(items.map((item) => [item.key, item.kind === "star" ? item.body.position.x : item.hole.mesh.position.x])).toEqual(
      PLACED.map((placed) => [placed.key, placed.x]),
    );
  });

  it("devrait mettre chaque étoile à l'échelle de son rayon, et donner à chaque trou noir son rayon d'horizon", () => {
    const { items } = build();
    expect(star(items, "betelgeuse").body.scale.x).toBe(764);
    for (const key of HOLES) {
      expect(hole(items, key).mesh.material.uniforms.uRadius.value).toBe(COMPARED_OBJECTS[indexOf(key)].radiusSolar);
    }
  });

  it("devrait ranger tous les maillages dans un seul groupe : corps et halo par étoile, rectangle par trou noir", () => {
    const { group } = build();
    expect(group.children).toHaveLength(2 * 10 + 4);
  });

  it("devrait dessiner les trous noirs après le fond, les corps des étoiles, puis leurs halos additifs", () => {
    const { items } = build();
    expect(hole(items, "m87-star").mesh.renderOrder).toBe(BLACK_HOLE_RENDER_ORDER);
    expect(star(items, "sun").body.renderOrder).toBe(0);
    expect(star(items, "sun").halo.renderOrder).toBe(1);
  });

  it("devrait rendre transparent le corps des étoiles, pour qu'il s'efface près de la règle", () => {
    const { items } = build();
    expect(star(items, "rigel").body.material.transparent).toBe(true);
  });

  it("devrait faire lire à chaque trou noir les uniformes du ciel du fond, les mêmes objets", () => {
    const starfield = createStarfieldBackground();
    const { items } = createSizesObjects(COMPARED_OBJECTS, PLACED, { time: { value: 0 }, lite: true, sunSpots: null, starfield: starfield.uniforms });
    expect(hole(items, "cygnus-x-1").mesh.material.uniforms.uNight).toBe(starfield.uniforms.uNight);
  });

  it("devrait ne montrer au départ que le plus petit, Cygnus X-1 (repos sur l'introduction)", () => {
    const { items } = build();
    expect(items.map(drawn)).toEqual(INDICES.map((i) => i === 0));
  });
});

describe("showObjects", () => {
  it("devrait dessiner les astres 0 à 7 au repos sur Sagittarius A* (7), pleinement", () => {
    const { items } = build();
    showObjects(items, 7, 7, 0);
    expect(items.map(drawn)).toEqual(INDICES.map((i) => i <= 7));
    expect(hole(items, "sagittarius-a-star").opacity.value).toBe(1);
  });

  it("devrait faire entrer un trou noir en fondu au début du vol vers lui (6 → 7 à t = 0,15 : 0,5)", () => {
    const { items } = build();
    showObjects(items, 6, 7, 0.15);
    expect(drawn(items[7])).toBe(true);
    expect(hole(items, "sagittarius-a-star").opacity.value).toBeCloseTo(0.5, 12);
  });

  it("devrait multiplier l'opacité par l'effacement près de la règle : halo et surface d'une étoile, trou noir", () => {
    const { items } = build();
    const fits = INDICES.map((i) => (i === indexOf("pollux") || i === indexOf("cygnus-x-1") ? 0.4 : 1));
    showObjects(items, 8, 8, 0, fits);
    expect(star(items, "pollux").surface.uOpacity.value).toBeCloseTo(0.4, 12);
    expect(star(items, "pollux").haloOpacity.value).toBeCloseTo(0.4, 12);
    expect(hole(items, "cygnus-x-1").opacity.value).toBeCloseTo(0.4, 12);
  });

  it("ne devrait pas dessiner un astre tout à fait effacé", () => {
    const { items } = build();
    const fits = INDICES.map((i) => (i === indexOf("arcturus") ? 0 : 1));
    showObjects(items, 8, 8, 0, fits);
    expect(star(items, "arcturus").body.visible).toBe(false);
    expect(star(items, "arcturus").halo.visible).toBe(false);
  });

  it("ne devrait pas dessiner un trou noir de moins d'un demi-pixel : son étiquette à anneau le marque", () => {
    const { items } = build();
    const radii = INDICES.map((i) => (i === 0 ? 0.3 : 50));
    showObjects(items, 13, 13, 0, undefined, radii);
    expect(hole(items, "cygnus-x-1").mesh.visible).toBe(false);
    expect(hole(items, "m87-star").mesh.visible).toBe(true);
  });
});

describe("updateBlackHoles", () => {
  it("devrait suivre la caméra et donner au fond les lentilles des trous noirs dessinés, les plus grands à l'écran d'abord", () => {
    const { items } = build();
    showObjects(items, 13, 13, 0);
    const camera = new PerspectiveCamera(36, 1.6, 1, 1e9);
    camera.position.set(PLACED[13].x, 0, 4e6);
    camera.updateMatrixWorld();
    const radii = INDICES.map((i) => [5, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 40, 300][i]);
    const lenses = updateBlackHoles(items, camera, radii);
    expect(lenses.map((lens) => lens.cameraLocal)).toEqual(
      ["cosmic-horseshoe", "m87-star", "cygnus-x-1", "sagittarius-a-star"].map((key) => hole(items, key as BlackHoleKey).cameraLocal),
    );
    expect(hole(items, "cosmic-horseshoe").cameraLocal.z).toBeCloseTo(4e6 / COMPARED_OBJECTS[13].radiusSolar, 6);
    expect(lenses.every((lens) => lens.strength === 1)).toBe(true);
    expect(lenses.length).toBeLessThanOrEqual(MAX_STARFIELD_LENSES);
  });

  it("devrait n'en garder que les quatre plus grands à l'écran quand cinq trous noirs sont dessinés", () => {
    const holes = COMPARED_OBJECTS.filter((object) => object.kind === "black-hole");
    const objects = [...holes, holes[0]];
    const placed = objects.map((object, i) => ({ key: object.key, radius: 1, extent: 10, x: -100 * i }));
    const { items } = createSizesObjects(objects, placed, {
      time: { value: 0 },
      lite: false,
      sunSpots: null,
      starfield: createStarfieldBackground().uniforms,
    });
    showObjects(items, 4, 4, 0);
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 1000);
    camera.updateMatrixWorld();
    const radii = [5, 1, 4, 3, 2];
    const lenses = updateBlackHoles(items, camera, radii);
    const local = (index: number) => {
      const item = items[index];
      if (item.kind !== "black-hole") throw new Error("Trou noir attendu");
      return item.hole.cameraLocal;
    };
    expect(lenses).toHaveLength(MAX_STARFIELD_LENSES);
    expect(lenses.map((lens) => lens.cameraLocal)).toEqual([0, 2, 3, 4].map(local));
  });

  it("ne devrait rien donner pour un trou noir qui n'est pas dessiné", () => {
    const { items } = build();
    showObjects(items, 1, 1, 0);
    const camera = new PerspectiveCamera();
    camera.updateMatrixWorld();
    expect(updateBlackHoles(items, camera, INDICES.map(() => 10))).toHaveLength(1);
  });
});
