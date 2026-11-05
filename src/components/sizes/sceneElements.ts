import { RAIL_ID } from "@/components/journey/ids";
import { shownElements } from "@/components/journey/navigation";
import { isSizeStopKey, type SizeStopKey } from "@/lib/sizes/stops";
import { pageElements } from "@/lib/site/shown";

/** Ce qui borde la scène des tailles dans la page affichée. */
export interface SizesSceneLayout {
  bar: Element | null;
  rail: Element | null;
  /** Introduction de la page (`[data-stop="intro"]`), dont le texte passe devant la scène. */
  intro: HTMLElement | null;
  plates: Map<SizeStopKey, HTMLElement>;
}

/**
 * Ce qui borde la scène des tailles dans la page affichée : barre haute, règle des tailles, introduction, plaque de
 * chaque escale. Next 16 garde dans le DOM des pages quittées, masquées (`display: none`) : le Voyage y a aussi sa
 * barre, sa règle (`#rail`) et ses plaques, parfois sous la même clé (« sun »). On ne lit donc que la page affichée. La
 * règle y est gardée même repliée par la feuille de style (écran bas ou étroit), comme sur le Voyage.
 */
export function shownSceneLayout(): SizesSceneLayout {
  const plates = new Map<SizeStopKey, HTMLElement>();
  for (const plate of shownElements("[data-stop] > .plate")) {
    const key = plate.parentElement?.dataset.stop;
    if (isSizeStopKey(key)) plates.set(key, plate);
  }
  return {
    bar: pageElements(".bar")[0] ?? null,
    rail: pageElements(`#${RAIL_ID}`)[0] ?? null,
    intro: shownElements('[data-stop="intro"]')[0] ?? null,
    plates,
  };
}
