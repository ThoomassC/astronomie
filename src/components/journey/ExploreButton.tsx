"use client";

import { EXPLORE } from "@/content/explore";
import { exploreStore } from "@/lib/journey/explore";
import { isExploreStop } from "@/lib/journey/orbit";
import { useCurrentStop } from "@/lib/journey/store";
import { EXPLORE_BUTTON_ID } from "./ids";

/** Pictogramme : une orbite dont la flèche fait le tour de l'astre. */
function OrbitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="3" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.96 12.06A8.5 3.6 0 1 1 18.21 9.07" />
        <path d="M16 8.8l2.64.95.26-2.75" />
      </g>
    </svg>
  );
}

/**
 * « Tourner autour », dans la barre haute : entre dans l'exploration de l'escale affichée, qu'il suit comme le nom de
 * l'escale. Le nom accessible commence par le texte visible, complété pour les lecteurs d'écran (« de Saturne »).
 * À la ceinture d'astéroïdes, où l'on ne tourne pas, il garde sa place sans rien proposer : masqué, hors de l'ordre
 * de tabulation et désactivé, la barre ne saute pas.
 */
export function ExploreButton() {
  const current = useCurrentStop();
  const available = isExploreStop(current);
  return (
    <button
      type="button"
      id={EXPLORE_BUTTON_ID}
      className="explore-toggle"
      aria-hidden={available ? undefined : true}
      tabIndex={available ? undefined : -1}
      disabled={!available}
      data-unavailable={available ? undefined : ""}
      onClick={available ? () => exploreStore.enter(current) : undefined}
    >
      <OrbitIcon />
      <span className="label">{EXPLORE.enter}</span>
      {/* L'espace est un nœud du bouton, entre les deux libellés : le calcul du nom accessible rogne chacun d'eux. */}
      {" "}
      <span className="sr">{available ? EXPLORE.targets[current] : null}</span>
    </button>
  );
}
