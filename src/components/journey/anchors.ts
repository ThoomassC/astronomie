import type { StopKey } from "@/lib/journey/camera";
import { stopAnchor } from "@/lib/journey/stopIds";

/**
 * Ancre de l'escale (`#accueil`, `#soleil`… `#au-dela`, `#etoiles-voisines`, `#voie-lactee`) : celle de `stopAnchor`,
 * fixée hors du contenu et identique dans les trois langues. Ne lit plus le contenu des escales : utilisable aussi
 * côté client.
 */
export function anchorOf(key: StopKey): `#${string}` {
  return stopAnchor(key);
}
