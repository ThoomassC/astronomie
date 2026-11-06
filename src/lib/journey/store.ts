import { useSyncExternalStore } from "react";
import { isCosmicStop, type StopKey } from "@/lib/journey/camera";

/** Où en est un parcours : escales de départ et d'arrivée, avancement brut, escale affichée. */
export interface StopFlight<K extends string> {
  from: K;
  to: K;
  t: number;
  current: K;
}

/**
 * Parcours au défilement d'une page (voyage, Tailles). Lu à chaque image par la scène et la règle (sans React) ;
 * React n'est prévenu que lorsque l'escale affichée change. Les méthodes se passent seules, sans `this`.
 */
export interface StopStore<K extends string> {
  /** Escale du haut de la page : état de départ, et escale affichée au rendu serveur. */
  readonly initial: K;
  get(): StopFlight<K>;
  /** current = t < 0,5 ? from : to ; prévient seulement si current change. */
  update(from: K, to: K, t: number): void;
  subscribe(listener: () => void): () => void;
  /**
   * Suit chaque nouvel état du vol, et pas seulement le changement d'escale affichée : la carte fixe du téléphone
   * passe au squelette en vol et revient au repos sans que l'escale affichée change.
   */
  subscribeFlight(listener: () => void): () => void;
  /** Retour à l'état initial au démontage de la page ; prévient si current change. */
  reset(): void;
}

type Listener = () => void;

/** Parcours au repos sur `initial`. */
export function createStopStore<K extends string>(initial: K): StopStore<K> {
  let state: StopFlight<K> = { from: initial, to: initial, t: 0, current: initial };
  const listeners = new Set<Listener>();
  const flightListeners = new Set<Listener>();

  const update = (from: K, to: K, t: number): void => {
    const current = t < 0.5 ? from : to;
    const changed = current !== state.current;
    state = { from, to, t, current };
    if (changed) listeners.forEach((l) => l());
    flightListeners.forEach((l) => l());
  };

  return {
    initial,
    get: () => state,
    update,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeFlight: (listener) => {
      flightListeners.add(listener);
      return () => flightListeners.delete(listener);
    },
    reset: () => update(initial, initial, 0),
  };
}

/** Escale affichée d'un parcours ; `store.initial` au rendu serveur. */
export function useStopStoreCurrent<K extends string>(store: StopStore<K>): K {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get().current,
    () => store.initial,
  );
}

/** Où en est le voyage : escales de départ et d'arrivée, avancement brut, escale affichée. */
export type JourneyState = StopFlight<StopKey>;

/** Le voyage, au repos sur la vue d'ensemble, en haut de la page. */
export const journeyStore: StopStore<StopKey> = createStopStore<StopKey>("hero");

const cosmicSnapshot = () => isCosmicStop(journeyStore.get().current);
const serverCosmicSnapshot = () => false;

/** Escale affichée (en-tête, règle). */
export function useCurrentStop(): StopKey {
  return useStopStoreCurrent(journeyStore);
}

/**
 * L'escale affichée est au-delà du système solaire (étoiles voisines, Voie lactée), où tout est déjà à l'échelle.
 * Le composant ne se re-rend qu'au passage de cette frontière, pas à chaque escale.
 */
export function useIsCosmicStop(): boolean {
  return useSyncExternalStore(journeyStore.subscribe, cosmicSnapshot, serverCosmicSnapshot);
}
