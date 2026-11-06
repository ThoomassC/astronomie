import { Color, Group, Matrix3, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  BLACK_HOLE_LOOKS,
  BLACK_HOLE_RENDER_ORDER,
  LENS_QUAD_RS,
  createBlackHoleMesh,
  diskAxis,
  rayDefines,
  requiredExtentRs,
  type BlackHoleDisk,
  type BlackHoleFlow,
  type BlackHoleGlow,
  type BlackHoleJet,
  type BlackHoleLook,
  type BlackHoleLookName,
  type BlackHoleMeshOptions,
} from "@/components/scene/blackHole";
import { BLACK_HOLE_FRAGMENT, BLACK_HOLE_VERTEX } from "@/components/scene/blackHoleShaders";
import { NOISE_GLSL } from "@/components/scene/shaders";
import { STARFIELD_GLSL, STARFIELD_RENDER_ORDER, createStarfieldBackground } from "@/components/scene/starfield";
import { DESKTOP_RAY_STEPS, LITE_RAY_STEPS, blackbodyColor } from "@/lib/astro/photonGeodesic";
import { ISCO_RS, PHOTON_SPHERE_RS, SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";

/*
 * Trou noir de l'onglet « Tailles » : un rectangle face caméra, tracé dans le repère du trou noir, en r_s. Construit
 * sans WebGL : on vérifie l'aspect (encombrement qu'il exige), les réglages du maillage, le partage des uniformes du
 * ciel avec le fond, et le calcul en double précision de la caméra, raison d'être de `update`.
 */

const LOOK_NAMES = Object.keys(BLACK_HOLE_LOOKS) as BlackHoleLookName[];
/** Aspect sans rien de lumineux : l'ombre seule. */
const BARE: BlackHoleLook = {
  inclinationDeg: 0,
  positionAngleDeg: 0,
  clockwise: false,
  orbitPeriodS: 6,
  disk: null,
  flow: null,
  jet: null,
  glow: null,
};
const WHITE = new Color(1, 1, 1);
const DISK: BlackHoleDisk = { innerRs: 3, outerRs: 5, temperatureK: 20_000, gain: 1, opacity: 1, turbulence: 0.5 };
const FLOW: BlackHoleFlow = {
  innerRs: 1.5,
  outerRs: 4,
  temperatureK: 3000,
  gain: 1,
  thickness: 0.5,
  rotation: 0.6,
  flicker: 0.4,
};
const JET: BlackHoleJet = {
  gain: 0.3,
  lengthRs: 6.42,
  widthRs: 0.25,
  halfAngleDeg: 8,
  counterRatio: 0.1,
  knots: 0.5,
  color: WHITE,
};
const GLOW: BlackHoleGlow = { gain: 0.3, scaleRs: 2, reachRs: 4, ring: 1, ringWidthRs: 0.05, color: WHITE };

/** Nombre d'occurrences de `needle` dans `text`. */
const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

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
    ["x-ray-binary", 9.8],
    ["faint-ring", 3.2],
    ["jet-ring", 3.9],
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

  it("devrait borner de même le gaz chaud par son rayon extérieur", () => {
    // 4 / √0,75 = 4,619 ; + 0,2 = 4,819 → 4,9.
    expect(requiredExtentRs({ ...BARE, flow: FLOW })).toBe(4.9);
  });

  it("devrait laisser 1 r_s au-delà de la portée de la lueur", () => {
    expect(requiredExtentRs({ ...BARE, glow: GLOW })).toBe(5);
    expect(requiredExtentRs({ ...BARE, disk: DISK, glow: GLOW })).toBe(5.8);
  });

  it("ne devrait pas compter le jet : faisceau de lumière additive, il peut déborder de l'encombrement", () => {
    expect(requiredExtentRs({ ...BARE, jet: { ...JET, lengthRs: 40 } })).toBe(3);
    expect(requiredExtentRs({ ...BARE, disk: DISK, jet: JET, glow: GLOW })).toBe(5.8);
  });
});

