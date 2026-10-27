/** Unité astronomique, en kilomètres. */
export const AU_KM = 149_597_870.7;
/** Temps mis par la lumière pour parcourir 1 UA, en secondes. */
export const LIGHT_SECONDS_PER_AU = 499.004784;
export const DAY_MS = 86_400_000;
export const YEAR_DAYS = 365.25;
/** Jour julien de l'époque J2000 (1er janvier 2000, 12 h TT). */
export const J2000_JD = 2_451_545;
/** Gravité de référence à la surface de la Terre, en m/s². */
export const EARTH_G = 9.81;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };
