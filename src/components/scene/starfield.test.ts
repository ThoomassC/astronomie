import { Color, Matrix3, Matrix4, PerspectiveCamera, Vector3, Vector4 } from "three";
import { describe, expect, it } from "vitest";
import {
  MAX_STARFIELD_LENSES,
  STAR_CLASS_SHARES,
  STARFIELD_GLSL,
  STARFIELD_RENDER_ORDER,
  createStarfieldBackground,
  nightBeforeToneMapping,
  type StarfieldLens,
} from "@/components/scene/starfield";
import { neutralToneMap, srgbHexToLinear } from "@/components/scene/toneMapping.testUtils";
import { WEAK_DEFLECTION_SERIES } from "@/lib/astro/photonGeodesic";
import { spectralColor, type SpectralClass } from "@/lib/astro/starMap";

/*
 * Fond étoilé de l'onglet « Tailles » : triangle plein écran, dessiné avant tout le reste, dont la nuit sort exactement
 * en --nuit après le tone mapping. Construit sans WebGL : on vérifie les réglages du maillage, les uniformes écrits par
 * `update` et `setLenses`, et la formule de direction du vertex shader, recalculée ici.
 */

const DEG = Math.PI / 180;

/** Écart maximal, canal par canal, entre deux couleurs linéaires. */
const maxGap = (a: readonly number[], b: readonly number[]) => Math.max(...a.map((value, i) => Math.abs(value - b[i])));

describe("nightBeforeToneMapping", () => {
  it("devrait sortir exactement --nuit (#060b18) après PBR Neutral : aucune couture avec le pied de page", () => {
    const night = nightBeforeToneMapping("#060b18");
    expect(maxGap(neutralToneMap([night.r, night.g, night.b]), srgbHexToLinear("#060b18"))).toBeLessThan(1e-6);
  });

  it("devrait éclaircir la nuit du décalage que Neutral retranche aux couleurs sombres", () => {
    const night = nightBeforeToneMapping("#060b18");
    expect(night.r).toBeCloseTo(0.01707, 5);
    expect(night.g).toBeCloseTo(0.018595, 5);
    expect(night.b).toBeCloseTo(0.024383, 5);
  });

  it("devrait inverser aussi une couleur moyenne, sous le coude de la compression (laiton #c2a36b)", () => {
    const brass = nightBeforeToneMapping("#c2a36b");
    expect(maxGap(neutralToneMap([brass.r, brass.g, brass.b]), srgbHexToLinear("#c2a36b"))).toBeLessThan(1e-6);
  });

  it.each(["#ffffff", "#ffb547", "nuit", "#06b18"])(
    "devrait lever une RangeError quand la couleur n'est pas un « #rrggbb » sous le coude de la compression (%s)",
    (hex) => {
      expect(() => nightBeforeToneMapping(hex)).toThrow(RangeError);
    },
  );
});

/** Nombre d'occurrences de `needle` dans `text`. */
const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

describe("STARFIELD_GLSL", () => {
  it("devrait déclarer les uniformes du ciel et les trois fonctions partagées avec les trous noirs", () => {
    expect(STARFIELD_GLSL).toContain("uniform float uPixelAngle;");
    expect(STARFIELD_GLSL).toContain("uniform float uStarfieldGain;");
    expect(STARFIELD_GLSL).toContain("uniform vec3 uNight;");
    expect(STARFIELD_GLSL).toContain("vec3 starfield(vec3 dir, float footprint)");
    expect(STARFIELD_GLSL).toContain("float weakDeflection(float b, float s)");
    expect(STARFIELD_GLSL).toContain("vec3 weakLens(vec3 dir, vec3 cameraLocal, float strength)");
  });

  it("devrait définir une seule fois chaque fonction et déclarer une seule fois chaque uniforme", () => {
    for (const signature of [
      "vec3 starfield(",
      "float weakDeflection(",
      "vec3 weakLens(",
      "vec3 lensShift(",
      "vec3 rotateBy(",
      "vec3 lensVector(",
      "vec3 lensSky(",
      "uvec3 skyHash(",
      "vec3 skyStarColor(",
      "vec3 skyFaceDirection(",
      "vec3 skyLayer(",
    ]) {
      expect(occurrences(STARFIELD_GLSL, signature)).toBe(1);
    }
    const declared = [...STARFIELD_GLSL.matchAll(/uniform \w+ (\w+)/g)].map((match) => match[1]);
    expect(new Set(declared).size).toBe(declared.length);
    expect(declared.sort()).toEqual(
      ["uLensCamera", "uLensCount", "uLensStrength", "uNight", "uPixelAngle", "uStarfieldGain"].sort(),
    );
  });

  it("devrait reprendre les coefficients de la lentille faible du modèle TypeScript (même source)", () => {
    for (const coefficient of WEAK_DEFLECTION_SERIES) expect(STARFIELD_GLSL).toContain(coefficient.toPrecision(9));
  });

  it("devrait colorer les étoiles des sept classes de Harvard, couleurs du design system converties en linéaire", () => {
    const classes = Object.keys(STAR_CLASS_SHARES) as SpectralClass[];
    expect(classes.sort()).toEqual(["A", "B", "F", "G", "K", "M", "O"]);
    for (const spectral of classes) {
      const linear = new Color(spectralColor(spectral));
      const literal = `vec3(${[linear.r, linear.g, linear.b].map((c) => c.toPrecision(9)).join(", ")})`;
      expect(STARFIELD_GLSL).toContain(literal);
    }
    const total = Object.values(STAR_CLASS_SHARES).reduce((sum, share) => sum + share, 0);
    expect(total).toBeCloseTo(1, 12);
  });

  it("devrait équilibrer accolades et parenthèses, et n'employer aucune dérivée (le chunk sert dans des boucles)", () => {
    expect(occurrences(STARFIELD_GLSL, "{")).toBe(occurrences(STARFIELD_GLSL, "}"));
    expect(occurrences(STARFIELD_GLSL, "(")).toBe(occurrences(STARFIELD_GLSL, ")"));
    expect(STARFIELD_GLSL).not.toMatch(/\b(fwidth|dFdx|dFdy|discard)\b/);
  });
});