describe("BLACK_HOLE_LOOKS", () => {
  const disks = LOOK_NAMES.flatMap((name) => {
    const { disk } = BLACK_HOLE_LOOKS[name];
    return disk ? [[name, disk] as const] : [];
  });
  const flows = LOOK_NAMES.flatMap((name) => {
    const { flow } = BLACK_HOLE_LOOKS[name];
    return flow ? [[name, flow] as const] : [];
  });

  it.each(LOOK_NAMES)("devrait orienter l'aspect %s : inclinaison de 0 à 90°, angle de position de 0 à 360°", (name) => {
    const look = BLACK_HOLE_LOOKS[name];
    expect(look.inclinationDeg).toBeGreaterThanOrEqual(0);
    expect(look.inclinationDeg).toBeLessThanOrEqual(90);
    expect(look.positionAngleDeg).toBeGreaterThanOrEqual(0);
    expect(look.positionAngleDeg).toBeLessThan(360);
    expect(look.orbitPeriodS).toBeGreaterThan(0);
  });

  it.each(disks)("devrait tenir le disque de %s hors de la sphère des photons, opacité dans ]0 ; 1]", (_name, disk) => {
    expect(disk.innerRs).toBeGreaterThanOrEqual(PHOTON_SPHERE_RS);
    expect(disk.outerRs).toBeGreaterThan(disk.innerRs);
    expect(disk.opacity).toBeGreaterThan(0);
    expect(disk.opacity).toBeLessThanOrEqual(1);
    expect(disk.gain).toBeGreaterThan(0);
    expect(disk.temperatureK).toBeGreaterThan(1000);
    expect(disk.turbulence).toBeGreaterThanOrEqual(0);
    expect(disk.turbulence).toBeLessThanOrEqual(1);
  });

  it.each(flows)("devrait tenir le gaz chaud de %s hors de la sphère des photons, réglages dans leurs bornes", (_name, flow) => {
    expect(flow.innerRs).toBeGreaterThanOrEqual(PHOTON_SPHERE_RS);
    expect(flow.outerRs).toBeGreaterThan(flow.innerRs);
    expect(flow.gain).toBeGreaterThan(0);
    expect(flow.thickness).toBeGreaterThan(0);
    for (const share of [flow.rotation, flow.flicker]) {
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(1);
    }
  });

  it("devrait donner à la binaire X un disque mince et opaque, vu presque par la tranche, une couronne et un anneau", () => {
    const { disk, flow, glow, inclinationDeg } = BLACK_HOLE_LOOKS["x-ray-binary"];
    expect(disk?.innerRs).toBe(ISCO_RS);
    expect(disk?.opacity).toBe(1);
    // Presque par la tranche : le disque paraît mince, son image passe par-dessus et par-dessous l'ombre.
    expect(inclinationDeg).toBeGreaterThanOrEqual(80);
    // Couronne : gaz très chaud (couleur limite, bleutée) et ténu, en halo doux.
    expect(flow?.temperatureK).toBeGreaterThanOrEqual(1e5);
    expect(flow?.gain).toBeLessThan((disk?.gain ?? 0) / 10);
    // Anneau de photons : un fil vif serré contre l'ombre.
    expect(glow?.ring).toBeGreaterThan(10);
    expect(glow?.ringWidthRs).toBeLessThanOrEqual(0.05);
  });

  it("devrait chauffer assez peu le disque d'affichage pour que l'effet Doppler se voie dans la couleur", () => {
    const temperature = BLACK_HOLE_LOOKS["x-ray-binary"].disk?.temperatureK ?? 0;
    // Vu presque par la tranche, g va d'environ 1,3 (côté qui s'approche) à 0,55 (côté qui s'éloigne).
    const [redNear, , blueNear] = blackbodyColor(1.3 * temperature);
    const [redFar, , blueFar] = blackbodyColor(0.55 * temperature);
    expect(blueNear).toBeGreaterThan(redNear);
    expect(redFar).toBeGreaterThan(blueFar);
  });

  it("devrait réserver le jet à l'anneau de M87*, long, fin et collimaté, contre-jet presque invisible", () => {
    expect(LOOK_NAMES.filter((name) => BLACK_HOLE_LOOKS[name].jet !== null)).toEqual(["jet-ring"]);
    const jet = BLACK_HOLE_LOOKS["jet-ring"].jet;
    expect(jet?.lengthRs).toBeGreaterThanOrEqual(25);
    expect(jet?.halfAngleDeg).toBeLessThanOrEqual(3);
    expect(jet?.counterRatio).toBeLessThanOrEqual(0.05);
    expect(jet?.knots).toBeGreaterThan(0);
    // Jet vers l'ouest-nord-ouest (≈ 288°), vers la droite de l'image.
    expect(BLACK_HOLE_LOOKS["jet-ring"].positionAngleDeg).toBe(288);
  });

  it("devrait faire tourner les anneaux de M87* et de Sagittarius A* dans le sens horaire, comme observé", () => {
    expect(BLACK_HOLE_LOOKS["jet-ring"].clockwise).toBe(true);
    expect(BLACK_HOLE_LOOKS["faint-ring"].clockwise).toBe(true);
  });

  it("ne devrait donner à Sagittarius A* qu'un gaz ténu, vu plutôt de face : ni disque éclatant ni jet", () => {
    const look = BLACK_HOLE_LOOKS["faint-ring"];
    expect(look.disk).toBeNull();
    expect(look.jet).toBeNull();
    expect(look.flow).not.toBeNull();
    expect(look.inclinationDeg).toBeLessThanOrEqual(30);
  });

  it("ne devrait donner au trou noir dormant ni disque, ni gaz, ni jet : l'ombre noire, un anneau très fin, une lueur", () => {
    const look = BLACK_HOLE_LOOKS.dormant;
    expect(look.disk).toBeNull();
    expect(look.flow).toBeNull();
    expect(look.jet).toBeNull();
    expect(look.glow?.reachRs).toBeGreaterThan(SHADOW_RADIUS_RS);
    // Anneau de photons : la lumière de la galaxie serrée contre l'ombre, sur quelques centièmes de r_s.
    expect(look.glow?.ring).toBeGreaterThan(1);
    expect(look.glow?.ringWidthRs).toBeLessThanOrEqual(0.1);
  });
});

