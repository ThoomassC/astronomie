import { Texture, Vector3, type Mesh, type SphereGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  ORBIT_SEGMENTS,
  createPlanet,
  createSky,
  createSun,
  fadeOrbitNear,
  fadeSky,
  scaleSun,
  type PlanetBody,
} from "@/components/scene/bodies";
import { sceneFromGalactic } from "@/lib/astro/galactic";
import { PLANET_BY_KEY } from "@/lib/astro/planets";

/** Rayon de l'orbite tracée à la main, en unités de scène (celui de Saturne en distances compressées, à peu près). */
const ORBIT_RADIUS = 80;

/**
 * Saturne sur une orbite circulaire tracée à la main (le moteur la calcule d'après les éphémérides), posée sur le
 * premier sommet, en (ORBIT_RADIUS, 0, 0).
 */
function saturnOnCircle(): PlanetBody {
  const body = createPlanet(PLANET_BY_KEY.saturn, new Texture());
  for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
    const angle = (i / ORBIT_SEGMENTS) * 2 * Math.PI;
    body.orbitPositions.setXYZ(i, ORBIT_RADIUS * Math.cos(angle), 0, ORBIT_RADIUS * Math.sin(angle));
  }
  body.orbitPositions.needsUpdate = true;
  body.position.set(ORBIT_RADIUS, 0, 0);
  return body;
}

/** Alpha de chaque sommet de l'orbite (quatrième composante de sa couleur). */
const orbitAlphas = (body: PlanetBody) =>
  Array.from({ length: body.orbitColors.count }, (_, i) => body.orbitColors.getW(i));

describe("orbite d'une planète", () => {
  it("devrait se dessiner avec une couleur RGBA par sommet, blanche et opaque tant que rien ne l'estompe", () => {
    const body = saturnOnCircle();
    expect(body.orbit.material.vertexColors).toBe(true);
    expect(body.orbit.geometry.getAttribute("color")).toBe(body.orbitColors);
    expect(body.orbitColors.itemSize).toBe(4);
    expect(body.orbitColors.count).toBe(ORBIT_SEGMENTS + 1);
    expect(new Set(body.orbitColors.array)).toEqual(new Set([1]));
  });
});

describe("fadeOrbitNear", () => {
  it("devrait effacer l'orbite sur la planète au repos, et la laisser entière à l'opposé", () => {
    const body = saturnOnCircle();
    fadeOrbitNear(body, 1, 2.8);
    const alphas = orbitAlphas(body);
    expect(alphas[0]).toBe(0);
    expect(alphas[ORBIT_SEGMENTS / 2]).toBe(1);
    // Moins de la moitié des sommets du tour touchés : l'effacement reste autour de la planète.
    expect(alphas.filter((alpha) => alpha < 1).length).toBeLessThan(ORBIT_SEGMENTS / 10);
  });

  it("ne devrait rien réécrire tant que ni le repos, ni le rayon, ni la planète, ni l'orbite n'ont bougé", () => {
    const body = saturnOnCircle();
    fadeOrbitNear(body, 1, 2.8);
    const written = body.orbitColors.version;
    fadeOrbitNear(body, 1, 2.8);
    expect(body.orbitColors.version).toBe(written);
    body.position.set(0, 0, ORBIT_RADIUS);
    fadeOrbitNear(body, 1, 2.8);
    expect(body.orbitColors.version).toBeGreaterThan(written);
    expect(orbitAlphas(body)[ORBIT_SEGMENTS / 4]).toBe(0);
  });

  it("devrait rendre l'orbite entière quand le repos retombe à 0, puis ne plus la relire", () => {
    const body = saturnOnCircle();
    fadeOrbitNear(body, 1, 2.8);
    fadeOrbitNear(body, 0, 2.8);
    expect(new Set(orbitAlphas(body))).toEqual(new Set([1]));
    const written = body.orbitColors.version;
    body.position.set(0, 0, ORBIT_RADIUS);
    fadeOrbitNear(body, 0, 2.8);
    expect(body.orbitColors.version).toBe(written);
  });
});

/**
 * La carte de la Voie lactée est en coordonnées galactiques : centre galactique au milieu,
 * l croissant vers la gauche, sud en haut (repéré sur l'image grâce aux Nuages de Magellan).
 */

