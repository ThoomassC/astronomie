import { useSyncExternalStore } from "react";
import type { StopKey } from "@/lib/journey/camera";

/** Où en est le voyage : escales de départ et d'arrivée, avancement brut, escale affichée. */
export interface JourneyState {
  from: StopKey;
  to: StopKey;
  t: number;
  current: StopKey;
}

type Listener = () => void;

let state: JourneyState = { from: "hero", to: "hero", t: 0, current: "hero" };
const listeners = new Set<Listener>();

/**
 * Lu à chaque image par la scène et la règle (sans React) ; React n'est prévenu
 * que lorsque l'escale affichée change.
 */
export const journeyStore = {
  get(): JourneyState {
    return state;
  },
  update(from: StopKey, to: StopKey, t: number): void {
    const current = t < 0.5 ? from : to;
    const changed = current !== state.current;
    state = { from, to, t, current };
    if (changed) listeners.forEach((l) => l());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

const currentSnapshot = () => state.current;
const serverSnapshot = (): StopKey => "hero";

/** Escale affichée (en-tête, règle). */
export function useCurrentStop(): StopKey {
  return useSyncExternalStore(journeyStore.subscribe, currentSnapshot, serverSnapshot);
}
