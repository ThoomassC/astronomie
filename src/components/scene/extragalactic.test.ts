import { Matrix4, Vector3, type BufferGeometry, type Object3D, type Points, type ShaderMaterial } from "three";
import { describe, expect, it } from "vitest";
import {
  EXTRAGALACTIC_LABEL_ORDER,
  LABELLED_GALAXIES,
  LOCAL_GROUP_FULL_LIGHT_PX,
  LOCAL_GROUP_MIN_DRAWN,
  LOCAL_GROUP_MIN_GAIN,
  LOCAL_GROUP_MIN_POINTS,
  LOCAL_GROUP_POINT_BUDGET,
  WEB_FULL_DETAIL_PX,
  WEB_POINT_BUDGET,
  buildLocalGroup,
  buildUniverse,
  createExtragalactic,
  detailFraction,
  fitLocalGroup,
  fitWeb,
  galaxyLabelKey,
  isExtragalacticLabelKey,
  magnifyLocalGroup,
  splitLight,
  weighExtragalactic,
  type ExtragalacticBody,
  type ExtragalacticLabelKey,
  type ExtragalacticWeights,
} from "@/components/scene/extragalactic";
import type { Uniform } from "@/components/scene/materials";
import type { Vec3 } from "@/lib/astro/constants";
import { COSMIC_WEB_SEED, cosmicWebCloud } from "@/lib/astro/cosmicWeb";
import { galaxyCenterKly, galaxyLuminosity, type LocalGroupGalaxy } from "@/lib/astro/localGroup";
import { MULTIVERSE_SEED, multiverseBubbles } from "@/lib/astro/multiverse";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "@/lib/astro/universe";

const SOURCE = "galaxie fictive du test";

/** Cinq galaxies fictives, indépendantes du fichier de données (valeurs rondes, proches du vrai Groupe local). */
const GALAXIES: readonly LocalGroupGalaxy[] = [
  {
    key: "milky-way", raDeg: 266.4, decDeg: -28.9, distanceMly: 0.03, diameterLy: 100_000, shape: "spiral", apparentMagV: null,
    source: SOURCE,
  },
  {
    key: "large-magellanic-cloud", raDeg: 81, decDeg: -70, distanceMly: 0.15, diameterLy: 30_000, shape: "irregular",
    inclinationDeg: 30, positionAngleDeg: 150, barred: true, apparentMagV: 0.5, source: SOURCE,
  },
  {
    key: "small-magellanic-cloud", raDeg: 13, decDeg: -73, distanceMly: 0.2, diameterLy: 16_000, shape: "irregular", apparentMagV: 2.5,
    source: SOURCE,
  },
  {
    key: "andromeda", raDeg: 10, decDeg: 41, distanceMly: 2.5, diameterLy: 200_000, shape: "spiral", inclinationDeg: 75,
    positionAngleDeg: 40, apparentMagV: 3.5, source: SOURCE,
  },
  {
    key: "triangulum", raDeg: 23, decDeg: 31, distanceMly: 2.7, diameterLy: 60_000, shape: "spiral", inclinationDeg: 55,
    positionAngleDeg: 20, apparentMagV: 5.7, source: SOURCE,
  },
];

const NO_WEIGHT: ExtragalacticWeights = { localGroup: 0, web: 0, cmb: 0, multiverse: 0 };
/** Petits budgets : le test vérifie la mécanique, pas l'allure. */
const LOCAL_BUDGET = 2000;
const WEB_BUDGET = 1500;

const pixelRatio = (): Uniform<number> => ({ value: 1.5 });
const create = () => createExtragalactic(pixelRatio(), GALAXIES);

function built(): ExtragalacticBody {
  const body = create();
  buildLocalGroup(body, LOCAL_BUDGET);
  buildUniverse(body, WEB_BUDGET);
  return body;
}

/** Sommets d'un objet dans le repère de `group`, transformations locales comprises. */
function verticesInGroup(object: Object3D & { geometry: BufferGeometry }, group: Object3D): Vec3[] {
  group.updateMatrixWorld(true);
  const toGroup = new Matrix4().copy(group.matrixWorld).invert().multiply(object.matrixWorld);
  const position = object.geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, i) => {
    const { x, y, z } = new Vector3().fromBufferAttribute(position, i).applyMatrix4(toGroup);
    return { x, y, z };
  });
}

