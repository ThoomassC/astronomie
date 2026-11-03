import { RAIL_ID } from "@/components/journey/ids";
import { isStopKey, shownElements } from "@/components/journey/navigation";
import type { StopKey } from "@/lib/journey/camera";
import { pageElements } from "@/lib/site/shown";

/**
 * Ce qui borde la scène du Voyage dans la page affichée : barre haute, règle des distances, note d'échelle, plaque de
 * chaque escale. Next 16 garde dans le DOM des pages quittées, masquées (`display: none`) : Tailles y a aussi sa barre,
 * sa règle (`#rail`) et ses plaques, parfois sous la même clé (« sun »). On ne lit donc que la page affichée. La
 * règle et la note y sont gardées même repliées par la feuille de style (écran bas ou étroit) : la scène en déduit
 * que la zone libre va jusqu'au bord de l'écran, et les retrouve dès qu'elles reparaissent.
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
    bar: pageElements(".bar")[0] ?? null,
    rail: pageElements(`#${RAIL_ID}`)[0] ?? null,
    note: pageElements(".scale-note")[0] ?? null,
    plates,
  };
}
