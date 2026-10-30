import type { ModuleKind } from "@/components/modules/moduleKind";
import type { Locale } from "@/i18n/locales";
import { PLANET_BY_KEY, SUN, type PlanetKey } from "@/lib/astro/planets";
import { NEARBY_STARS_SOURCE } from "@/lib/astro/stars";

/**
 * Ce qui, dans les escales du Soleil à l'au-delà de Neptune, ne dépend pas de la langue : l'ordre des sections, la
 * couleur, le rang et le module de chaque astre, les repères de l'échelle en heures-lumière. Les fichiers de langue
 * (`fr.ts`, `en.ts`, `es.ts`) n'y ajoutent que du texte ; les ancres viennent de `STOP_IDS`, les noms des astres de
 * `bodyName`.
 */

/** Astres qui ont leur plaque : le Soleil et les huit planètes. */
export type BodyStopKey = "sun" | PlanetKey;

/** Escale d'un astre : plaque de lecture, fiche avec la ligne « ce jour », module explicatif. */
export interface BodyStopStructure {
  kind: "body";
  key: BodyStopKey;
  /** Couleur de l'astre (filet de la plaque, puce du rang) : celle des données des astres. */
  color: string;
  /** Rang depuis le Soleil, planètes seulement : 1 pour Mercure, 8 pour Neptune. */
  ordinal?: number;
  module: ModuleKind;
}

/** Interlude sans plaque : une citation sur fond de scène. */
export interface InterludeStructure {
  kind: "interlude";
  key: "belt";
}

export type SolarStopStructure = BodyStopStructure | InterludeStructure;

/**
 * Escales du Soleil à Neptune, dans l'ordre de la page (celui de `STOP_ORDER`, entre l'accueil et l'au-delà) : la
 * ceinture d'astéroïdes passe entre Mars et Jupiter.
 */
export const SOLAR_STOP_STRUCTURE: readonly SolarStopStructure[] = [
  { kind: "body", key: "sun", color: SUN.color, module: "light-race" },
  { kind: "body", key: "mercury", color: PLANET_BY_KEY.mercury.color, ordinal: 1, module: "kepler" },
  { kind: "body", key: "venus", color: PLANET_BY_KEY.venus.color, ordinal: 2, module: "venus-race" },
  { kind: "body", key: "earth", color: PLANET_BY_KEY.earth.color, ordinal: 3, module: "seasons-earth" },
  { kind: "body", key: "mars", color: PLANET_BY_KEY.mars.color, ordinal: 4, module: "weight" },
  { kind: "interlude", key: "belt" },
  { kind: "body", key: "jupiter", color: PLANET_BY_KEY.jupiter.color, ordinal: 5, module: "sizes" },
  { kind: "body", key: "saturn", color: PLANET_BY_KEY.saturn.color, ordinal: 6, module: "saturn-rings" },
  { kind: "body", key: "uranus", color: PLANET_BY_KEY.uranus.color, ordinal: 7, module: "seasons-uranus" },
  { kind: "body", key: "neptune", color: PLANET_BY_KEY.neptune.color, ordinal: 8, module: "neptune-year" },
];

/** Repères de l'échelle de l'au-delà : Neptune, Pluton, la ceinture de Kuiper et les deux sondes Voyager. */
export type BeyondMarkKey = "neptune" | "pluto" | "kuiper" | "voyager2" | "voyager1";

/**
 * Repères de l'échelle de l'au-delà, du plus proche au plus lointain : distance au Soleil en heures-lumière (position
 * sur l'échelle de 24 heures) et couleur du trait. L'ordre est aussi celui de la lecture à voix haute.
 */
export const BEYOND_MARKS: readonly { key: BeyondMarkKey; hours: number; color: string }[] = [
  { key: "neptune", hours: 4.17, color: PLANET_BY_KEY.neptune.color },
  { key: "pluto", hours: 5.47, color: "#B5ADA3" },
  { key: "kuiper", hours: 6.93, color: "#C2A36B" },
  { key: "voyager2", hours: 19.9, color: "#959EB5" },
  { key: "voyager1", hours: 24, color: "#FFB547" },
];

/**
 * Références des étoiles voisines citées en pied de page : la liste de `NEARBY_STARS_SOURCE`, écrite à la française
 * (« ; » précédé d'une espace), avec la ponctuation de la langue (en anglais et en espagnol, rien avant « ; »).
 */
export function nearbyStarsSource(locale: Locale): string {
  return locale === "fr" ? NEARBY_STARS_SOURCE : NEARBY_STARS_SOURCE.replaceAll(" ; ", "; ");
}
