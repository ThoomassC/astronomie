import { Texture, Vector3, type Mesh, type SphereGeometry } from "three";
import { describe, expect, it } from "vitest";
import { createSky } from "@/components/scene/bodies";
import { sceneFromGalactic } from "@/lib/astro/galactic";

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
