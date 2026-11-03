import { YEAR_DAYS } from "@/lib/astro/constants";
import { julianDate } from "@/lib/astro/ephemeris";
import type { RotationModel } from "@/lib/astro/orientation";

/**
 * Activité et rotation du Soleil : cycle des taches, latitude où elles apparaissent, rotation différentielle,
 * pôle de rotation. Modèles simples, ancrés sur le cycle 25 :
 * - minimum de décembre 2019 (nombre de taches lissé sur 13 mois : 1,8), annoncé le 15 septembre 2020 par le
 *   Solar Cycle 25 Prediction Panel de la NOAA et de la NASA (NOAA SWPC, « Solar prediction scientists announce
 *   Solar Cycle 25 ») ;
 * - maximum d'octobre 2024 : période de maximum annoncée par la NASA et la NOAA le 15 octobre 2024, nombre lissé
 *   de 161 en octobre 2024 d'après le SILSO (Observatoire royal de Belgique, via le STCE) ;
 * - période moyenne de 11 ans. Les vrais cycles durent de 9 à 14 ans et n'ont pas tous la même amplitude :
 *   loin du cycle 25, le modèle ne donne qu'un ordre de grandeur.
 */

/** Durée d'un cycle solaire, en jours (11 ans en moyenne). */
export const SOLAR_CYCLE_DAYS = 11 * YEAR_DAYS;
/** Début du cycle 25 : minimum de décembre 2019 (NOAA SWPC). */
export const CYCLE_25_START_JD = julianDate(Date.UTC(2019, 11, 15));
/** Maximum du cycle 25 : octobre 2024 (NASA, NOAA, SILSO). */
export const CYCLE_25_MAXIMUM_JD = julianDate(Date.UTC(2024, 9, 15));

const MONTH_DAYS = YEAR_DAYS / 12;

/**
 * Forme d'un cycle d'après Hathaway, Wilson et Reichmann (1994, NASA Marshall) : F(t) = t³ / (exp(t²/b²) − c),
 * t en mois depuis le début du cycle, c = 0,71. Montée rapide, descente lente qui chevauche le cycle suivant.
 */
const SHAPE_C = 0.71;
/** u = t²/b² au maximum de F : racine de eᵘ (3 − 2u) = 3c (méthode de Newton, u ≈ 1,169). */
const PEAK_U = (() => {
  let u = 1;
  for (let i = 0; i < 20; i++) {
    const e = Math.exp(u);
    u -= (e * (3 - 2 * u) - 3 * SHAPE_C) / (e * (1 - 2 * u));
  }
  return u;
})();
/** Largeur b, en mois, qui place le maximum en octobre 2024 (58 mois après le début : b ≈ 53,7). */
const WIDTH_MONTHS = (CYCLE_25_MAXIMUM_JD - CYCLE_25_START_JD) / MONTH_DAYS / Math.sqrt(PEAK_U);

function cycleShape(months: number): number {
  return months > 0 ? months ** 3 / (Math.exp((months / WIDTH_MONTHS) ** 2) - SHAPE_C) : 0;
}

const PEAK = cycleShape(WIDTH_MONTHS * Math.sqrt(PEAK_U));

/** Âges, en mois, du cycle en cours et du précédent au jour julien `jd`. */
function cycleAges(jd: number): { current: number; previous: number } {
  const days = (((jd - CYCLE_25_START_JD) % SOLAR_CYCLE_DAYS) + SOLAR_CYCLE_DAYS) % SOLAR_CYCLE_DAYS;
  return { current: days / MONTH_DAYS, previous: (days + SOLAR_CYCLE_DAYS) / MONTH_DAYS };
}

/**
 * Activité du Soleil au jour julien `jd`, de 0 (calme) à 1 (maximum) : somme des formes du cycle en cours et de la
 * fin du précédent, rapportée au maximum, répétée tous les 11 ans. Vaut 1 en octobre 2024, environ 0,05 aux minima
 * (décembre 2019, décembre 2008, décembre 2030).
 */
export function solarActivity(jd: number): number {
  const { current, previous } = cycleAges(jd);
  return Math.min(1, (cycleShape(current) + cycleShape(previous)) / PEAK);
}

/**
 * Latitude moyenne où naissent les taches, en degrés (valeur absolue, les deux hémisphères sont symétriques) :
 * loi de Spörer sous la forme de Hathaway (2011, « A Standard Law for the Equatorward Drift of the Sunspot Zones »),
 * λ = 28° · exp(−t / 90 mois), t mesuré depuis le début du cycle. Celle du cycle qui domine : juste après le
 * minimum, les dernières taches de l'ancien cycle, près de l'équateur, l'emportent encore (ailes du « papillon »).
 */
export function sunspotLatitude(jd: number): number {
  const { current, previous } = cycleAges(jd);
  const age = cycleShape(current) >= cycleShape(previous) ? current : previous;
  return 28 * Math.exp(-age / 90);
}

/**
 * Vitesse de rotation sidérale du Soleil à la latitude donnée (degrés), en degrés par jour : rotation différentielle
 * du plasma de la photosphère, mesurée par effet Doppler (Snodgrass et Ulrich 1990),
 * ω = 14,713 − 2,396 sin²φ − 1,787 sin⁴φ. Un tour en 24,5 jours à l'équateur, 34 jours aux pôles.
 */
export function solarRotationRate(latitudeDeg: number): number {
  const s2 = Math.sin((latitudeDeg * Math.PI) / 180) ** 2;
  return 14.713 - 2.396 * s2 - 1.787 * s2 * s2;
}

/**
 * Pôle nord et méridien origine du Soleil (UAI, WGCCRE 2015, Archinal et al. 2018) : α₀ = 286,13°, δ₀ = 63,87°,
 * W = 84,176° + 14,1844° par jour. L'équateur solaire est incliné de 7,25° sur l'écliptique.
 */
export const SUN_ROTATION: RotationModel = { ra: [286.13, 0], dec: [63.87, 0], w: [84.176, 14.1844] };