describe("diskAxis", () => {
  const close = (axis: Vector3, x: number, y: number, z: number) => {
    expect(axis.x).toBeCloseTo(x, 12);
    expect(axis.y).toBeCloseTo(y, 12);
    expect(axis.z).toBeCloseTo(z, 12);
  };

  it("devrait pointer vers la caméra vu de face, vers le haut par la tranche, vers la gauche à 90° de position", () => {
    close(diskAxis(0, 0), 0, 0, 1);
    close(diskAxis(90, 0), 0, 1, 0);
    close(diskAxis(90, 90), -1, 0, 0);
  });

  it("devrait pencher l'axe de M87* vers la droite et vers la caméra (288°, 17°)", () => {
    const axis = diskAxis(17, 288);
    expect(axis.x).toBeGreaterThan(0);
    expect(axis.z).toBeCloseTo(Math.cos((17 * Math.PI) / 180), 12);
    expect(axis.length()).toBeCloseTo(1, 12);
  });
});

describe("rayDefines", () => {
  it.each([
    [false, DESKTOP_RAY_STEPS],
    [true, LITE_RAY_STEPS],
  ] as const)("devrait tirer les pas du shader du modèle TypeScript (allégé : %s)", (lite, steps) => {
    const defines = rayDefines(lite);
    expect(defines.BH_STEPS).toBe(String(steps.maxSteps));
    expect(defines.BH_MAX_CROSSINGS).toBe(String(steps.maxCrossings));
    expect(Number(defines.BH_STEP_FACTOR)).toBe(steps.stepFactor);
    expect(Number(defines.BH_MIN_STEP)).toBe(steps.minStep);
    expect(Number(defines.BH_MAX_STEP)).toBe(steps.maxStep);
    expect(Number(defines.BH_FAR_STEP_FACTOR)).toBe(steps.farStepFactor);
    // Flottants GLSL : toujours un point décimal.
    for (const key of ["BH_STEP_FACTOR", "BH_MIN_STEP", "BH_MAX_STEP", "BH_FAR_STEP_FACTOR"]) {
      expect(defines[key]).toMatch(/\./);
    }
    expect(defines.BH_LITE).toBe(lite ? "" : undefined);
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

  it("devrait tracer le cœur de rayon max(encombrement, LENS_QUAD_RS), à la taille de son r_s, rectangle à sa mesure", () => {
    expect(LENS_QUAD_RS).toBe(10);
    const wide = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS.dormant, extentRs: 12, radius: 3 }));
    const faint = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS["faint-ring"], extentRs: 3.2 }));
    expect(wide.mesh.material.uniforms.uCoreRs.value).toBe(12);
    expect(wide.mesh.material.uniforms.uQuadRs.value).toBe(12);
    expect(wide.mesh.material.uniforms.uRadius.value).toBe(3);
    expect(faint.mesh.material.uniforms.uCoreRs.value).toBe(LENS_QUAD_RS);
    expect(faint.mesh.material.uniforms.uQuadRs.value).toBe(LENS_QUAD_RS);
  });

  it("devrait agrandir le rectangle pour un jet, jusqu'à trois largeurs au-delà de son bout, et lui seul", () => {
    const hole = createBlackHoleMesh(options({ look: { ...BARE, jet: { ...JET, lengthRs: 30, halfAngleDeg: 2 } } }));
    const { uCoreRs, uQuadRs } = hole.mesh.material.uniforms;
    expect(uCoreRs.value).toBe(10);
    expect(uQuadRs.value).toBeCloseTo(30 + 3 * (0.25 + 30 * Math.tan((2 * Math.PI) / 180)), 12);
    hole.setLook(BARE);
    expect(uQuadRs.value).toBe(10);
  });

  it("devrait prémultiplier sa couleur : hors du cœur, la lumière du jet s'ajoute au fond", () => {
    const { material } = createBlackHoleMesh(options()).mesh;
    expect(material.premultipliedAlpha).toBe(true);
    expect(material.fragmentShader).toContain("gl_FragColor.rgb *= gl_FragColor.a;");
    // Jet ajouté après le tone mapping, le même dans le cœur et au-delà : aucune couture à son bord.
    expect(material.fragmentShader).toContain("gl_FragColor.rgb += linearToOutputTexel(jet).rgb;");
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
    expect(fragmentShader).toMatch(/gl_FragColor = vec4\(\w+, uOpacity \* \w+\);/);
  });

  it("devrait copier les couleurs de l'aspect : un réglage du maillage ne touche pas l'aspect partagé", () => {
    const color = new Color(0.5, 0.6, 0.7);
    const look = { ...BARE, jet: { ...JET, color }, glow: { ...GLOW, color } };
    const { mesh } = createBlackHoleMesh(options({ look, extentRs: 10 }));
    // Aucun uniforme ne garde l'objet couleur de l'aspect : il est copié.
    expect(Object.values(mesh.material.uniforms).map((uniform) => uniform.value)).not.toContain(color);
    expect((mesh.material.uniforms.uJetColor.value as Color).equals(color)).toBe(true);
  });

  it("devrait déclarer dans ses shaders chaque uniforme qu'il fournit, et fournir chaque uniforme déclaré", () => {
    const { material } = createBlackHoleMesh(options()).mesh;
    const source = `${material.vertexShader}\n${material.fragmentShader}`;
    const declared = new Set([...source.matchAll(/uniform \w+ (\w+)/g)].map((match) => match[1]));
    expect([...declared].sort()).toEqual(Object.keys(material.uniforms).sort());
  });

  it("devrait fournir chaque define qu'emploie le fragment", () => {
    const { material } = createBlackHoleMesh(options({ lite: true })).mesh;
    const used = new Set([...material.fragmentShader.matchAll(/\bBH_[A-Z_]+\b/g)].map((match) => match[0]));
    for (const name of used) expect(Object.keys(material.defines)).toContain(name);
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
      expect(() => createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS.dormant, extentRs }))).toThrow(RangeError);
    },
  );
});

