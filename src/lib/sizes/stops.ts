import type { SizeStarKey } from "@/lib/astro/starSizes";

/** Escales de la page « Tailles » : l'introduction, puis une par étoile comparée. */
export type SizeStopKey = "intro" | SizeStarKey;

/**
 * Escales dans l'ordre de la page : l'introduction, puis les étoiles de la plus petite à la plus grande,
 * dans l'ordre de COMPARED_STARS (rayons strictement croissants).
 */
export const SIZE_STOP_ORDER: readonly SizeStopKey[] = [
  "intro", "proxima-centauri", "sun", "sirius-a", "pollux", "arcturus", "aldebaran", "rigel", "antares-a", "betelgeuse",
  "vy-canis-majoris",
];

export function isSizeStopKey(value: string | undefined): value is SizeStopKey {
  return value !== undefined && (SIZE_STOP_ORDER as readonly string[]).includes(value);
}

/**
 * Identifiant de section (ancre) de chaque escale, identique dans les trois langues : les liens et le
 * changement de langue gardent le fragment tel quel.
 */
export const SIZE_STOP_IDS: Readonly<Record<SizeStopKey, string>> = {
  intro: "tailles",
  "proxima-centauri": "proxima-du-centaure",
  sun: "soleil",
  "sirius-a": "sirius-a",
  pollux: "pollux",
  arcturus: "arcturus",
  aldebaran: "aldebaran",
  rigel: "rigel",
  "antares-a": "antares-a",
  betelgeuse: "betelgeuse",
  "vy-canis-majoris": "vy-canis-majoris",
};
