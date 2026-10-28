"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SCALE_TOGGLE } from "@/content/site";
import { DOCK_SCALE_TOGGLE_ID } from "./ids";
import { dismissScaleNote, useScaleNoteVisible } from "./realScale";

/**
 * Note d'échelle, visible tant que les distances réelles sont actives. La région `status`
 * reste dans le DOM (boîte transparente au repos) et c'est son texte qui apparaît, pour
 * une annonce fiable ; les boutons sont hors de la région. Sur téléphone, elle tient sur
 * une ligne : un bouton l'affiche en entier, le texte reste complet pour les lecteurs d'écran.
 */
export function ScaleNote() {
  const visible = useScaleNoteVisible();
  const noteRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const textId = useId();

  // Chaque apparition repart repliée, même si la note a été dépliée la fois précédente.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (!visible) setExpanded(false);
  }

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
      data-visible={visible}
      data-open={expanded || undefined}
      // Toucher le texte le déplie aussi ; le chevron reste la commande accessible.
      onClick={(event) => {
        if (visible && !(event.target as Element).closest("button")) setExpanded((value) => !value);
      }}
    >
      <p role="status" id={textId}>
        {visible ? SCALE_TOGGLE.note : null}
      </p>
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
    </div>
  );
}
