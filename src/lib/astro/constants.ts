/** Unité astronomique, en kilomètres. */
export const AU_KM = 149_597_870.7;
/** Unités astronomiques par année-lumière (UAI : 1 al = 9 460 730 472 580,8 km). */
export const AU_PER_LIGHT_YEAR = 63_241.077;
/** Temps mis par la lumière pour parcourir 1 UA, en secondes. */
export const LIGHT_SECONDS_PER_AU = 499.004784;
export const DAY_MS = 86_400_000;
export const YEAR_DAYS = 365.25;
/** Jour julien de l'époque J2000 (1er janvier 2000, 12 h TT). */
export const J2000_JD = 2_451_545;
/** Obliquité de l'écliptique à J2000 (UAI 2006), en degrés. */
export const OBLIQUITY_J2000_DEG = 23.4392911;
/** Gravité de référence à la surface de la Terre, en m/s². */
export const EARTH_G = 9.81;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Saisie refusée, décrite par sa forme et non par une phrase : texte illisible, ou nombre hors des bornes incluses
 * `min`..`max`. Le module qui affiche le champ en écrit le message, dans sa langue.
 */
export type ParseError = { kind: "format" } | { kind: "range"; min: number; max: number };

export type ParseResult = { ok: true; value: number } | { ok: false; error: ParseError };
