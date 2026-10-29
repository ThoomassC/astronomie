import { OBLIQUITY_J2000_DEG, type Vec3 } from "./constants";

/**
 * Coordonnées galactiques, pour poser la Voie lactée à sa vraie place dans le ciel de la scène.
 * Équatorial J2000 → galactique : matrice de référence d'Hipparcos (ESA 1997, vol. 1, § 1.5.3).
 */
const EQUATORIAL_TO_GALACTIC = [
  -0.0548755604162154, -0.873437090234885, -0.4838350155487132, 0.4941094278755837, -0.4448296299600112,
  0.7469822444972189, -0.8676661490190047, -0.1980763734312015, 0.4559837761750669,
] as const;

const SIN_E = Math.sin((OBLIQUITY_J2000_DEG * Math.PI) / 180);
const COS_E = Math.cos((OBLIQUITY_J2000_DEG * Math.PI) / 180);

/** Scène (écliptique J2000 rangée en x, z, −y) vers équatorial, ligne par ligne. */
const SCENE_TO_EQUATORIAL = [1, 0, 0, 0, -SIN_E, -COS_E, 0, COS_E, -SIN_E] as const;

function multiply(a: readonly number[], b: readonly number[]): number[] {
  const out: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out.push(a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col]);
    }
  }
  return out;
}

/** Rotation des coordonnées de scène vers les coordonnées galactiques, ligne par ligne. */
export const SCENE_TO_GALACTIC: readonly number[] = multiply(EQUATORIAL_TO_GALACTIC, SCENE_TO_EQUATORIAL);

/**
 * Distance du Soleil au centre galactique, en années-lumière : 27 000 (GRAVITY Collaboration 2021-2022 :
 * 8 275 à 8 277 pc, soit 26 990 à 27 000 al ; ESO : « environ 27 000 al »).
 */
export const GALACTIC_CENTER_DISTANCE_LY = 27_000;

/** Rayon du disque d'étoiles de la Voie lactée, en années-lumière (NASA, ESA : environ 100 000 al de diamètre). */
export const GALACTIC_DISK_RADIUS_LY = 50_000;

/** Applique la transposée (l'inverse) d'une rotation donnée ligne par ligne. */
function rotateBack(m: readonly number[], x: number, y: number, z: number, out: Vec3): Vec3 {
  out.x = m[0] * x + m[3] * y + m[6] * z;
  out.y = m[1] * x + m[4] * y + m[7] * z;
  out.z = m[2] * x + m[5] * y + m[8] * z;
  return out;
}

/** Direction unitaire de la scène pour des coordonnées équatoriales J2000 (ascension droite, déclinaison, en degrés). */
export function sceneFromEquatorial(raDeg: number, decDeg: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  return rotateBack(SCENE_TO_EQUATORIAL, Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), out);
}

/**
 * Vecteur galactique cartésien (x vers l = 0°, y vers l = 90°, z vers le pôle nord galactique), rangé dans
 * les axes de scène sans changer sa norme : une position en années-lumière le reste.
 */
export function sceneFromGalacticXYZ(x: number, y: number, z: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  return rotateBack(SCENE_TO_GALACTIC, x, y, z, out);
}

/** Longitude l dans [0, 360[ et latitude b galactiques (degrés) d'une direction de la scène. */
export function galacticFromScene(v: Vec3): { lDeg: number; bDeg: number } {
  const m = SCENE_TO_GALACTIC;
  const x = m[0] * v.x + m[1] * v.y + m[2] * v.z;
  const y = m[3] * v.x + m[4] * v.y + m[5] * v.z;
  const z = m[6] * v.x + m[7] * v.y + m[8] * v.z;
  const l = (Math.atan2(y, x) * 180) / Math.PI;
  return {
    lDeg: l < 0 ? (l + 360) % 360 : l,
    bDeg: (Math.asin(Math.min(1, Math.max(-1, z / Math.hypot(x, y, z)))) * 180) / Math.PI,
  };
}

/** Direction unitaire de la scène pour des coordonnées galactiques (degrés). */
export function sceneFromGalactic(lDeg: number, bDeg: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const l = (lDeg * Math.PI) / 180;
  const b = (bDeg * Math.PI) / 180;
  return sceneFromGalacticXYZ(Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b), out);
}
