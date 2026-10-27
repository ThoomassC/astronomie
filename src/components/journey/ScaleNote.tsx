"use client";

import type { MouseEvent } from "react";
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

  const hide = (event: MouseEvent<HTMLButtonElement>) => {
    const hadFocus = document.activeElement === event.currentTarget;
    dismissScaleNote();
    // Le bouton disparaît avec la note : le focus clavier rejoint la bascule du dock.
    if (hadFocus) document.getElementById(DOCK_SCALE_TOGGLE_ID)?.focus();
  };

  return (
    <div className="scale-note" data-visible={visible}>
      <p role="status">{visible ? SCALE_TOGGLE.note : null}</p>
      {visible ? (
        <button type="button" onClick={hide}>
          Masquer la note
        </button>
      ) : null}
    </div>
  );
}
