import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(listener: () => void): () => void {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

/** Vrai si la personne a demandé à réduire les animations. Faux au rendu serveur. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches, () => false);
}

/** Lecture ponctuelle hors React (boucles d'animation). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia(QUERY).matches;
}
