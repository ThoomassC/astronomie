import { Color, Group, Matrix3, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  BLACK_HOLE_LOOKS,
  BLACK_HOLE_RENDER_ORDER,
  LENS_QUAD_RS,
  createBlackHoleMesh,
  requiredExtentRs,
  type BlackHoleDisk,
  type BlackHoleGlow,
  type BlackHoleJet,
  type BlackHoleLook,
  type BlackHoleLookName,
  type BlackHoleMeshOptions,
} from "@/components/scene/blackHole";
import { BLACK_HOLE_VERTEX } from "@/components/scene/blackHoleShaders";
import { STARFIELD_GLSL, STARFIELD_RENDER_ORDER, createStarfieldBackground } from "@/components/scene/starfield";
import { ISCO_RS, PHOTON_SPHERE_RS, SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";

/*
 * Trou noir de l'onglet « Tailles » : un rectangle face caméra, tracé dans le repère du trou noir, en r_s. Construit
 * sans WebGL : on vérifie l'aspect (encombrement qu'il exige), les réglages du maillage, le partage des uniformes du
 * ciel avec le fond, et le calcul en double précision de la caméra, raison d'être de `update`.
 */

const LOOK_NAMES = Object.keys(BLACK_HOLE_LOOKS) as BlackHoleLookName[];
/** Aspect sans rien de lumineux : l'ombre seule. */
const BARE: BlackHoleLook = { inclinationDeg: 0, positionAngleDeg: 0, disk: null, jet: null, glow: null };
const WHITE = new Color(1, 1, 1);
const DISK: BlackHoleDisk = { innerRs: 3, outerRs: 5, innerColor: WHITE, outerColor: WHITE, gain: 1, opacity: 1 };
const JET: BlackHoleJet = { gain: 0.3, halfAngleDeg: 8, counterRatio: 0.1, lengthRs: 6.42, color: WHITE };
const GLOW: BlackHoleGlow = { gain: 0.3, scaleRs: 2, reachRs: 4, color: WHITE };

function options(overrides: Partial<BlackHoleMeshOptions> = {}): BlackHoleMeshOptions {
  return {
    look: BLACK_HOLE_LOOKS["jet-ring"],
    radius: 2,
    extentRs: 10,
    time: { value: 0 },
    starfield: createStarfieldBackground().uniforms,
    lite: false,
    ...overrides,
  };
}

describe("requiredExtentRs", () => {
  it.each<[BlackHoleLookName, number]>([
    ["x-ray-binary", 8.8],
    ["faint-ring", 3.2],
    ["jet-ring", 10],
    ["dormant", 10],
  ])("devrait exiger de l'aspect %s un encombrement de %f r_s", (name, extentRs) => {
    expect(requiredExtentRs(BLACK_HOLE_LOOKS[name])).toBe(extentRs);
  });

  it("devrait couvrir l'ombre, taille comparée, et son anneau : 3 r_s au moins", () => {
    expect(requiredExtentRs(BARE)).toBe(3);
    for (const name of LOOK_NAMES) expect(requiredExtentRs(BLACK_HOLE_LOOKS[name])).toBeGreaterThan(SHADOW_RADIUS_RS);
  });

  it("devrait borner l'image lentillée du bord du disque par r / √(1 − 1/r), plus 0,2, au dixième supérieur", () => {
    // 5 / √0,8 = 5,590 ; + 0,2 = 5,790 → 5,8.
    expect(requiredExtentRs({ ...BARE, disk: DISK })).toBe(5.8);
  });

  it("devrait laisser 1 r_s au-delà du bout du jet et de la portée de la lueur", () => {
    expect(requiredExtentRs({ ...BARE, jet: JET })).toBe(7.5);
    expect(requiredExtentRs({ ...BARE, glow: GLOW })).toBe(5);
    expect(requiredExtentRs({ ...BARE, disk: DISK, jet: JET, glow: GLOW })).toBe(7.5);
  });
});

describe("BLACK_HOLE_LOOKS", () => {
  const disks = LOOK_NAMES.flatMap((name) => {
    const { disk } = BLACK_HOLE_LOOKS[name];
    return disk ? [[name, disk] as const] : [];
  });

  it.each(LOOK_NAMES)("devrait orienter l'aspect %s : inclinaison de 0 à 90°, angle de position de 0 à 360°", (name) => {
    const look = BLACK_HOLE_LOOKS[name];
    expect(look.inclinationDeg).toBeGreaterThanOrEqual(0);
    expect(look.inclinationDeg).toBeLessThanOrEqual(90);
    expect(look.positionAngleDeg).toBeGreaterThanOrEqual(0);
    expect(look.positionAngleDeg).toBeLessThan(360);
  });

  it.each(disks)("devrait tenir le disque de %s hors de la sphère des photons, opacité dans ]0 ; 1]", (_name, disk) => {
    expect(disk.innerRs).toBeGreaterThanOrEqual(PHOTON_SPHERE_RS);
    expect(disk.outerRs).toBeGreaterThan(disk.innerRs);
    expect(disk.opacity).toBeGreaterThan(0);
    expect(disk.opacity).toBeLessThanOrEqual(1);
    expect(disk.gain).toBeGreaterThan(0);
  });

  it("devrait donner à la binaire X un disque mince, qui commence à la dernière orbite stable", () => {
    expect(BLACK_HOLE_LOOKS["x-ray-binary"].disk?.innerRs).toBe(ISCO_RS);
    expect(BLACK_HOLE_LOOKS["x-ray-binary"].disk?.opacity).toBe(1);
  });

  it("devrait réserver le jet à l'anneau de M87*, vu à 17° de son axe, contre-jet plus faible que le jet", () => {
    expect(LOOK_NAMES.filter((name) => BLACK_HOLE_LOOKS[name].jet !== null)).toEqual(["jet-ring"]);
    expect(BLACK_HOLE_LOOKS["jet-ring"].inclinationDeg).toBe(17);
    expect(BLACK_HOLE_LOOKS["jet-ring"].jet?.counterRatio).toBeLessThan(1);
  });

  it("ne devrait donner au trou noir dormant ni disque ni jet : l'ombre sur la lumière de sa galaxie", () => {
    expect(BLACK_HOLE_LOOKS.dormant.disk).toBeNull();
    expect(BLACK_HOLE_LOOKS.dormant.jet).toBeNull();
    expect(BLACK_HOLE_LOOKS.dormant.glow?.reachRs).toBeGreaterThan(SHADOW_RADIUS_RS);
  });
});

describe("createBlackHoleMesh", () => {
  it("devrait se dessiner après le fond et avant les étoiles, en transparence, sans profondeur, jamais écarté", () => {
    const { mesh } = createBlackHoleMesh(options());
    expect(BLACK_HOLE_RENDER_ORDER).toBe(-10);
    expect(mesh.renderOrder).toBe(BLACK_HOLE_RENDER_ORDER);
    expect(mesh.renderOrder).toBeGreaterThan(STARFIELD_RENDER_ORDER);
    expect(mesh.renderOrder).toBeLessThan(0);
    expect(mesh.material.transparent).toBe(true);
    expect(mesh.material.depthTest).toBe(false);
    expect(mesh.material.depthWrite).toBe(false);
    expect(mesh.frustumCulled).toBe(false);
  });

  it("devrait lire les uniformes du ciel du fond eux-mêmes : même ciel des deux côtés du bord", () => {
    const starfield = createStarfieldBackground().uniforms;
    const { mesh } = createBlackHoleMesh(options({ starfield }));
    expect(mesh.material.uniforms.uPixelAngle).toBe(starfield.uPixelAngle);
    expect(mesh.material.uniforms.uStarfieldGain).toBe(starfield.uStarfieldGain);
    expect(mesh.material.uniforms.uNight).toBe(starfield.uNight);
  });

  it("devrait partager le temps affiché, qui fera tourner le disque pendant un vol", () => {
    const time = { value: 4 };
    expect(createBlackHoleMesh(options({ time })).mesh.material.uniforms.uTime).toBe(time);
  });

  it("devrait tracer la sphère de rayon max(encombrement, LENS_QUAD_RS), à la taille de son r_s", () => {
    expect(LENS_QUAD_RS).toBe(10);
    const wide = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS.dormant, extentRs: 12, radius: 3 }));
    const faint = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS["faint-ring"], extentRs: 3.2 }));
    expect(wide.mesh.material.uniforms.uQuadRs.value).toBe(12);
    expect(wide.mesh.material.uniforms.uRadius.value).toBe(3);
    expect(faint.mesh.material.uniforms.uQuadRs.value).toBe(LENS_QUAD_RS);
  });

  it("devrait partir pleinement visible, cercle de l'horizon compris, réglages lus par le programme", () => {
    const hole = createBlackHoleMesh(options());
    expect(hole.opacity.value).toBe(1);
    expect(hole.horizonMark.value).toBe(1);
    expect(hole.mesh.material.uniforms.uOpacity).toBe(hole.opacity);
    expect(hole.mesh.material.uniforms.uHorizonMark).toBe(hole.horizonMark);
  });

  it("devrait compiler la variante allégée (BH_LITE) seulement sur écran tactile", () => {
    expect(createBlackHoleMesh(options({ lite: true })).mesh.material.defines.BH_LITE).toBe("");
    expect(createBlackHoleMesh(options()).mesh.material.defines.BH_LITE).toBeUndefined();
  });

  it("devrait faire partager le même programme à tous les trous noirs de même variante", () => {
    const first = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS["x-ray-binary"], extentRs: 10 }));
    const second = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS.dormant, extentRs: 12 }));
    expect(second.mesh.material.vertexShader).toBe(first.mesh.material.vertexShader);
    expect(second.mesh.material.fragmentShader).toBe(first.mesh.material.fragmentShader);
    expect(second.mesh.material.defines).toEqual(first.mesh.material.defines);
  });

  it("devrait inclure STARFIELD_GLSL une seule fois, en pleine précision, et sortir par le tone mapping", () => {
    const { fragmentShader } = createBlackHoleMesh(options()).mesh.material;
    expect(fragmentShader.split(STARFIELD_GLSL)).toHaveLength(2);
    expect(fragmentShader).toContain("precision highp float;");
    expect(fragmentShader).toContain("#include <tonemapping_fragment>");
    expect(fragmentShader).toMatch(/gl_FragColor = vec4\(\w+, uOpacity\);/);
  });

  it("devrait copier les couleurs de l'aspect : un réglage du maillage ne touche pas l'aspect partagé", () => {
    const innerColor = new Color(0.5, 0.6, 0.7);
    const { mesh } = createBlackHoleMesh(options({ look: { ...BARE, disk: { ...DISK, innerColor } }, extentRs: 10 }));
    // Aucun uniforme ne garde l'objet couleur de l'aspect : il est copié.
    expect(Object.values(mesh.material.uniforms).map((uniform) => uniform.value)).not.toContain(innerColor);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    "devrait lever une RangeError quand le rayon n'est pas un nombre fini strictement positif (%f)",
    (radius) => {
      expect(() => createBlackHoleMesh(options({ radius }))).toThrow(RangeError);
    },
  );

  it.each([9.9, 3, Number.NaN, Number.POSITIVE_INFINITY])(
    "devrait lever une RangeError quand l'encombrement ne contient pas ce que l'aspect éclaire (%f r_s pour 10 exigés)",
    (extentRs) => {
      expect(() => createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS["jet-ring"], extentRs }))).toThrow(RangeError);
    },
  );
});

