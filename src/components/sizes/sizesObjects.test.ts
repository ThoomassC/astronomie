import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";
import { BLACK_HOLE_LOOKS, BLACK_HOLE_RENDER_ORDER, requiredExtentRs } from "@/components/scene/blackHole";
import { createStarfieldBackground, MAX_STARFIELD_LENSES } from "@/components/scene/starfield";
import { BLACK_HOLE_LOOK_OF, createSizesObjects, showObjects, updateBlackHoles, type SizesObjectMesh } from "@/components/sizes/sizesObjects";
import type { BlackHoleKey } from "@/lib/astro/blackHoles";
import { placeObjects } from "@/lib/sizes/layout";
import { BLACK_HOLE_EXTENT_RS, COMPARED_OBJECTS, layoutInput } from "@/lib/sizes/objects";

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
