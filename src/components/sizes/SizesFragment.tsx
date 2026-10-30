"use client";

import { useFragmentSource } from "@/lib/site/fragment";
import { sizesStore } from "@/lib/sizes/store";
import { sizeStopAnchor } from "@/lib/sizes/stops";

/**
 * Donne au menu des langues l'ancre de l'étoile affichée (« #betelgeuse »), lue au moment du clic : changer de langue
 * ramène à la même étoile. Aucun rendu.
 */
export function SizesFragment(): null {
  useFragmentSource(() => sizeStopAnchor(sizesStore.get().current));
  return null;
}