describe("createStarfieldBackground", () => {
  it("devrait dessiner avant tout le reste, sans test ni écriture de profondeur, sans jamais être écarté", () => {
    const { mesh } = createStarfieldBackground();
    expect(STARFIELD_RENDER_ORDER).toBe(-1000);
    expect(mesh.renderOrder).toBe(STARFIELD_RENDER_ORDER);
    expect(mesh.material.depthTest).toBe(false);
    expect(mesh.material.depthWrite).toBe(false);
    expect(mesh.material.transparent).toBe(false);
    expect(mesh.frustumCulled).toBe(false);
  });

  it("devrait poser un seul triangle, en coordonnées de découpe, qui couvre tout l'écran", () => {
    const position = createStarfieldBackground().mesh.geometry.getAttribute("position");
    expect(position.count).toBe(3);
    const corners = Array.from({ length: 3 }, (_, i) => [position.getX(i), position.getY(i)]);
    expect(corners).toEqual([
      [-1, -1],
      [3, -1],
      [-1, 3],
    ]);
  });

  it("devrait partir de la nuit avant tone mapping et d'un éclat d'étoiles réglable (1 par défaut)", () => {
    const { uniforms } = createStarfieldBackground({ gain: 0.5 });
    expect(uniforms.uStarfieldGain.value).toBe(0.5);
    expect(createStarfieldBackground().uniforms.uStarfieldGain.value).toBe(1);
    expect(uniforms.uNight.value.equals(nightBeforeToneMapping("#060b18"))).toBe(true);
  });

  it("devrait donner au programme les uniformes du ciel eux-mêmes, que les trous noirs partagent", () => {
    const { mesh, uniforms } = createStarfieldBackground();
    expect(mesh.material.uniforms.uPixelAngle).toBe(uniforms.uPixelAngle);
    expect(mesh.material.uniforms.uStarfieldGain).toBe(uniforms.uStarfieldGain);
    expect(mesh.material.uniforms.uNight).toBe(uniforms.uNight);
    // Lentilles comprises : chaque trou noir applique celles des autres à son ciel, comme le fond.
    expect(mesh.material.uniforms.uLensCamera).toBe(uniforms.uLensCamera);
    expect(mesh.material.uniforms.uLensStrength).toBe(uniforms.uLensStrength);
    expect(mesh.material.uniforms.uLensCount).toBe(uniforms.uLensCount);
  });

  it("devrait inclure STARFIELD_GLSL une seule fois et sortir par le tone mapping et l'encodage sRGB", () => {
    const { fragmentShader } = createStarfieldBackground().mesh.material;
    expect(fragmentShader.split(STARFIELD_GLSL)).toHaveLength(2);
    expect(fragmentShader).toContain("precision highp float;");
    expect(fragmentShader).toContain("#include <tonemapping_fragment>");
    expect(fragmentShader).toContain("#include <colorspace_fragment>");
  });

  it("devrait dévier le ciel par toutes les lentilles, puis mesurer l'étirement des étoiles hors de toute boucle", () => {
    const { fragmentShader } = createStarfieldBackground().mesh.material;
    expect(fragmentShader).toContain("lensSky(dir, vec3(0.0))");
    expect(fragmentShader).toMatch(/clamp\(length\(fwidth\(\w+\)\), uPixelAngle, 4\.0 \* uPixelAngle\)/);
    expect(fragmentShader.indexOf("fwidth")).toBeGreaterThan(fragmentShader.indexOf("void main"));
  });
});

