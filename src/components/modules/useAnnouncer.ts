import { useEffect, useRef, useState } from "react";

/** Calme exigé avant d'annoncer, en ms : une série de gestes ne produit qu'une annonce. */
const CALM_MS = 450;
/** Le message est ensuite retiré, pour ne pas doubler la ligne visible en lecture linéaire. */
const CLEAR_AFTER_MS = 7000;

export interface StatusMessageState {
  /** Change à chaque annonce : un même texte est annoncé de nouveau. */
  id: number;
  text: string;
}

/** Texte à annoncer, ou fonction qui le calcule au moment de l'annonce (après le calme). */
export type Announcement = string | (() => string);

interface Timers {
  calm: number | undefined;
  clear: number | undefined;
}

/**
 * Annonces aux lecteurs d'écran par une région `role="status"` masquée (voir `StatusMessage`).
 * Réservé aux événements ponctuels déclenchés par la personne : ce qui change seul (horloge,
 * animation) reste dans la ligne de lecture visible, en `aria-live="off"`.
 */
export function useAnnouncer(): { message: StatusMessageState; announce: (next: Announcement) => void } {
  const [message, setMessage] = useState<StatusMessageState>({ id: 0, text: "" });
  const timers = useRef<Timers>({ calm: undefined, clear: undefined });

  useEffect(() => {
    const pending = timers.current;
    return () => {
      window.clearTimeout(pending.calm);
      window.clearTimeout(pending.clear);
    };
  }, []);

  const announce = (next: Announcement) => {
    const pending = timers.current;
    window.clearTimeout(pending.calm);
    pending.calm = window.setTimeout(() => {
      const text = typeof next === "function" ? next() : next;
      setMessage((current) => ({ id: current.id + 1, text }));
      window.clearTimeout(pending.clear);
      pending.clear = window.setTimeout(
        () => setMessage((current) => ({ id: current.id, text: "" })),
        CLEAR_AFTER_MS,
      );
    }, CALM_MS);
  };

  return { message, announce };
}