describe("BlackHoleMesh.update", () => {
  it("devrait calculer en double précision la caméra dans le repère du trou noir, là où le float32 se tromperait", () => {
    const radius = 1.7277e5;
    const center = -3_824_123.4;
    const hole = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS.dormant, radius, extentRs: 12 }));
    hole.mesh.position.set(center, 0, 0);
    const camera = new PerspectiveCamera();
    camera.position.set(center + 12.3, 0, 0);
    camera.updateMatrixWorld();
    hole.update(camera);
    // Référence : la même soustraction, en double précision.
    expect(Math.abs(hole.cameraLocal.x / ((camera.position.x - center) / radius) - 1)).toBeLessThan(1e-12);
    expect(hole.cameraLocal.x).toBeCloseTo(12.3 / radius, 12);
    expect(hole.cameraLocal.y).toBe(0);
    // En float32, le pas vaut 0,25 R☉ à 3,8 millions de R☉ : la caméra s'écarterait de 1,6 %.
    const single = (Math.fround(camera.position.x) - Math.fround(center)) / radius;
    expect(Math.abs(single / (12.3 / radius) - 1)).toBeGreaterThan(0.015);
  });

  it("devrait réécrire à chaque image le même vecteur, celui que lit le programme (aucune allocation)", () => {
    const hole = createBlackHoleMesh(options());
    const { cameraLocal } = hole;
    const camera = new PerspectiveCamera();
    for (const z of [40, 25]) {
      camera.position.set(0, 0, z);
      camera.updateMatrixWorld();
      hole.update(camera);
      expect(hole.cameraLocal).toBe(cameraLocal);
      expect(cameraLocal.z).toBe(z / 2);
    }
    expect(hole.mesh.material.uniforms.uCamLocal.value).toBe(cameraLocal);
  });

  it("devrait suivre la position du trou noir dans le monde, même avant le premier rendu", () => {
    const hole = createBlackHoleMesh(options());
    const group = new Group();
    group.position.x = 100;
    group.add(hole.mesh);
    hole.mesh.position.x = 5;
    const camera = new PerspectiveCamera();
    camera.position.set(105, 0, 30);
    camera.updateMatrixWorld();
    hole.update(camera);
    expect(hole.cameraLocal.toArray()).toEqual([0, 0, 15]);
  });

  it("devrait recopier l'orientation de la caméra : de l'espace vue au repère du trou noir", () => {
    const hole = createBlackHoleMesh(options());
    const camera = new PerspectiveCamera();
    camera.position.set(-40, 12, 90);
    camera.lookAt(-40, 0, 0);
    camera.updateMatrixWorld();
    hole.update(camera);
    const viewToWorld: Matrix3 = hole.mesh.material.uniforms.uViewToWorld.value;
    expect(viewToWorld.equals(new Matrix3().setFromMatrix4(camera.matrixWorld))).toBe(true);
  });
});

describe("BLACK_HOLE_VERTEX", () => {
  it("devrait, caméra dans la sphère tracée, retrouver par la projection la direction de chaque point de découpe", () => {
    expect(BLACK_HOLE_VERTEX).toContain("(position.x + projectionMatrix[2][0]) / projectionMatrix[0][0]");
    expect(BLACK_HOLE_VERTEX).toContain("(position.y + projectionMatrix[2][1]) / projectionMatrix[1][1]");
    // Même formule qu'en GLSL (colonne-ligne : projectionMatrix[2][0] = elements[8]), décalage de vue compris.
    const camera = new PerspectiveCamera(50, 375 / 812, 0.1, 1000);
    camera.setViewOffset(375, 812, 0, -0.12 * 812, 375, 812);
    camera.updateMatrixWorld();
    const p = camera.projectionMatrix.elements;
    for (const [x, y] of [
      [-1, -1],
      [1, 1],
      [0.4, -0.2],
    ]) {
      const seen = new Vector3((x + p[8]) / p[0], (y + p[9]) / p[5], -1).multiplyScalar(7).project(camera);
      expect(seen.x).toBeCloseTo(x, 9);
      expect(seen.y).toBeCloseTo(y, 9);
    }
  });
});
