import { pad2 } from "@/lib/format";

const D2R = Math.PI / 180;
const SEASONS = ["printemps", "été", "automne", "hiver"] as const;

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

/** Saison de l'hémisphère nord selon λ (degrés, normalisé modulo 360) : [0,90[ printemps, [90,180[ été, [180,270[ automne, [270,360[ hiver. */
export function northernSeason(longitudeSinceEquinoxDeg: number): Season {
  const lon = ((longitudeSinceEquinoxDeg % 360) + 360) % 360;
  return SEASONS[Math.min(3, Math.floor(lon / 90))];
}

/** Hauteur du Soleil à midi, en degrés : 90 − |φ − δ|. Négative = sous l'horizon. */
export function noonAltitudeDeg(latitudeDeg: number, declinationRad: number): number {
  return 90 - Math.abs(latitudeDeg - declinationRad / D2R);
}

/** Durée du jour terrestre au format "16 h 05" à partir d'une fraction de 24 h (arrondie à la minute). */
export function formatDayLength(fraction: number): string {
  const minutes = Math.round(Math.min(1, Math.max(0, fraction)) * 1440);
  return `${Math.floor(minutes / 60)} h ${pad2(minutes % 60)}`;
}