const length = (p: Vec3) => Math.hypot(p.x, p.y, p.z);
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const isInGroup = (object: Object3D, group: Object3D) => group.getObjectById(object.id) === object;

function countObjects(group: Object3D): number {
  let count = 0;
  group.traverse(() => {
    count += 1;
  });
  return count;
}

const closeTo = (p: Vec3, digits: number) => ({
  x: expect.closeTo(p.x, digits),
  y: expect.closeTo(p.y, digits),
  z: expect.closeTo(p.z, digits),
});

function galaxiesOf(body: ExtragalacticBody) {
  if (!body.galaxies) throw new Error("Groupe local absent");
  return body.galaxies;
}

function universeOf(body: ExtragalacticBody) {
  if (!body.web || !body.cmb || !body.bubbles) throw new Error("Univers absent");
  return { web: body.web, cmb: body.cmb, bubbles: body.bubbles };
}

function anchorOf(body: ExtragalacticBody, key: ExtragalacticLabelKey) {
  const anchor = body.labelAnchors.get(key);
  if (!anchor) throw new Error(`Ancre absente : ${key}`);
  return anchor;
}

const pointCount = (points: Points<BufferGeometry, ShaderMaterial>) => points.geometry.getAttribute("position").count;

function fail(key: string): never {
  throw new Error(`Galaxie absente : ${key}`);
}

describe("budgets de points", () => {
  it("devrait dessiner le Groupe local en 14 000 points avec une souris, 7 000 sur écran tactile", () => {
    expect(LOCAL_GROUP_POINT_BUDGET).toEqual({ fine: 14_000, coarse: 7000 });
  });

  it("devrait dessiner la toile cosmique en 30 000 points avec une souris, 12 000 sur écran tactile", () => {
    expect(WEB_POINT_BUDGET).toEqual({ fine: 30_000, coarse: 12_000 });
  });
});

describe("createExtragalactic", () => {
  it("ne devrait rien construire à la création : ni galaxies, ni toile, ni fond diffus, ni bulles", () => {
    const body = create();
    expect(body.galaxies).toBeNull();
    expect(body.web).toBeNull();
    expect(body.cmb).toBeNull();
    expect(body.bubbles).toBeNull();
    expect(body.localGroup.children).toEqual([]);
    expect(body.universe.children).toEqual([]);
  });

  it("devrait partir de gains d'éclat neutres (1)", () => {
    const body = create();
    expect(body.localGroupGain.value).toBe(1);
    expect(body.webGain.value).toBe(1);
  });

  it("devrait nommer une étiquette par galaxie, dans l'ordre des données, puis toile, fond diffus et univers", () => {
    expect([...create().labelAnchors.keys()]).toEqual([
      "lg:milky-way",
      "lg:large-magellanic-cloud",
      "lg:small-magellanic-cloud",
      "lg:andromeda",
      "lg:triangulum",
      "web",
      "cmb",
      "our-universe",
      "other-universes",
    ]);
  });

  it("devrait ancrer « Voie lactée » au centre galactique, en années-lumière, dans le groupe du ciel profond", () => {
    const anchor = anchorOf(create(), "lg:milky-way");
    const center = galaxyCenterKly(GALAXIES[0]);
    expect(anchor.group).toBe("cosmos");
    expect(anchor.position).toEqual(closeTo({ x: center.x * 1000, y: center.y * 1000, z: center.z * 1000 }, 6));
  });

  it("devrait ancrer chaque autre galaxie à son centre, en kly, dans le groupe du Groupe local", () => {
    const body = create();
    for (const galaxy of GALAXIES.slice(1)) {
      const anchor = anchorOf(body, galaxyLabelKey(galaxy.key));
      expect(anchor.group).toBe("localGroup");
      expect(anchor.position).toEqual(closeTo(galaxyCenterKly(galaxy), 9));
    }
  });

  it("devrait ancrer « Toile cosmique » sur le nœud choisi par la toile, en milliards d'al", () => {
    const anchor = anchorOf(create(), "web");
    expect(anchor.group).toBe("universe");
    expect(anchor.position).toEqual(cosmicWebCloud(1, COSMIC_WEB_SEED).labelAnchor);
  });

  it("devrait ancrer le fond diffus en haut de notre bulle et « Notre univers observable » en bas", () => {
    const body = create();
    const radius = OBSERVABLE_UNIVERSE_RADIUS_GLY;
    expect(anchorOf(body, "cmb")).toEqual({ group: "universe", position: { x: 0, y: radius, z: 0 } });
    expect(anchorOf(body, "our-universe")).toEqual({ group: "universe", position: { x: 0, y: -radius, z: 0 } });
  });

  it("devrait ancrer « D'autres univers ? » au centre d'une autre bulle", () => {
    const anchor = anchorOf(create(), "other-universes");
    const centers = multiverseBubbles(MULTIVERSE_SEED)
      .slice(1)
      .map((bubble) => bubble.center);
    expect(anchor.group).toBe("universe");
    expect(centers).toContainEqual(anchor.position);
  });
});

