import { Matrix4, Vector3, type BufferGeometry, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import {
  DISTANCE_RINGS_LY,
  GALAXY_BOUNDING_RADIUS_LY,
  SUN_POINT_SIZE_PX,
  buildGalaxy,
  createCosmos,
  weighCosmos,
  type CosmosBody,
} from "@/components/scene/cosmos";
import type { LayerWeights } from "@/components/scene/layers";
import type { Vec3 } from "@/lib/astro/constants";
import { GALACTIC_CENTER_DISTANCE_LY, sceneFromGalacticXYZ } from "@/lib/astro/galactic";
import { absoluteMagnitude, starPointSize, starPositionLy } from "@/lib/astro/starMap";
import type { NearbyStar } from "@/lib/astro/stars";

/** Trois étoiles fixées par le test (SIMBAD, Gaia DR3), indépendantes du fichier de données. */
const STARS: readonly NearbyStar[] = [
  {
    key: "proxima-centauri", name: "Proxima du Centaure", raDeg: 217.42895, decDeg: -62.67949, distanceLy: 4.2465,
    spectralType: "M5.5Ve", apparentMag: 11.13,
  },
  { key: "sirius", name: "Sirius", raDeg: 101.287155, decDeg: -16.716116, distanceLy: 8.6, spectralType: "A1V", apparentMag: -1.46 },
  { key: "altair", name: "Altaïr", raDeg: 297.6958, decDeg: 8.8683, distanceLy: 16.73, spectralType: "A7V", apparentMag: 0.76 },
];

const NO_WEIGHT: LayerWeights = {
  solar: 0, planetLabels: 0, sunPoint: 0, sky: 0, stars: 0, galaxy: 0, galaxyLabels: 0, here: 0, localGroup: 0, web: 0, cmb: 0,
  multiverse: 0,
};

/** Sommets d'un objet, exprimés dans le repère du groupe du cosmos (années-lumière), transformations locales comprises. */
function verticesInGroup(object: Object3D & { geometry: BufferGeometry }, group: Object3D): Vec3[] {
  group.updateMatrixWorld(true);
  const toGroup = new Matrix4().copy(group.matrixWorld).invert().multiply(object.matrixWorld);
  const position = object.geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, i) => {
    const { x, y, z } = new Vector3().fromBufferAttribute(position, i).applyMatrix4(toGroup);
    return { x, y, z };
  });
}

/** Rangé dans le groupe, directement ou non. */
const isInGroup = (object: Object3D, group: Object3D) => group.getObjectById(object.id) === object;

function countObjects(group: Object3D): number {
  let count = 0;
  group.traverse(() => {
    count += 1;
  });
  return count;
}

function galaxyOf(cosmos: CosmosBody) {
  if (!cosmos.galaxy) throw new Error("Galaxie absente");
  return cosmos.galaxy;
}

const closeTo = (p: Vec3, digits: number) => ({
  x: expect.closeTo(p.x, digits),
  y: expect.closeTo(p.y, digits),
  z: expect.closeTo(p.z, digits),
});

describe("createCosmos", () => {
  it("devrait poser un point par étoile, à sa position en années-lumière (starPositionLy)", () => {
    const cosmos = createCosmos(STARS);
    expect(verticesInGroup(cosmos.stars, cosmos.group)).toEqual(STARS.map((star) => closeTo(starPositionLy(star), 5)));
  });

  it("devrait donner à chaque point la taille tirée de la magnitude absolue de son étoile", () => {
    const sizes = createCosmos(STARS).stars.geometry.getAttribute("size");
    const expected = STARS.map((star) => expect.closeTo(starPointSize(absoluteMagnitude(star.apparentMag, star.distanceLy)), 5));
    expect(Array.from({ length: sizes.count }, (_, i) => sizes.getX(i))).toEqual(expected);
  });

  it("devrait indexer la taille du point de chaque étoile par sa clé (boîtes que les étiquettes évitent)", () => {
    const cosmos = createCosmos(STARS);
    expect([...cosmos.starSizes]).toEqual(
      STARS.map((star) => [star.key, expect.closeTo(starPointSize(absoluteMagnitude(star.apparentMag, star.distanceLy)), 5)]),
    );
  });

  it("devrait donner au point-Soleil la taille annoncée, en px CSS", () => {
    const size = createCosmos(STARS).sunPoint.geometry.getAttribute("size");
    expect(size.getX(0)).toBe(SUN_POINT_SIZE_PX);
  });

  it("devrait indexer la position de chaque étoile par sa clé (ancres des étiquettes)", () => {
    const cosmos = createCosmos(STARS);
    expect([...cosmos.starPositions.keys()]).toEqual(["proxima-centauri", "sirius", "altair"]);
    expect(cosmos.starPositions.get("sirius")).toEqual(closeTo(starPositionLy(STARS[1]), 5));
  });

  it("devrait tracer deux cercles de distance, à 5 et 10 al", () => {
    expect(DISTANCE_RINGS_LY).toEqual([5, 10]);
    expect(createCosmos(STARS).rings).toHaveLength(2);
  });

  it.each([
    [0, 5],
    [1, 10],
  ])("devrait tracer le cercle n° %i à %i al du Soleil, dans le plan de l'écliptique", (index, radius) => {
    const cosmos = createCosmos(STARS);
    const vertices = verticesInGroup(cosmos.rings[index], cosmos.group);
    expect(Math.max(...vertices.map((v) => Math.abs(v.y)))).toBeLessThan(1e-6);
    expect(Math.max(...vertices.map((v) => Math.abs(Math.hypot(v.x, v.z) - radius)))).toBeLessThan(1e-6);
  });

  it("devrait poser le Soleil vu de loin en un seul point, à l'origine", () => {
    const cosmos = createCosmos(STARS);
    expect(verticesInGroup(cosmos.sunPoint, cosmos.group)).toEqual([closeTo({ x: 0, y: 0, z: 0 }, 9)]);
  });

  it("devrait ranger étoiles, point-Soleil et cercles dans le groupe mis à l'échelle des années-lumière", () => {
    const cosmos = createCosmos(STARS);
    const parts = [cosmos.stars, cosmos.sunPoint, ...cosmos.rings];
    expect(parts.map((part) => isInGroup(part, cosmos.group))).toEqual(parts.map(() => true));
  });

  it("ne devrait pas construire la galaxie à la création", () => {
    expect(createCosmos(STARS).galaxy).toBeNull();
  });
});

