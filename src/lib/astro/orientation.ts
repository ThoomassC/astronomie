import { J2000_JD, OBLIQUITY_J2000_DEG, type Vec3 } from "./constants";
import type { PlanetKey } from "./planets";

/**
 * Modèle de rotation de l'UAI (WGCCRE 2015, Archinal et al. 2018), sans les termes
 * périodiques (moins d'un degré). Mars suit le rapport de 2009 : celui de 2015 n'atteint
 * la même direction du pôle qu'avec un terme de longue période de 1,6° en déclinaison.
 * Le pôle nord est celui qui se trouve au nord du plan invariable du système solaire :
 * Vénus et Uranus tournent donc dans le sens négatif.
 */
export interface RotationModel {
  /** Ascension droite du pôle nord à J2000 et sa dérive, en ° et ° par siècle julien. */
  ra: readonly [deg: number, perCentury: number];
  /** Déclinaison du pôle nord à J2000 et sa dérive, en ° et ° par siècle julien. */
  dec: readonly [deg: number, perCentury: number];
  /** Méridien origine W à J2000 et vitesse de rotation, en ° et ° par jour (négative : rotation rétrograde). */
  w: readonly [deg: number, perDay: number];
}

export const ROTATION: Record<PlanetKey, RotationModel> = {
  mercury: { ra: [281.0103, -0.0328], dec: [61.4155, -0.0049], w: [329.5988, 6.1385108] },
  venus: { ra: [272.76, 0], dec: [67.16, 0], w: [160.2, -1.4813688] },
  earth: { ra: [0, -0.641], dec: [90, -0.557], w: [190.147, 360.9856235] },
  mars: { ra: [317.68143, -0.1061], dec: [52.8865, -0.0609], w: [176.63, 350.89198226] },
  jupiter: { ra: [268.056595, -0.006499], dec: [64.495303, 0.002413], w: [284.95, 870.536] },
  saturn: { ra: [40.589, -0.036], dec: [83.537, -0.004], w: [38.9, 810.7939024] },
  uranus: { ra: [257.311, 0], dec: [-15.175, 0], w: [203.81, -501.1600928] },
  neptune: { ra: [299.36, 0], dec: [43.46, 0], w: [249.978, 541.1397757] },
};

const D2R = Math.PI / 180;
const COS_E = Math.cos(OBLIQUITY_J2000_DEG * D2R);
const SIN_E = Math.sin(OBLIQUITY_J2000_DEG * D2R);

/** Vecteur équatorial (ICRF) vers les coordonnées de scène (écliptique J2000 rangée en x, z, −y). */
function equatorialToScene(x: number, y: number, z: number, out: Vec3): Vec3 {
  const eclipticY = y * COS_E + z * SIN_E;
  const eclipticZ = -y * SIN_E + z * COS_E;
  out.x = x;
  out.y = eclipticZ;
  out.z = -eclipticY;
  return out;
}

function poleRaDec(model: RotationModel, jd: number): { ra: number; dec: number } {
  const centuries = (jd - J2000_JD) / 36525;
  return {
    ra: (model.ra[0] + model.ra[1] * centuries) * D2R,
    dec: (model.dec[0] + model.dec[1] * centuries) * D2R,
  };
}

/** Pôle nord de l'astre, vecteur unitaire en coordonnées de scène. */
export function poleDirection(model: RotationModel, jd: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const { ra, dec } = poleRaDec(model, jd);
  return equatorialToScene(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), out);
}

/**
 * Nœud ascendant de l'équateur de l'astre sur l'équateur céleste (ascension droite α₀ + 90°),
 * origine de l'angle W. Vecteur unitaire en coordonnées de scène.
 */
export function equatorNode(model: RotationModel, jd: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const { ra } = poleRaDec(model, jd);
  return equatorialToScene(-Math.sin(ra), Math.cos(ra), 0, out);
}

/** Angle W du méridien origine, compté vers l'est depuis le nœud, en degrés dans [0, 360[. */
export function primeMeridianDeg(model: RotationModel, jd: number): number {
  const w = (model.w[0] + model.w[1] * (jd - J2000_JD)) % 360;
  return w < 0 ? (w + 360) % 360 : w;
}

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Point de la surface où le Soleil est au zénith : latitude et longitude Est (degrés,
 * longitude dans ]−180, 180]), pour la direction du Soleil vue depuis l'astre (scène).
 */
export function subsolarPoint(
  model: RotationModel,
  jd: number,
  sunDirection: Vec3,
): { latDeg: number; lonDeg: number } {
  const pole = poleDirection(model, jd);
  const node = equatorNode(model, jd);
  const w = primeMeridianDeg(model, jd) * D2R;
  const east = cross(pole, node);
  const meridian: Vec3 = {
    x: node.x * Math.cos(w) + east.x * Math.sin(w),
    y: node.y * Math.cos(w) + east.y * Math.sin(w),
    z: node.z * Math.cos(w) + east.z * Math.sin(w),
  };
  const length = Math.hypot(sunDirection.x, sunDirection.y, sunDirection.z);
  const sinLat = dot(sunDirection, pole) / length;
  return {
    latDeg: Math.asin(Math.min(1, Math.max(-1, sinLat))) / D2R,
    lonDeg: Math.atan2(dot(sunDirection, cross(pole, meridian)), dot(sunDirection, meridian)) / D2R,
  };
}