describe("buildLocalGroup", () => {
  it("devrait construire une galaxie par entrée, sauf la Voie lactée (son nuage existe déjà)", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    expect([...galaxiesOf(body).keys()]).toEqual(["large-magellanic-cloud", "small-magellanic-cloud", "andromeda", "triangulum"]);
  });

  it("devrait ranger chaque galaxie dans le groupe du Groupe local, à son centre (kly)", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    for (const galaxy of GALAXIES.slice(1)) {
      const points = galaxiesOf(body).get(galaxy.key);
      if (!points) throw new Error(`Galaxie absente : ${galaxy.key}`);
      expect(isInGroup(points, body.localGroup)).toBe(true);
      expect(points.position).toEqual(closeTo(galaxyCenterKly(galaxy), 9));
    }
  });

  it("devrait répartir exactement le budget : LOCAL_GROUP_MIN_POINTS par galaxie, le reste selon la luminosité", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    const drawn = GALAXIES.slice(1);
    const luminosities = drawn.map((galaxy) => galaxyLuminosity(galaxy) ?? 0);
    const total = luminosities.reduce((sum, luminosity) => sum + luminosity, 0);
    const shared = LOCAL_BUDGET - drawn.length * LOCAL_GROUP_MIN_POINTS;
    const counts = drawn.map((galaxy) => pointCount(galaxiesOf(body).get(galaxy.key) ?? fail(galaxy.key)));
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(LOCAL_BUDGET);
    counts.forEach((count, i) => {
      expect(Math.abs(count - (LOCAL_GROUP_MIN_POINTS + (shared * luminosities[i]) / total))).toBeLessThanOrEqual(1);
    });
  });

  it("devrait donner au moins LOCAL_GROUP_MIN_POINTS points à la plus faible galaxie, même au plus petit budget", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_GROUP_MIN_POINTS * 4);
    for (const points of galaxiesOf(body).values()) expect(pointCount(points)).toBe(LOCAL_GROUP_MIN_POINTS);
  });

  it("devrait partager le rapport de pixels et le gain d'éclat du Groupe local entre toutes les galaxies", () => {
    const ratio = pixelRatio();
    const body = createExtragalactic(ratio, GALAXIES);
    buildLocalGroup(body, LOCAL_BUDGET);
    for (const points of galaxiesOf(body).values()) {
      expect(points.material.uniforms.uPixelRatio).toBe(ratio);
      expect(points.material.uniforms.uGain).toBe(body.localGroupGain);
    }
  });

  it("devrait poser d'emblée une sphère englobante qui contient tous les points de chaque galaxie", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    for (const points of galaxiesOf(body).values()) {
      const sphere = points.geometry.boundingSphere;
      if (!sphere) throw new Error("Sphère englobante absente");
      const position = points.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        expect(sphere.containsPoint(new Vector3().fromBufferAttribute(position, i))).toBe(true);
      }
    }
  });

  it("devrait laisser les galaxies invisibles jusqu'à la première pesée", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    expect([...galaxiesOf(body).values()].map((points) => points.visible)).toEqual([false, false, false, false]);
  });

  it("ne devrait rien reconstruire au second appel (mêmes galaxies, aucun objet en double)", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    const first = galaxiesOf(body);
    const objects = countObjects(body.localGroup);
    buildLocalGroup(body, LOCAL_BUDGET);
    expect(body.galaxies).toBe(first);
    expect(countObjects(body.localGroup)).toBe(objects);
  });

  it("ne devrait construire ni la toile, ni le fond diffus, ni les bulles", () => {
    const body = create();
    buildLocalGroup(body, LOCAL_BUDGET);
    expect(body.web).toBeNull();
    expect(body.universe.children).toEqual([]);
  });
});

