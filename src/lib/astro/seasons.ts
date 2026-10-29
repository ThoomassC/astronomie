import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { pad2 } from "@/lib/format";

const D2R = Math.PI / 180;
/** Saisons de l'hémisphère nord, depuis l'équinoxe de printemps ; leurs noms vivent avec le module qui les affiche. */
const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

export type Season = (typeof SEASONS)[number];

/**
 * Déclinaison du Soleil vue depuis la planète, en radians : asin(sin ε · sin λ),
 * ε = inclinaison de l'axe, λ = longitude parcourue depuis l'équinoxe de printemps boréal.
 */
export function solarDeclinationRad(tiltDeg: number, longitudeSinceEquinoxDeg: number): number {
  return Math.asin(Math.sin(tiltDeg * D2R) * Math.sin(longitudeSinceEquinoxDeg * D2R));
}

/**
 * Part d'une rotation passée au-dessus de l'horizon (0 à 1) à la latitude donnée.
 * cos H = (sin h0 − sin φ sin δ) / (cos φ cos δ), fraction = H / π,
 * h0 = hauteur de l'horizon en degrés (−0,833 pour la Terre : réfraction et rayon solaire).
 * Jour polaire → 1, nuit polaire → 0.
 */
export function daylightFraction(latitudeDeg: number, declinationRad: number, horizonDeg = 0): number {
  const phi = latitudeDeg * D2R;
  const h0 = horizonDeg * D2R;
  const denominator = Math.cos(phi) * Math.cos(declinationRad);
  if (Math.abs(denominator) < 1e-12) {
    // Au pôle (ou Soleil au zénith du pôle) : la hauteur du Soleil ne varie pas dans la journée.
    const altitude = Math.sign(latitudeDeg) * declinationRad;
    return altitude > h0 ? 1 : 0;
  }
  const cosH = (Math.sin(h0) - Math.sin(phi) * Math.sin(declinationRad)) / denominator;
  if (cosH <= -1) return 1;
  if (cosH >= 1) return 0;
  return Math.acos(cosH) / Math.PI;
}

/** Saison de l'hémisphère nord selon λ (degrés, normalisé modulo 360) : [0,90[ spring, [90,180[ summer, [180,270[ autumn, [270,360[ winter. */
export function northernSeason(longitudeSinceEquinoxDeg: number): Season {
  const lon = ((longitudeSinceEquinoxDeg % 360) + 360) % 360;
  return SEASONS[Math.min(3, Math.floor(lon / 90))];
}

/** Hauteur du Soleil à midi, en degrés : 90 − |φ − δ|. Négative = sous l'horizon. */
export function noonAltitudeDeg(latitudeDeg: number, declinationRad: number): number {
  return 90 - Math.abs(latitudeDeg - declinationRad / D2R);
}

/** Après les minutes de la durée du jour : rien en français (« 16 h 05 »), le symbole en anglais et en espagnol. */
const MINUTES_SUFFIX: Readonly<Record<Locale, string>> = { fr: "", en: " min", es: " min" };

/**
 * Durée du jour terrestre à partir d'une fraction de 24 h (arrondie à la minute), minutes sur deux chiffres :
 * « 16 h 05 » en français, « 16 h 05 min » en anglais et en espagnol. Langue facultative pendant la migration.
 */
export function formatDayLength(fraction: number, locale: Locale = DEFAULT_LOCALE): string {
  const minutes = Math.round(Math.min(1, Math.max(0, fraction)) * 1440);
  return `${Math.floor(minutes / 60)} h ${pad2(minutes % 60)}${MINUTES_SUFFIX[locale]}`;
}