describe("StarfieldBackground.update", () => {
  /** Caméra de la scène des tailles : légère élévation, cible décalée à l'écran par setViewOffset. */
  function sizesCamera(): PerspectiveCamera {
    const camera = new PerspectiveCamera(36, 1440 / 900, 0.5, 5000);
    camera.position.set(-120, 30, 400);
    camera.lookAt(-120, 0, 0);
    camera.setViewOffset(1440, 900, -0.18 * 1440, 0.05 * 900, 1440, 900);
    camera.updateMatrixWorld();
    return camera;
  }

  it("devrait prendre l'angle d'un px CSS au centre de l'image : 2 tan 18° / 900 pour 36° sur 900 px", () => {
    const background = createStarfieldBackground();
    background.update(sizesCamera(), 900);
    expect(background.uniforms.uPixelAngle.value).toBeCloseTo((2 * Math.tan(18 * DEG)) / 900, 12);
  });

  it("devrait recopier la projection inverse (décalage de vue compris) et l'orientation de la caméra", () => {
    const camera = sizesCamera();
    const background = createStarfieldBackground();
    background.update(camera, 900);
    const { uProjectionInverse, uCameraRotation } = background.mesh.material.uniforms;
    expect((uProjectionInverse.value as Matrix4).equals(camera.projectionMatrixInverse)).toBe(true);
    expect((uCameraRotation.value as Matrix3).equals(new Matrix3().setFromMatrix4(camera.matrixWorld))).toBe(true);
  });

  it.each([
    [0, 0],
    [-1, -1],
    [1, 1],
    [0.3, -0.7],
  ])("devrait viser, au point de découpe (%f ; %f), la direction que la caméra y projette", (x, y) => {
    const camera = sizesCamera();
    const background = createStarfieldBackground();
    background.update(camera, 900);
    const { uProjectionInverse, uCameraRotation } = background.mesh.material.uniforms;
    // Formule du vertex shader : point du plan lointain en espace vue, puis orientation de la caméra.
    expect(background.mesh.material.vertexShader).toContain("uProjectionInverse * vec4(position.xy, 1.0, 1.0)");
    expect(background.mesh.material.vertexShader).toContain("uCameraRotation * (view.xyz / view.w)");
    const view = new Vector4(x, y, 1, 1).applyMatrix4(uProjectionInverse.value as Matrix4);
    const direction = new Vector3(view.x / view.w, view.y / view.w, view.z / view.w)
      .applyMatrix3(uCameraRotation.value as Matrix3)
      .normalize();
    const seen = camera.position.clone().addScaledVector(direction, 250).project(camera);
    expect(seen.x).toBeCloseTo(x, 9);
    expect(seen.y).toBeCloseTo(y, 9);
  });
});

describe("StarfieldBackground.setLenses", () => {
  const lens = (x: number, strength: number): StarfieldLens => ({ cameraLocal: new Vector3(x, 2, 3), strength });

  it("devrait garder au plus MAX_STARFIELD_LENSES trous noirs, les premiers de la liste (les plus grands à l'écran)", () => {
    expect(MAX_STARFIELD_LENSES).toBe(4);
    const background = createStarfieldBackground();
    const lenses = [lens(10, 1), lens(20, 0.5), lens(30, 0.25), lens(40, 1), lens(50, 1)];
    background.setLenses(lenses);
    const { uLensCount, uLensCamera, uLensStrength } = background.mesh.material.uniforms;
    expect(uLensCount.value).toBe(4);
    expect((uLensCamera.value as Vector3[]).map((camera) => camera.x)).toEqual([10, 20, 30, 40]);
    expect(Array.from(uLensStrength.value as Float32Array)).toEqual([1, 0.5, 0.25, 1]);
  });

  it("devrait recopier la caméra de chaque trou noir, que celui-ci réécrit à chaque image", () => {
    const background = createStarfieldBackground();
    const first = lens(12, 1);
    background.setLenses([first]);
    const [copied] = background.mesh.material.uniforms.uLensCamera.value as Vector3[];
    expect(copied).not.toBe(first.cameraLocal);
    expect(copied.equals(first.cameraLocal)).toBe(true);
  });

  it("devrait borner la force à [0 ; 1] et n'en garder aucune quand la liste est vide", () => {
    const background = createStarfieldBackground();
    background.setLenses([lens(1, 1.7), lens(2, -0.2)]);
    expect(Array.from(background.mesh.material.uniforms.uLensStrength.value as Float32Array).slice(0, 2)).toEqual([1, 0]);
    background.setLenses([]);
    expect(background.mesh.material.uniforms.uLensCount.value).toBe(0);
  });
});
