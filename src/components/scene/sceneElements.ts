import { RAIL_ID } from "@/components/journey/ids";
import { isStopKey, shownElements } from "@/components/journey/navigation";
import type { StopKey } from "@/lib/journey/camera";

/**
 * Ce qui borde la scène du Voyage dans la page affichée : barre haute, règle des distances, note d'échelle, plaque de
 * chaque escale. Next 16 garde dans le DOM des pages quittées, masquées (`display: none`) : Tailles y a aussi sa barre,
 * sa règle (`#rail`) et ses plaques, parfois sous la même clé (« sun »). On ne lit donc que les éléments affichés.
 */
export function shownJourneyLayout(): {
  bar: Element | null;
  rail: HTMLElement | null;
  note: HTMLElement | null;
  plates: Map<StopKey, HTMLElement>;
} {
  const plates = new Map<StopKey, HTMLElement>();
  for (const plate of shownElements("[data-stop] > .plate")) {
    const key = plate.parentElement?.dataset.stop;
    if (isStopKey(key)) plates.set(key, plate);
  }
  return {
    bar: shownElements(".bar")[0] ?? null,
    rail: shownElements(`#${RAIL_ID}`)[0] ?? null,
    note: shownElements(".scale-note")[0] ?? null,
    plates,
  };
}
