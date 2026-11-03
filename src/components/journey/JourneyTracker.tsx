"use client";

import { journeyStore } from "@/lib/journey/store";
import { isStopKey } from "./navigation";
import { useScrollTracker } from "./useScrollTracker";

/**
 * Suit le défilement du voyage (useScrollTracker) : mesure les escales, lisse la position à chaque image et publie
 * le vol en cours dans `journeyStore`, avec l'avancement du repos sur la plaque de l'escale (`--rest`). Aucun rendu.
 */
export function JourneyTracker(): null {
  useScrollTracker(journeyStore, isStopKey);
  return null;
}