describe("BlackHoleMesh.setLook", () => {
  it("devrait écrire l'aspect dans les uniformes : gains nuls pour ce qui manque", () => {
    const hole = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS["faint-ring"], extentRs: 10 }));
    const { uniforms } = hole.mesh.material;
    expect(uniforms.uDiskGain.value).toBe(0);
    expect(uniforms.uFlowGain.value).toBe(BLACK_HOLE_LOOKS["faint-ring"].flow?.gain);
    expect(uniforms.uJetGain.value).toBe(0);
    expect(uniforms.uGlowGain.value).toBe(0);
    hole.setLook({ ...BARE, glow: GLOW });
    expect(uniforms.uFlowGain.value).toBe(0);
    expect(uniforms.uGlowGain.value).toBe(GLOW.gain);
    expect(uniforms.uGlowRing.value).toBe(GLOW.ring);
  });

  it("devrait poser l'axe du disque, le moment cinétique du gaz et une base directe de son plan", () => {
    const hole = createBlackHoleMesh(options({ look: { ...BARE, inclinationDeg: 30, positionAngleDeg: 40, clockwise: true } }));
    const { uAxis, uSpin, uDiskE1, uDiskE2 } = hole.mesh.material.uniforms;
    const axis = uAxis.value as Vector3;
    const spin = uSpin.value as Vector3;
    const e1 = uDiskE1.value as Vector3;
    const e2 = uDiskE2.value as Vector3;
    expect(axis.distanceTo(diskAxis(30, 40))).toBeLessThan(1e-12);
    // Sens horaire vu de la caméra : moment cinétique opposé à l'axe tourné vers elle.
    expect(spin.dot(axis)).toBeCloseTo(-1, 12);
    expect(e1.dot(spin)).toBeCloseTo(0, 12);
    expect(e2.dot(spin)).toBeCloseTo(0, 12);
    expect(e1.clone().cross(e2).distanceTo(spin)).toBeLessThan(1e-12);
  });

  it("devrait convertir l'opacité en épaisseur optique et la période en vitesse angulaire", () => {
    const hole = createBlackHoleMesh(options({ look: { ...BARE, orbitPeriodS: 8, disk: { ...DISK, opacity: 0.5 } } }));
    const { uniforms } = hole.mesh.material;
    expect(uniforms.uDiskDepth.value).toBeCloseTo(Math.LN2, 12);
    expect(uniforms.uOrbitRate.value).toBeCloseTo((2 * Math.PI) / 8, 12);
  });

  it("devrait refuser un aspect qui déborde de l'encombrement du maillage", () => {
    const hole = createBlackHoleMesh(options({ look: BLACK_HOLE_LOOKS["faint-ring"], extentRs: 3.2 }));
    expect(() => hole.setLook(BLACK_HOLE_LOOKS["jet-ring"])).toThrow(RangeError);
  });
});