describe("buildUniverse", () => {
  it("devrait construire la toile du nombre de points demandé, dans le groupe de l'Univers", () => {
    const { web } = universeOf(built());
    expect(pointCount(web)).toBe(WEB_BUDGET);
  });

  it("devrait partager le rapport de pixels et le gain d'éclat de la toile", () => {
    const ratio = pixelRatio();
    const body = createExtragalactic(ratio, GALAXIES);
    buildUniverse(body, WEB_BUDGET);
    const { web } = universeOf(body);
    expect(web.material.uniforms.uPixelRatio).toBe(ratio);
    expect(web.material.uniforms.uGain).toBe(body.webGain);
  });

  it("devrait poser la sphère englobante de la toile sur l'Univers observable", () => {
    const sphere = universeOf(built()).web.geometry.boundingSphere;
    expect(sphere?.center.length()).toBe(0);
    expect(sphere?.radius).toBe(OBSERVABLE_UNIVERSE_RADIUS_GLY);
  });

  it("devrait tendre le fond diffus sur une sphère de 46 milliards d'al centrée sur nous", () => {
    const body = built();
    const { cmb } = universeOf(body);
    const radii = verticesInGroup(cmb, body.universe).map(length);
    expect(Math.min(...radii)).toBeCloseTo(OBSERVABLE_UNIVERSE_RADIUS_GLY, 4);
    expect(Math.max(...radii)).toBeCloseTo(OBSERVABLE_UNIVERSE_RADIUS_GLY, 4);
  });

  it("devrait dessiner les 14 autres bulles à leur place et à leur taille (multiverseBubbles)", () => {
    const body = built();
    const { bubbles } = universeOf(body);
    const expected = multiverseBubbles(MULTIVERSE_SEED).slice(1);
    expect(bubbles).toHaveLength(14);
    bubbles.forEach((mesh, i) => {
      const gaps = verticesInGroup(mesh, body.universe).map((vertex) => distance(vertex, expected[i].center));
      expect(Math.min(...gaps)).toBeCloseTo(expected[i].radius, 3);
      expect(Math.max(...gaps)).toBeCloseTo(expected[i].radius, 3);
    });
  });

  it("devrait ranger toile, fond diffus et bulles dans le groupe de l'Univers", () => {
    const body = built();
    const { web, cmb, bubbles } = universeOf(body);
    const parts = [web, cmb, ...bubbles];
    expect(parts.map((part) => isInGroup(part, body.universe))).toEqual(parts.map(() => true));
  });

  it("devrait tout laisser invisible jusqu'à la première pesée", () => {
    const { web, cmb, bubbles } = universeOf(built());
    expect([web, cmb, ...bubbles].some((part) => part.visible)).toBe(false);
  });

  it("ne devrait rien reconstruire au second appel (mêmes objets, aucun en double)", () => {
    const body = built();
    const first = universeOf(body);
    const objects = countObjects(body.universe);
    buildUniverse(body, WEB_BUDGET);
    expect(body.web).toBe(first.web);
    expect(body.cmb).toBe(first.cmb);
    expect(body.bubbles).toBe(first.bubbles);
    expect(countObjects(body.universe)).toBe(objects);
  });
});

describe("weighExtragalactic", () => {
  it("ne devrait rien faire avant la construction", () => {
    expect(() => weighExtragalactic(create(), { localGroup: 1, web: 1, cmb: 1, multiverse: 1 })).not.toThrow();
  });

  it("devrait tout cacher quand les poids sont nuls (aucun appel de dessin)", () => {
    const body = built();
    weighExtragalactic(body, { localGroup: 1, web: 1, cmb: 1, multiverse: 1 });
    weighExtragalactic(body, NO_WEIGHT);
    const { web, cmb, bubbles } = universeOf(body);
    const parts = [...galaxiesOf(body).values(), web, cmb, ...bubbles];
    expect(parts.map((part) => part.visible)).toEqual(parts.map(() => false));
  });

  it("devrait montrer le fond diffus seul à mi-poids : visible, opacité 0,5", () => {
    const body = built();
    weighExtragalactic(body, { ...NO_WEIGHT, cmb: 0.5 });
    const { web, cmb, bubbles } = universeOf(body);
    expect(cmb.visible).toBe(true);
    expect(cmb.material.uniforms.uOpacity.value).toBeCloseTo(0.5, 12);
    expect([web, ...bubbles, ...galaxiesOf(body).values()].some((part) => part.visible)).toBe(false);
  });

  it("devrait montrer les galaxies du Groupe local selon leur poids", () => {
    const body = built();
    weighExtragalactic(body, { ...NO_WEIGHT, localGroup: 0.25 });
    for (const points of galaxiesOf(body).values()) {
      expect(points.visible).toBe(true);
      expect(points.material.uniforms.uOpacity.value).toBeCloseTo(0.25, 12);
    }
  });

  it("devrait montrer la toile selon son poids", () => {
    const body = built();
    weighExtragalactic(body, { ...NO_WEIGHT, web: 0.35 });
    const { web } = universeOf(body);
    expect(web.visible).toBe(true);
    expect(web.material.uniforms.uOpacity.value).toBeCloseTo(0.35, 12);
  });

  it("devrait montrer toutes les autres bulles selon le poids du multivers", () => {
    const body = built();
    weighExtragalactic(body, { ...NO_WEIGHT, multiverse: 0.6 });
    for (const bubble of universeOf(body).bubbles) {
      expect(bubble.visible).toBe(true);
      expect(bubble.material.uniforms.uOpacity.value).toBeCloseTo(0.6, 12);
    }
  });
});