/** Direction (monde) du premier sommet de la sphère dont les coordonnées de texture valent (u, v). */
function directionAt(sphere: Mesh<SphereGeometry>, u: number, v: number): Vector3 {
  const uv = sphere.geometry.getAttribute("uv");
  const position = sphere.geometry.getAttribute("position");
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(uv.getX(i) - u) < 1e-6 && Math.abs(uv.getY(i) - v) < 1e-6) {
      return new Vector3().fromBufferAttribute(position, i).applyMatrix4(sphere.matrixWorld).normalize();
    }
  }
  throw new Error(`Aucun sommet en (${u}, ${v})`);
}

const angleDeg = (a: Vector3, b: Vector3) => (a.angleTo(b) * 180) / Math.PI;
function galactic(l: number, b: number): Vector3 {
  const direction = new Vector3();
  sceneFromGalactic(l, b, direction);
  return direction;
}

describe("createSky", () => {
  const { milkyWay } = createSky(new Texture());
  milkyWay.updateMatrixWorld(true);

  it("devrait placer le centre galactique au milieu de la carte", () => {
    expect(angleDeg(directionAt(milkyWay, 0.5, 0.5), galactic(0, 0))).toBeLessThan(1e-3);
  });

  it("devrait placer l = 90° à gauche du centre (u = 0,25)", () => {
    expect(angleDeg(directionAt(milkyWay, 0.25, 0.5), galactic(90, 0))).toBeLessThan(1e-3);
  });

  it("devrait placer le pôle sud galactique en haut de la carte", () => {
    // Au pôle, SphereGeometry décale u d'un demi-segment (1/128 pour 64 segments).
    expect(angleDeg(directionAt(milkyWay, 0.5 / 64, 1), galactic(0, -90))).toBeLessThan(1e-3);
  });
});

describe("fadeSky", () => {
  it("devrait cacher tout le ciel quand son poids est nul (aucun appel de dessin)", () => {
    const sky = createSky(new Texture());
    fadeSky(sky, 0);
    expect(sky.group.visible).toBe(false);
  });

  it("devrait atténuer de moitié la Voie lactée photographiée et les étoiles de fond quand son poids vaut 0,5", () => {
    const sky = createSky(new Texture());
    fadeSky(sky, 0.5);
    expect(sky.group.visible).toBe(true);
    expect(sky.uniforms.uIntensity.value).toBeCloseTo(0.55, 12);
    expect(sky.layers.length).toBeGreaterThan(0);
    expect(sky.layers.map((layer) => layer.material.opacity)).toEqual(sky.layers.map(() => expect.closeTo(0.5, 12)));
  });

  it("devrait rendre au ciel sa pleine intensité (1,1) et le remontrer quand son poids revient à 1", () => {
    const sky = createSky(new Texture());
    fadeSky(sky, 0);
    fadeSky(sky, 1);
    expect(sky.group.visible).toBe(true);
    expect(sky.uniforms.uIntensity.value).toBeCloseTo(1.1, 12);
  });
});

describe("scaleSun", () => {
  it("devrait garder la couronne d'aujourd'hui (demi-côté 95, rayon 7) en distances compressées, sans zoom cosmique", () => {
    const sun = createSun();
    scaleSun(sun, 0);
    expect(sun.coronaUniforms.uSize.value).toBeCloseTo(95, 12);
    expect(sun.coronaUniforms.uSunRadius.value).toBeCloseTo(7, 12);
  });

  it("devrait ramener la couronne à 30 et le rayon à 0,35 en distances réelles, sans zoom cosmique", () => {
    const sun = createSun();
    scaleSun(sun, 1);
    expect(sun.coronaUniforms.uSize.value).toBeCloseTo(30, 12);
    expect(sun.coronaUniforms.uSunRadius.value).toBeCloseTo(0.35, 12);
  });

  it("devrait réduire la couronne avec le zoom cosmique, en espace vue (× 0,01 : 0,95 et 0,07)", () => {
    const sun = createSun();
    scaleSun(sun, 0, 0.01);
    expect(sun.coronaUniforms.uSize.value).toBeCloseTo(0.95, 12);
    expect(sun.coronaUniforms.uSunRadius.value).toBeCloseTo(0.07, 12);
  });

  it("ne devrait pas réduire le maillage du Soleil avec le zoom cosmique (le groupe du système solaire s'en charge)", () => {
    const sun = createSun();
    scaleSun(sun, 0, 0.01);
    expect(sun.mesh.scale.x).toBeCloseTo(1, 12);
  });
});
