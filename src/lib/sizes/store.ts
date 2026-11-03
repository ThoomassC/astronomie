import { createStopStore, useStopStoreCurrent, type StopStore } from "@/lib/journey/store";
import type { SizeStopKey } from "./stops";

/**
 * Parcours de la page « Tailles », au repos sur l'introduction, en haut de la page : publié par le suivi du
 * défilement, lu à chaque image par la scène et la règle, remis à zéro quand on quitte la page.
 */
export const sizesStore: StopStore<SizeStopKey> = createStopStore<SizeStopKey>("intro");

/** Escale affichée de la page « Tailles » (barre, règle, menu) ; l'introduction au rendu serveur. */
export function useCurrentSizeStop(): SizeStopKey {
  return useStopStoreCurrent(sizesStore);
}
