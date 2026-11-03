import { Matrix4, Vector3, type BufferGeometry, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import {
  DISTANCE_RINGS_LY,
  GALAXY_BOUNDING_RADIUS_LY,
  STAR_HALO,
  SUN_POINT_SIZE_PX,
  buildGalaxy,
  createCosmos,
  magnifyGalaxy,
  starLabelOrder,
  sunPointPosition,
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
    key: "proxima-centauri", raDeg: 217.42895, decDeg: -62.67949, distanceLy: 4.2465, spectralType: "M5.5Ve",
    apparentMag: 11.13,
  },
  { key: "sirius", raDeg: 101.287155, decDeg: -16.716116, distanceLy: 8.6, spectralType: "A1V", apparentMag: -1.46 },
  { key: "altair", raDeg: 297.6958, decDeg: 8.8683, distanceLy: 16.73, spectralType: "A7V", apparentMag: 0.76 },
];

const NO_WEIGHT: LayerWeights = {
  solar: 0, planetLabels: 0, sunPoint: 0, sky: 0, stars: 0, galaxy: 0, galaxyLabels: 0, here: 0, sunLabel: 0, localGroup: 0,
  web: 0, cmb: 0, multiverse: 0,
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

describe("starLabelOrder", () => {
  /** Une étoile réduite à ce que lit l'ordre des étiquettes : clé, distance, et si elle est remarquable. */
  const star = (key: string, distanceLy: number, notable = false): NearbyStar => ({
    key, raDeg: 0, decDeg: 0, distanceLy, spectralType: "M5V", apparentMag: 10, ...(notable ? { notable: true } : {}),
  });

  it("devrait placer les étoiles remarquables d'abord, puis les autres, chacune dans l'ordre des données", () => {
    const stars = [star("a", 4.2, true), star("b", 5), star("c", 6, true), star("d", 7), star("e", 8.6, true)];
    expect(starLabelOrder(stars)).toEqual(["a", "c", "e", "b", "d"]);
  });

  it("devrait garder l'ordre des données quand aucune n'est remarquable", () => {
    expect(starLabelOrder(STARS)).toEqual(["proxima-centauri", "sirius", "altair"]);
  });
});

describe("halo des étoiles voisines", () => {
  it("devrait entourer le point de chaque étoile d'un halo doux, plus large que lui", () => {
    const { defines } = createCosmos(STARS).stars.material;
    expect(defines.STAR_HALO).toBe("");
    expect(Number(defines.STAR_HALO_SCALE)).toBe(STAR_HALO.scale);
    expect(Number(defines.STAR_HALO_STRENGTH)).toBe(STAR_HALO.strength);
    expect(STAR_HALO.scale).toBeGreaterThan(1);
    // Constantes GLSL flottantes : un entier (« 3 ») ne compilerait pas dans une expression flottante.
    expect(defines.STAR_HALO_SCALE).toMatch(/\./);
    expect(defines.STAR_HALO_STRENGTH).toMatch(/\./);
  });

  it("ne devrait toucher ni au point-Soleil ni à la galaxie, qui partagent le même programme", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 100);
    expect(cosmos.sunPoint.material.defines.STAR_HALO).toBeUndefined();
    expect(galaxyOf(cosmos).material.defines.STAR_HALO).toBeUndefined();
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

  it("devrait mêler les points de la galaxie : tout début du nuage en est un échantillon fidèle (niveau de détail)", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 4000);
    const position = galaxyOf(cosmos).geometry.getAttribute("position");
    const points = Array.from({ length: position.count }, (_, i) => new Vector3().fromBufferAttribute(position, i));
    const center = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(points.length);
    const spread = (sample: readonly Vector3[]) => Math.sqrt(sample.reduce((sum, p) => sum + p.distanceToSquared(center), 0) / sample.length);
    // Tiré bulbe d'abord, le début du nuage serait cinq fois plus serré que la galaxie.
    expect(spread(points.slice(0, 400)) / spread(points)).toBeGreaterThan(0.9);
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

  /*
   * Au retour sur le Voyage, Next rend la page gardée masquée et la scène se reconstruit : la galaxie (graine fixe)
   * reprend les tableaux déjà tirés au lieu de les tirer de nouveau.
   */
  it("devrait reprendre les tableaux déjà tirés pour le même nombre de points, au lieu de les tirer de nouveau", () => {
    const first = createCosmos(STARS);
    buildGalaxy(first, 1000);
    const second = createCosmos(STARS);
    buildGalaxy(second, 1000);
    for (const name of ["position", "color", "size"]) {
      expect(galaxyOf(second).geometry.getAttribute(name).array).toBe(galaxyOf(first).geometry.getAttribute(name).array);
    }
  });

  it("devrait tirer un autre nuage pour un autre nombre de points", () => {
    const small = createCosmos(STARS);
    buildGalaxy(small, 1000);
    const large = createCosmos(STARS);
    buildGalaxy(large, 2000);
    expect(galaxyOf(large).geometry.getAttribute("position").count).toBe(2000);
    expect(galaxyOf(small).geometry.getAttribute("position").count).toBe(1000);
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

describe("magnifyGalaxy", () => {
  const center = sceneFromGalacticXYZ(GALACTIC_CENTER_DISTANCE_LY, 0, 0);

  it("devrait tout laisser en place à sa vraie taille (grossissement 1)", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 500);
    const before = verticesInGroup(galaxyOf(cosmos), cosmos.group);
    magnifyGalaxy(cosmos, 1);
    expect(verticesInGroup(galaxyOf(cosmos), cosmos.group)).toEqual(before.map((p) => closeTo(p, 6)));
    expect(sunPointPosition(cosmos, new Vector3()).length()).toBe(0);
  });

  it("devrait grossir la galaxie autour de son centre : chaque point s'en éloigne d'autant", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 500);
    const before = verticesInGroup(galaxyOf(cosmos), cosmos.group);
    magnifyGalaxy(cosmos, 4);
    const expected = before.map((p) => ({
      x: center.x + 4 * (p.x - center.x),
      y: center.y + 4 * (p.y - center.y),
      z: center.z + 4 * (p.z - center.z),
    }));
    expect(verticesInGroup(galaxyOf(cosmos), cosmos.group)).toEqual(expected.map((p) => closeTo(p, 3)));
  });

  it("devrait garder le Soleil à sa place dans le disque grossi : point-Soleil en c + 4 (0 − c)", () => {
    const cosmos = createCosmos(STARS);
    buildGalaxy(cosmos, 500);
    magnifyGalaxy(cosmos, 4);
    const sun = sunPointPosition(cosmos, new Vector3());
    expect({ x: sun.x, y: sun.y, z: sun.z }).toEqual(closeTo({ x: -3 * center.x, y: -3 * center.y, z: -3 * center.z }, 6));
    expect(verticesInGroup(cosmos.sunPoint, cosmos.group)).toEqual([closeTo({ x: sun.x, y: sun.y, z: sun.z }, 6)]);
  });

  it("devrait déplacer le point-Soleil même avant la construction de la galaxie, et la grossir une fois construite", () => {
    const cosmos = createCosmos(STARS);
    magnifyGalaxy(cosmos, 4);
    expect(sunPointPosition(cosmos, new Vector3()).distanceTo(new Vector3(center.x, center.y, center.z))).toBeCloseTo(
      4 * GALACTIC_CENTER_DISTANCE_LY,
      3,
    );
    buildGalaxy(cosmos, 500);
    magnifyGalaxy(cosmos, 4);
    expect(galaxyOf(cosmos).scale.x).toBe(4);
  });
});