describe("detailFraction", () => {
  it("devrait dessiner tous les points à partir du rayon de pleine finesse", () => {
    expect(detailFraction(60, 60)).toBe(1);
    expect(detailFraction(240, 60)).toBe(1);
  });

  it("devrait suivre (rayon / référence)^1,5 en dessous : un quart du rayon → un huitième des points", () => {
    expect(detailFraction(15, 60)).toBeCloseTo(0.125, 12);
  });

  it("devrait ne rien dessiner pour un rayon nul, négatif ou indéfini", () => {
    expect(detailFraction(0, 60)).toBe(0);
    expect(detailFraction(-3, 60)).toBe(0);
    expect(detailFraction(Number.NaN, 60)).toBe(0);
  });

  it("devrait tout dessiner pour un rayon infini (caméra à l'intérieur)", () => {
    expect(detailFraction(Infinity, 60)).toBe(1);
  });
});

describe("fitLocalGroup", () => {
  const drawnOf = (points: Points<BufferGeometry, ShaderMaterial>) => points.geometry.drawRange.count;

  it("ne devrait rien faire avant la construction", () => {
    expect(() => fitLocalGroup(create(), 10)).not.toThrow();
  });

  it("devrait tout dessiner à plein éclat quand Andromède atteint LOCAL_GROUP_FULL_LIGHT_PX, ou de l'intérieur", () => {
    for (const radius of [LOCAL_GROUP_FULL_LIGHT_PX, 4 * LOCAL_GROUP_FULL_LIGHT_PX, Infinity]) {
      const body = built();
      fitLocalGroup(body, radius);
      expect(body.localGroupGain.value).toBe(1);
      for (const points of galaxiesOf(body).values()) expect(drawnOf(points)).toBe(pointCount(points));
    }
  });

  it("devrait d'abord baisser l'éclat, tous les points dessinés : lumière (rayon / LOCAL_GROUP_FULL_LIGHT_PX)^1,5", () => {
    expect(LOCAL_GROUP_FULL_LIGHT_PX).toBe(80);
    expect(LOCAL_GROUP_MIN_GAIN).toBe(0.35);
    const body = built();
    // (64 / 80)^1,5 = 0,7155 : au-dessus du plancher, le gain porte seul la lumière.
    fitLocalGroup(body, 64);
    expect(body.localGroupGain.value).toBeCloseTo(0.8 ** 1.5, 12);
    for (const points of galaxiesOf(body).values()) expect(drawnOf(points)).toBe(pointCount(points));
  });

  it("devrait ensuite garder l'éclat plancher et ne dessiner qu'une part, au moins LOCAL_GROUP_MIN_DRAWN par galaxie", () => {
    const body = built();
    // (20 / 80)^1,5 = 0,125 : gain 0,35, part 0,125 / 0,35.
    fitLocalGroup(body, 20);
    expect(body.localGroupGain.value).toBe(LOCAL_GROUP_MIN_GAIN);
    for (const points of galaxiesOf(body).values()) {
      const total = pointCount(points);
      expect(drawnOf(points)).toBe(Math.min(total, Math.max(LOCAL_GROUP_MIN_DRAWN, Math.round((0.125 / 0.35) * total))));
    }
  });

  it("devrait garder au moins LOCAL_GROUP_MIN_DRAWN points par galaxie, même pour un rayon nul", () => {
    const body = built();
    fitLocalGroup(body, 0);
    for (const points of galaxiesOf(body).values()) {
      expect(drawnOf(points)).toBe(Math.min(pointCount(points), LOCAL_GROUP_MIN_DRAWN));
    }
  });
});