describe("buildGalaxy", () => {
  it("devrait construire une galaxie du nombre de points demandé et la ranger dans le groupe", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 1000);
    const galaxy = galaxyOf(cosmos);
    expect(galaxy.geometry.getAttribute("position").count).toBe(1000);
    expect(isInGroup(galaxy, cosmos.group)).toBe(true);
  });

  it("ne devrait rien reconstruire au second appel (même galaxie, aucun objet en double)", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 1000);
    const first = galaxyOf(cosmos);
    const objects = countObjects(cosmos.group);
    buildGalaxy(cosmos, 1000);
    expect(cosmos.galaxy).toBe(first);
    expect(countObjects(cosmos.group)).toBe(objects);
  });

  it("devrait poser une sphère englobante analytique : centrée sur le centre galactique, de 60 000 al de rayon", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 1000);
    const sphere = galaxyOf(cosmos).geometry.boundingSphere;
    const center = sceneFromGalacticXYZ(GALACTIC_CENTER_DISTANCE_LY, 0, 0);
    expect(GALAXY_BOUNDING_RADIUS_LY).toBe(60_000);
    expect(sphere?.radius).toBe(GALAXY_BOUNDING_RADIUS_LY);
    expect(sphere && { x: sphere.center.x, y: sphere.center.y, z: sphere.center.z }).toEqual(closeTo(center, 6));
  });

  it.each([16_000, 40_000])("devrait contenir tous les points de la galaxie dans sa sphère englobante (%i points)", (count) => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, count);
    const { geometry } = galaxyOf(cosmos);
    const sphere = geometry.boundingSphere;
    if (!sphere) throw new Error("Sphère englobante absente");
    const position = geometry.getAttribute("position");
    const point = new Vector3();
    let farthest = 0;
    for (let i = 0; i < position.count; i++) {
      farthest = Math.max(farthest, point.fromBufferAttribute(position, i).distanceTo(sphere.center));
    }
    expect(farthest).toBeLessThanOrEqual(sphere.radius);
  });
});

describe("weighCosmos", () => {
  it("devrait cacher étoiles, cercles, point-Soleil et galaxie quand leurs poids sont nuls (aucun appel de dessin)", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 200);
    weighCosmos(cosmos, NO_WEIGHT);
    const parts = [cosmos.stars, ...cosmos.rings, cosmos.sunPoint, galaxyOf(cosmos)];
    expect(parts.map((part) => part.visible)).toEqual(parts.map(() => false));
  });

  it("devrait montrer étoiles et cercles à mi-poids : points à l'opacité 0,5, cercles à 0,35 × 0,5", () => {
    const cosmos = createCosmos(STARS);
    weighCosmos(cosmos, { ...NO_WEIGHT, stars: 0.5 });
    expect(cosmos.stars.visible).toBe(true);
    expect(cosmos.stars.material.uniforms.uOpacity.value).toBeCloseTo(0.5, 12);
    expect(cosmos.rings.map((ring) => ring.visible)).toEqual([true, true]);
    expect(cosmos.rings.map((ring) => ring.material.opacity)).toEqual([expect.closeTo(0.175, 12), expect.closeTo(0.175, 12)]);
  });

  it("devrait montrer la galaxie selon son propre poids", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 200);
    weighCosmos(cosmos, { ...NO_WEIGHT, galaxy: 0.25 });
    expect(galaxyOf(cosmos).visible).toBe(true);
    expect(galaxyOf(cosmos).material.uniforms.uOpacity.value).toBeCloseTo(0.25, 12);
  });

  it("devrait montrer le point-Soleil selon son propre poids", () => {
    const cosmos = createCosmos(STARS);
    weighCosmos(cosmos, { ...NO_WEIGHT, sunPoint: 0.8 });
    expect(cosmos.sunPoint.visible).toBe(true);
    expect(cosmos.sunPoint.material.uniforms.uOpacity.value).toBeCloseTo(0.8, 12);
  });
});
