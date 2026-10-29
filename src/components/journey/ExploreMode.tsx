"use client";

import { useEffectEvent, useLayoutEffect, useRef } from "react";
import { StatusMessage } from "@/components/modules/StatusMessage";
import { useAnnouncer } from "@/components/modules/useAnnouncer";
import { EXPLORE } from "@/content/explore";
import { exploreStore, useExploration } from "@/lib/journey/explore";
import { orbitKeyCommand, type ExploreStop } from "@/lib/journey/orbit";
import { journeyStore } from "@/lib/journey/store";
import { ExploreControls } from "./ExploreControls";
import { ExploreSurface } from "./ExploreSurface";
import { EXPLORE_BUTTON_ID, EXPLORE_GROUP_ID } from "./ids";
import { holdAt, measureSections } from "./navigation";

/** Marque posée sur <html> pendant l'exploration : la page ne défile plus (globals.css). */
const EXPLORE_ATTRIBUTE = "data-explore";
/** Ce que le mode masque et rend inerte : barre haute, règle, contenu, pied de page, note d'échelle, liens d'évitement. */
const HIDDEN_SELECTOR = "[data-hide-on-explore]";
/** Écart de défilement, en px, à partir duquel on quitte le mode : la page a bougé malgré le blocage. */
const SCROLL_EXIT_PX = 2;

/** Champ de saisie : ses touches lui appartiennent. */
function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"));
}

/**
 * Transmet au store la commande d'une touche, où que soit le focus (flèches, plus et moins, 0, Échap) ; les
 * raccourcis du navigateur (Ctrl, Méta, Alt) et les champs de saisie gardent les leurs. Une commande reconnue est
 * consommée : Échap ne ferme qu'une couche (pas la note d'échelle), les flèches ne font rien d'autre.
 */
function onExploreKey(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || isTextField(event.target)) return;
  const command = orbitKeyCommand(event.key);
  if (command === null) return;
  event.preventDefault();
  if (command.kind === "rotate") exploreStore.rotate(command.azim, command.elev);
  else if (command.kind === "zoom") exploreStore.zoom(command.distanceLog);
  else if (command.kind === "recenter") exploreStore.recenter();
  else exploreStore.exit();
}

/** Le focus était dans la couche d'exploration, retirée depuis : il est perdu, et revient au bouton de la barre. */
function focusWasInLayer(layer: HTMLElement | null): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected || (layer?.contains(active) ?? false);
}

/**
 * Mode « Tourner autour » : couche plein écran au-dessus de la page, sous le dock du temps. À l'entrée, la page se pose
 * au repos de l'escale (holdAt), cesse de défiler (`data-explore` sur <html>) et devient inerte ; le focus rejoint les
 * commandes, nommées d'après l'escale, et l'annonce dit comment tourner. À la sortie (Échap, « Terminer »), tout est
 * rendu, puis le focus revient au bouton « Tourner autour ».
 * Garde-fous : la page défile quand même (ancre, retour arrière, iOS) ou l'escale affichée change ⇒ sortie, et le
 * voyage reprend là où est la page ; la fenêtre change de taille ⇒ la page se repose sur l'escale.
 * La région d'annonce est présente dès le rendu, hors de la couche (jamais inerte).
 */
export function ExploreMode() {
  const { stop, fromEarth } = useExploration();
  const { message, announce } = useAnnouncer();
  const layerRef = useRef<HTMLDivElement>(null);
  const active = stop !== null;

  const announceEntry = useEffectEvent((entered: ExploreStop) => {
    announce(EXPLORE.announce(EXPLORE.targets[entered]));
  });

  // Avant la peinture : la page n'apparaît jamais à la fois figée et encore active, ou l'inverse.
  useLayoutEffect(() => {
    if (stop === null) return;
    const layer = layerRef.current;
    const html = document.documentElement;
    holdAt(stop);
    // Référence du garde-fou : la position atteinte, après le saut éventuel de holdAt.
    let heldY = window.scrollY;
    html.toggleAttribute(EXPLORE_ATTRIBUTE, true);
    const hidden = Array.from(document.querySelectorAll<HTMLElement>(HIDDEN_SELECTOR));
    for (const element of hidden) element.inert = true;
    // Sans défilement : la page ne doit pas bouger, sinon le garde-fou ferait sortir aussitôt.
    document.getElementById(EXPLORE_GROUP_ID)?.focus({ preventScroll: true });
    announceEntry(stop);

    const onScroll = () => {
      if (Math.abs(window.scrollY - heldY) >= SCROLL_EXIT_PX) exploreStore.exit();
    };
    // Rotation du téléphone, fenêtre redimensionnée : les sections changent de hauteur et le défilement bouge avec
    // elles. La page se repose sur l'escale (mesures à jour), et le garde-fou part de cette nouvelle position.
    const onResize = () => {
      measureSections();
      holdAt(stop);
      heldY = window.scrollY;
    };
    const unsubscribe = journeyStore.subscribe(() => {
      if (journeyStore.get().current !== stop) exploreStore.exit();
    });
    document.addEventListener("keydown", onExploreKey, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("keydown", onExploreKey, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      unsubscribe();
      // Dans cet ordre : un élément d'un sous-arbre inerte refuse le focus, qui tomberait en silence sur <body>.
      for (const element of hidden) element.inert = false;
      html.removeAttribute(EXPLORE_ATTRIBUTE);
      if (focusWasInLayer(layer)) document.getElementById(EXPLORE_BUTTON_ID)?.focus({ preventScroll: true });
    };
  }, [stop]);

  return (
    <>
      <div ref={layerRef} className="explore" data-active={active || undefined} inert={!active}>
        {stop === null ? null : (
          <>
            <ExploreSurface />
            <ExploreControls stop={stop} fromEarth={fromEarth} announce={announce} />
          </>
        )}
      </div>
      <StatusMessage message={message} />
    </>
  );
}
