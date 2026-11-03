import { COMPARED_OBJECTS, type SizeObjectKey } from "@/lib/sizes/objects";

/** Escales de la page « Tailles » : l'introduction, puis une par astre comparé (étoile ou trou noir). */
export type SizeStopKey = "intro" | SizeObjectKey;

/**
 * Escales dans l'ordre de la page : l'introduction, puis les astres du plus petit au plus grand, dans l'ordre de
 * COMPARED_OBJECTS (tailles comparées strictement croissantes).
 */
export const SIZE_STOP_ORDER: readonly SizeStopKey[] = ["intro", ...COMPARED_OBJECTS.map((object) => object.key)];

export function isSizeStopKey(value: string | undefined): value is SizeStopKey {
  return value !== undefined && (SIZE_STOP_ORDER as readonly string[]).includes(value);
}

/**
 * Identifiant de section (ancre) de chaque escale, identique dans les trois langues : les liens et le changement de
 * langue gardent le fragment tel quel. ASCII, en kebab-case, à la française (ADR 0003) : « sagittarius-a-etoile ».
 */
export const SIZE_STOP_IDS: Readonly<Record<SizeStopKey, string>> = {
  intro: "tailles",
  "cygnus-x-1": "cygnus-x-1",
  "proxima-centauri": "proxima-du-centaure",
  sun: "soleil",
  "sirius-a": "sirius-a",
  pollux: "pollux",
  arcturus: "arcturus",
  aldebaran: "aldebaran",
  "sagittarius-a-star": "sagittarius-a-etoile",
  rigel: "rigel",
  "antares-a": "antares-a",
  betelgeuse: "betelgeuse",
  "vy-canis-majoris": "vy-canis-majoris",
  "m87-star": "m87-etoile",
  "cosmic-horseshoe": "fer-a-cheval-cosmique",
};

/** Ancre de la section d'une escale : « #betelgeuse », « #tailles » pour l'introduction. */
export function sizeStopAnchor(key: SizeStopKey): `#${string}` {
  return `#${SIZE_STOP_IDS[key]}`;
}

/**
 * Indice de l'astre d'une escale dans COMPARED_OBJECTS (et dans la disposition de placeObjects) : l'introduction montre
 * le plus petit, comme la première escale.
 */
export function sizeObjectIndex(stop: SizeStopKey): number {
  return Math.max(0, SIZE_STOP_ORDER.indexOf(stop) - 1);
}
