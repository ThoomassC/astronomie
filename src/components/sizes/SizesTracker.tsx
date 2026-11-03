"use client";

import { useScrollTracker } from "@/components/journey/useScrollTracker";
import { sizesStore } from "@/lib/sizes/store";
import { isSizeStopKey } from "@/lib/sizes/stops";

/**
 * Suit le défilement de la page « Tailles » (useScrollTracker du socle) : mesure les escales, lisse la position et
 * publie le vol dans `sizesStore`, avec l'avancement du repos sur la plaque (`--rest`). Remet le parcours à
 * l'introduction quand on quitte la page. Aucun rendu.
 */
export function SizesTracker(): null {
  useScrollTracker(sizesStore, isSizeStopKey);
  return null;
}
