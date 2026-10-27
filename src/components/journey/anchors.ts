import { BEYOND } from "@/content/site";
import { STOPS } from "@/content/stops";
import type { StopKey } from "@/lib/journey/camera";
import { HERO_ID } from "./ids";

/**
 * Ancre de l'escale (`#accueil`, `#soleil`… `#au-dela`). Réservé aux composants serveur :
 * le contenu des escales ne part pas dans le JavaScript du navigateur.
 */
export function anchorOf(key: StopKey): `#${string}` {
  if (key === "hero") return `#${HERO_ID}`;
  if (key === "beyond") return `#${BEYOND.id}`;
  const stop = STOPS.find((s) => s.key === key);
  return `#${stop?.id ?? key}`;
}