describe("BLACK_HOLE_FRAGMENT", () => {
  /** Corps de la boucle du tracé : de son ouverture à l'accolade qui la ferme. */
  function marchLoop(): string {
    const start = BLACK_HOLE_FRAGMENT.indexOf("for (int i = 0; i < BH_STEPS; i++)");
    expect(start).toBeGreaterThan(0);
    let depth = 0;
    for (let i = BLACK_HOLE_FRAGMENT.indexOf("{", start); i < BLACK_HOLE_FRAGMENT.length; i++) {
      if (BLACK_HOLE_FRAGMENT[i] === "{") depth++;
      if (BLACK_HOLE_FRAGMENT[i] === "}" && --depth === 0) return BLACK_HOLE_FRAGMENT.slice(start, i + 1);
    }
    throw new Error("boucle non fermée");
  }

  it("devrait tracer dans une boucle bornée par un define, sans dérivée ni discard", () => {
    expect(marchLoop()).not.toMatch(/\b(fwidth|dFdx|dFdy|discard)\b/);
    // Aucun discard nulle part : hors du cercle, alpha nul, et les dérivées restent définies pour les voisins.
    expect(BLACK_HOLE_FRAGMENT).not.toMatch(/\bdiscard\b/);
  });

  it("devrait prendre ses dérivées dans main seulement, hors de toute boucle et de toute branche du tracé", () => {
    const main = BLACK_HOLE_FRAGMENT.slice(BLACK_HOLE_FRAGMENT.indexOf("void main()"));
    const before = BLACK_HOLE_FRAGMENT.slice(0, BLACK_HOLE_FRAGMENT.indexOf("void main()"));
    expect(before).not.toMatch(/\b(fwidth|dFdx|dFdy)\b/);
    expect(main).toMatch(/\bdFdx\(dir\)/);
    // Racine de l'aire du pixel dans le ciel source, comme le fond.
    expect(main).toContain("clamp(sqrt(length(cross(dFdx(sky), dFdy(sky)))), uPixelAngle, 4.0 * uPixelAngle)");
  });

  it("devrait intégrer le jet hors du tracé, le long de la visée, et le cacher derrière l'ombre", () => {
    expect(BLACK_HOLE_FRAGMENT).toMatch(/vec3 jetLight\(vec3 d\)/);
    expect(BLACK_HOLE_FRAGMENT).toContain("jetLight(dir)");
    expect(BLACK_HOLE_FRAGMENT).toContain("length(cross(c, d)) < SHADOW_RS && t > -cd");
    expect(marchLoop()).not.toContain("uJet");
  });

  it("devrait tracer le repère de l'horizon en pointillés de laiton, fin et discret", () => {
    expect(BLACK_HOLE_FRAGMENT).toContain("const float HORIZON_ALPHA = 0.35;");
    expect(BLACK_HOLE_FRAGMENT).toContain("HORIZON_ALPHA * onLine * onDash * uHorizonMark");
    // Trait d'un px CSS : demi-largeur 0,5 uPixelAngle.
    expect(BLACK_HOLE_FRAGMENT).toContain("(0.5 * uPixelAngle - abs(angle - horizon))");
  });

  it("devrait inclure une fois le ciel et le bruit, et raccorder son ciel à la lentille faible du fond", () => {
    expect(occurrences(BLACK_HOLE_FRAGMENT, STARFIELD_GLSL)).toBe(1);
    expect(occurrences(BLACK_HOLE_FRAGMENT, NOISE_GLSL)).toBe(1);
    expect(BLACK_HOLE_FRAGMENT).toContain("lensSky(dir, vec3(0.0))");
    // Déviation tracée ajoutée à celles des autres trous noirs, comme le fond les somme.
    expect(BLACK_HOLE_FRAGMENT).toContain("lensVector(dir, uCamLocal)");
    expect(BLACK_HOLE_FRAGMENT).toContain("rotateBy(dir, turnVector(dir, skies[0]) + others)");
    // Raccord sur le dernier dixième du rectangle, selon le paramètre d'impact de la droite du pixel.
    expect(BLACK_HOLE_FRAGMENT).toContain("smoothstep(0.9 * uCoreRs, uCoreRs, dist * sin(angle))");
  });

  it("devrait équilibrer accolades et parenthèses", () => {
    expect(occurrences(BLACK_HOLE_FRAGMENT, "{")).toBe(occurrences(BLACK_HOLE_FRAGMENT, "}"));
    expect(occurrences(BLACK_HOLE_FRAGMENT, "(")).toBe(occurrences(BLACK_HOLE_FRAGMENT, ")"));
  });

  it("ne devrait nommer aucune variable d'un mot réservé de GLSL ES 3.00 ni d'une fonction du préambule de three", () => {
    const reserved =
      /\b(?:float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|mat[234])\s+(sample|filter|input|output|common|flat|smooth|active|partition|patch|half|fixed|long|short|double|this|union|enum|class|namespace|using|cast|sizeof|template|typedef|static|public|extern|external|interface|inline|noinline|volatile|goto|asm|superp|resource|subroutine|unsigned|luminance|saturate|toneMapping|linearToOutputTexel)\b/;
    expect(BLACK_HOLE_FRAGMENT).not.toMatch(reserved);
  });

  it("devrait suivre le modèle TypeScript : départ, pas et décalages spectraux aux mêmes formules", () => {
    expect(BLACK_HOLE_FRAGMENT).toContain("START_IMPACT_RATIO * impact");
    expect(BLACK_HOLE_FRAGMENT).toContain("inversesqrt(max(1.0 - 1.0 / dist, 1e-6))");
    expect(BLACK_HOLE_FRAGMENT).toContain("max(BH_MIN_STEP, BH_FAR_STEP_FACTOR * r)");
    expect(BLACK_HOLE_FRAGMENT).toContain("clamp(BH_STEP_FACTOR * r, BH_MIN_STEP, BH_MAX_STEP)");
    expect(BLACK_HOLE_FRAGMENT).toContain("-1.5 * h2");
  });
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
