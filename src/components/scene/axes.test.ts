import { Group, Mesh, SphereGeometry, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { orientAxis, primeMeridianAngle } from "@/components/scene/axes";
import { heliocentric, julianDate } from "@/lib/astro/ephemeris";
import { ROTATION } from "@/lib/astro/orientation";
import { PLANET_BY_KEY } from "@/lib/astro/planets";
import { toScene } from "@/lib/astro/scale";

/**
 * Composition réelle du moteur : repère d'axe, rotation W de la sphère et convention UV de
 * SphereGeometry. Une base gauche, un W de signe opposé ou une carte décalée feraient échouer ces tests.
 */

const jdOf = (iso: string) => julianDate(Date.parse(iso));

/** Terre orientée comme dans la scène, à la date donnée. */
function earthAt(jd: number) {
  const axis = new Group();
  const sphere = new Mesh(new SphereGeometry(1, 64, 32));
  axis.add(sphere);
  const pole = orientAxis(axis, ROTATION.earth, jd, new Vector3());
  sphere.rotation.y = primeMeridianAngle(ROTATION.earth, jd);
  axis.updateMatrixWorld(true);
  return { sphere, pole };
}

/** Direction (monde) du sommet de la sphère dont les coordonnées de texture valent (u, v). */
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

function sunSeenFromEarth(jd: number): Vector3 {
  const p = toScene(heliocentric(PLANET_BY_KEY.earth, jd), 0);
  return new Vector3(-p.x, -p.y, -p.z).normalize();
}

const angleDeg = (a: Vector3, b: Vector3) => (a.angleTo(b) * 180) / Math.PI;

describe("orientAxis et primeMeridianAngle", () => {
  it("devraient tourner Greenwich (centre de la carte) vers le Soleil à midi UTC à l'équinoxe", () => {
    const jd = jdOf("2026-03-20T12:00:00Z");
    const { sphere } = earthAt(jd);
    // Point subsolaire à 1,9° Est (équation du temps) : Greenwich en est à moins de 3°.
    expect(angleDeg(directionAt(sphere, 0.5, 0.5), sunSeenFromEarth(jd))).toBeLessThan(3);
  });

  it("devraient tourner la longitude 90° Est vers le Soleil six heures plus tôt", () => {
    const jd = jdOf("2026-03-20T06:00:00Z");
    const { sphere } = earthAt(jd);
    expect(angleDeg(directionAt(sphere, 0.75, 0.5), sunSeenFromEarth(jd))).toBeLessThan(3);
  });

  it("devraient placer le haut de la carte (v = 1) sur le pôle nord", () => {
    const { sphere, pole } = earthAt(jdOf("2026-10-27T00:00:00Z"));
    // Au pôle, SphereGeometry décale u d'un demi-segment (1/128 pour 64 segments).
    expect(angleDeg(directionAt(sphere, 0.5 + 0.5 / 64, 1), pole)).toBeLessThan(1e-3);
  });
});
