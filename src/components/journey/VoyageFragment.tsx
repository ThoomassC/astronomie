"use client";

import { stopAnchor } from "@/lib/journey/stopIds";
import { journeyStore } from "@/lib/journey/store";
import { useFragmentSource } from "@/lib/site/fragment";

/**
 * Position que garde un changement de langue : l'ancre de l'escale affichée (« #saturne »), lue dans `journeyStore`
 * au moment du clic, jamais gardée (elle change au défilement, sans prévenir React). À Saturne, l'anglais mène ainsi à
 * /en/voyage#saturne. Déclarée tant que le voyage est à l'écran, retirée quand on le quitte. Ne rend rien.
 */
export function VoyageFragment(): null {
  useFragmentSource(() => stopAnchor(journeyStore.get().current));
  return null;
}