describe("magnifyLocalGroup", () => {
  it("ne devrait rien faire avant la construction", () => {
    expect(() => magnifyLocalGroup(create(), 4)).not.toThrow();
  });

  it("devrait grossir chaque galaxie autour de son centre, sans la déplacer", () => {
    const body = built();
    const centers = [...galaxiesOf(body).values()].map((points) => points.position.clone());
    magnifyLocalGroup(body, 4);
    [...galaxiesOf(body).values()].forEach((points, i) => {
      expect(points.scale.toArray()).toEqual([4, 4, 4]);
      expect(points.position.equals(centers[i])).toBe(true);
    });
    magnifyLocalGroup(body, 1);
    for (const points of galaxiesOf(body).values()) expect(points.scale.toArray()).toEqual([1, 1, 1]);
  });
});

describe("fitWeb", () => {
  it("ne devrait rien faire avant la construction", () => {
    expect(() => fitWeb(create(), 10)).not.toThrow();
  });

  it("devrait dessiner toute la toile quand l'Univers observable atteint le rayon de pleine finesse, ou de l'intérieur", () => {
    const body = built();
    fitWeb(body, WEB_FULL_DETAIL_PX);
    expect(universeOf(body).web.geometry.drawRange.count).toBe(WEB_BUDGET);
    fitWeb(body, Infinity);
    expect(universeOf(body).web.geometry.drawRange.count).toBe(WEB_BUDGET);
  });

  it("devrait n'en dessiner qu'une part quand l'Univers observable rapetisse (un quart du rayon → un huitième)", () => {
    const body = built();
    fitWeb(body, WEB_FULL_DETAIL_PX / 4);
    expect(universeOf(body).web.geometry.drawRange.count).toBe(Math.round(WEB_BUDGET / 8));
  });
});

describe("splitLight", () => {
  it("devrait tout régler par le gain tant qu'il reste au-dessus de son plancher (tous les points dessinés)", () => {
    expect(splitLight(0.6, 0.25)).toEqual({ gain: 0.6, fraction: 1 });
    expect(splitLight(1, 0.25)).toEqual({ gain: 1, fraction: 1 });
  });

  it("devrait, sous le plancher, garder le gain au plancher et dessiner une part des points (gain × part = lumière)", () => {
    const { gain, fraction } = splitLight(0.05, 0.25);
    expect(gain).toBe(0.25);
    expect(fraction).toBeCloseTo(0.2, 12);
    expect(gain * fraction).toBeCloseTo(0.05, 12);
  });

  it("ne devrait rien dessiner pour une lumière nulle ou indéfinie", () => {
    expect(splitLight(0, 0.25)).toEqual({ gain: 0.25, fraction: 0 });
    expect(splitLight(Number.NaN, 0.25)).toEqual({ gain: 0.25, fraction: 0 });
  });
});

describe("étiquettes nommées dans la scène", () => {
  it("devrait nommer les cinq galaxies principales, Andromède en premier", () => {
    expect(LABELLED_GALAXIES).toEqual(["andromeda", "milky-way", "triangulum", "large-magellanic-cloud", "small-magellanic-cloud"]);
  });

  it("devrait placer les galaxies, puis la toile, le fond diffus, notre univers et les autres (ordre de priorité)", () => {
    expect(EXTRAGALACTIC_LABEL_ORDER).toEqual([
      "lg:andromeda",
      "lg:milky-way",
      "lg:triangulum",
      "lg:large-magellanic-cloud",
      "lg:small-magellanic-cloud",
      "web",
      "cmb",
      "our-universe",
      "other-universes",
    ]);
  });
});

describe("isExtragalacticLabelKey", () => {
  it.each(["lg:andromeda", "lg:milky-way", "web", "cmb", "our-universe", "other-universes"])("devrait reconnaître « %s »", (key) => {
    expect(isExtragalacticLabelKey(key)).toBe(true);
  });

  it.each([undefined, "", "here", "center", "star:sirius", "lg:", "lg:inconnue", "andromeda"])("devrait refuser « %s »", (key) => {
    expect(isExtragalacticLabelKey(key)).toBe(false);
  });
});

