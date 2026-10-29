"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SCALE_TOGGLE } from "@/content/site";
import { isCosmicStop } from "@/lib/journey/camera";
import { journeyStore } from "@/lib/journey/store";
import { DOCK_SCALE_TOGGLE_ID } from "./ids";
import { dismissScaleNote, useScaleNote } from "./realScale";

/** L'annonce est ensuite retirée, pour ne pas doubler la note visible en lecture linéaire (comme `useAnnouncer`). */
const ANNOUNCE_CLEAR_MS = 7000;

/**
 * Note d'échelle, visible tant que les distances réelles sont actives. Son texte est une ligne de lecture
 * ordinaire ; une région `status` masquée, présente dès le rendu, l'annonce quand la personne active les distances
 * réelles, puis se vide. La note qui revient d'elle-même d'une escale cosmique ne s'annonce donc pas de nouveau.
 * Les boutons sont hors de la région. Sur téléphone, elle tient sur une ligne : un bouton l'affiche en entier, le
 * texte reste complet pour les lecteurs d'écran. Tue aux escales cosmiques, elle se dit suspendue
 * (`data-suspended`) : le cadrage de la scène lui garde sa place.
 */
export function ScaleNote() {
  const { visible, suspended } = useScaleNote();
  const noteRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState({ visible, suspended });
  const [announced, setAnnounced] = useState(false);
  const textId = useId();

  /*
   * Chaque apparition repart repliée, même si la note a été dépliée la fois précédente. Seule celle que la personne
   * a demandée s'annonce : pas un retour depuis une escale cosmique, où la note était seulement suspendue.
   */
  if (visible !== shown.visible || suspended !== shown.suspended) {
    setShown({ visible, suspended });
    if (!visible) setExpanded(false);
    setAnnounced(visible && !shown.visible && !shown.suspended);
  }

  useEffect(() => {
    if (!announced) return;
    const timer = window.setTimeout(() => setAnnounced(false), ANNOUNCE_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [announced]);

  /*
   * Aux escales cosmiques, la note se tait d'elle-même : si le focus y est, il rejoint la bascule du dock, comme
   * avec hide(). L'abonné du voyage est prévenu avant que React ne retire les boutons de la note.
   */
  useEffect(() => {
    if (!visible) return;
    const unsubscribe = journeyStore.subscribe(() => {
      if (isCosmicStop(journeyStore.get().current) && noteRef.current?.contains(document.activeElement)) {
        document.getElementById(DOCK_SCALE_TOGGLE_ID)?.focus();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [visible]);

  /**
   * Le bouton disparaît avec la note : le focus rejoint la bascule du dock. Toujours quand on ferme
   * par le bouton (au toucher, Safari et VoiceOver ne lui donnent pas toujours le focus), et pour
   * Échap seulement si le focus était dans la note.
   */
  const hide = useCallback((fromButton: boolean) => {
    const focusInside = noteRef.current?.contains(document.activeElement) ?? false;
    setExpanded(false);
    dismissScaleNote();
    if (fromButton || focusInside) document.getElementById(DOCK_SCALE_TOGGLE_ID)?.focus();
  }, []);

  // Échap la masque où que soit le focus (sur téléphone, elle couvre le haut de l'écran),
  // sauf s'il a déjà fermé autre chose, comme une infobulle de la règle : une couche par appui.
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) hide(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, hide]);

  // Hauteur publiée sur la page : le focus et les plaques qu'on déplie passent sous la note (globals.css).
  useEffect(() => {
    const note = noteRef.current;
    if (!note) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--note-h", `${note.offsetHeight}px`));
    observer.observe(note);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--note-h");
    };
  }, []);

  return (
    <div
      ref={noteRef}
      className="scale-note"
      data-hide-on-explore
      data-visible={visible}
      data-suspended={suspended || undefined}
      data-open={expanded || undefined}
      // Toucher le texte le déplie aussi ; le chevron reste la commande accessible.
      onClick={(event) => {
        if (visible && !(event.target as Element).closest("button")) setExpanded((value) => !value);
      }}
    >
      <p id={textId}>{visible ? SCALE_TOGGLE.note : null}</p>
      {visible ? (
        <>
          <button
            type="button"
            className="note-more"
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded((value) => !value)}
          >
            <span className="sr">Lire toute la note</span>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.5 4.5 6 8l3.5-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="note-hide" onClick={() => hide(true)}>
            <span className="note-hide-label">Masquer la note</span>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="m3 3 6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </>
      ) : null}
      <div className="sr" role="status">
        {announced ? SCALE_TOGGLE.note : null}
      </div>
    </div>
  );
}
