"use client";

import { useCallback, useEffect, useRef } from "react";
import { SCALE_TOGGLE } from "@/content/site";
import { DOCK_SCALE_TOGGLE_ID } from "./ids";
import { dismissScaleNote, useScaleNoteVisible } from "./realScale";

/**
 * Note d'échelle, visible tant que les distances réelles sont actives. La région `status`
 * reste dans le DOM (boîte transparente au repos) et c'est son texte qui apparaît, pour
 * une annonce fiable ; le bouton de fermeture est hors de la région.
 */
export function ScaleNote() {
  const visible = useScaleNoteVisible();
  const noteRef = useRef<HTMLDivElement>(null);

  /**
   * Le bouton disparaît avec la note : le focus rejoint la bascule du dock. Toujours quand on ferme
   * par le bouton (au toucher, Safari et VoiceOver ne lui donnent pas toujours le focus), et pour
   * Échap seulement si le focus était dans la note.
   */
  const hide = useCallback((fromButton: boolean) => {
    const focusInside = noteRef.current?.contains(document.activeElement) ?? false;
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
    <div ref={noteRef} className="scale-note" data-visible={visible}>
      <p role="status">{visible ? SCALE_TOGGLE.note : null}</p>
      {visible ? (
        <button type="button" onClick={() => hide(true)}>
          Masquer la note
        </button>
      ) : null}
    </div>
  );
}
