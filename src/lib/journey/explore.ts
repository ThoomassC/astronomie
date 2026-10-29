import { useSyncExternalStore } from "react";
import { isEarthViewTarget } from "@/lib/astro/earthView";
import type { ExploreStop, OrbitInput } from "@/lib/journey/orbit";

export interface ExploreState {
  /** Escale explorée ; null hors du mode. */
  stop: ExploreStop | null;
  /** « Vu depuis la Terre » actif (seulement sur une planète autre que la Terre). */
  fromEarth: boolean;
}

type Listener = () => void;

const OUTSIDE: ExploreState = { stop: null, fromEarth: false };

let state: ExploreState = OUTSIDE;
const listeners = new Set<Listener>();

/** Gestes accumulés depuis la dernière lecture du moteur ; `pending` est faux tant qu'il n'y en a aucun. */
let pending = false;
const input: OrbitInput = { azim: 0, elev: 0, distanceLog: 0, recenter: false };

function publish(next: ExploreState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function clearInput(): void {
  pending = false;
  input.azim = 0;
  input.elev = 0;
  input.distanceLog = 0;
  input.recenter = false;
}

/** Le geste rend la main : la caméra quitte la direction de la Terre. */
function leaveEarthView(): void {
  if (state.fromEarth) publish({ ...state, fromEarth: false });
}

/**
 * Mode « Tourner autour ». Lu à chaque image par le moteur ; React n'est prévenu que si `stop` ou `fromEarth` change.
 * Les gestes s'accumulent hors de l'état et sont consommés une fois par image (`takeInput`), comme le saut de
 * défilement du suivi du voyage. Hors du mode, gestes et réglages sont ignorés.
 */
export const exploreStore = {
  get(): ExploreState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Entre dans le mode ; sans effet (ni notification) si on explore déjà cette escale. */
  enter(stop: ExploreStop): void {
    if (state.stop === stop) return;
    clearInput();
    publish({ stop, fromEarth: false });
  },
  /** Quitte le mode, coupe « vu depuis la Terre », oublie les gestes en attente ; sans effet hors du mode. */
  exit(): void {
    if (state.stop === null) return;
    clearInput();
    publish(OUTSIDE);
  },
  /** Ignoré hors du mode, si l'escale n'est pas une planète autre que la Terre, ou si rien ne change. */
  setFromEarth(on: boolean): void {
    if (state.stop === null || !isEarthViewTarget(state.stop) || state.fromEarth === on) return;
    publish({ ...state, fromEarth: on });
  },
  /** Ajoute une rotation (radians) ; coupe « vu depuis la Terre » (le glisser rend la main). */
  rotate(dAzim: number, dElev: number): void {
    if (state.stop === null || (dAzim === 0 && dElev === 0)) return;
    input.azim += dAzim;
    input.elev += dElev;
    pending = true;
    leaveEarthView();
  },
  /** Ajoute une variation de ln(distance) (positive = recul) ; garde « vu depuis la Terre ». */
  zoom(dDistanceLog: number): void {
    if (state.stop === null || dDistanceLog === 0) return;
    input.distanceLog += dDistanceLog;
    pending = true;
  },
  /** Demande le retour à la vue de départ, efface les gestes en attente, coupe « vu depuis la Terre ». */
  recenter(): void {
    if (state.stop === null) return;
    clearInput();
    input.recenter = true;
    pending = true;
    leaveEarthView();
  },
  /** Des gestes attendent le moteur (lecture sans consommation). */
  hasInput(): boolean {
    return pending;
  },
  /** Gestes accumulés depuis la dernière lecture, remis à zéro ; null s'il n'y en a pas. */
  takeInput(): OrbitInput | null {
    if (!pending) return null;
    const taken = { ...input };
    clearInput();
    return taken;
  },
};

const serverState = (): ExploreState => OUTSIDE;

/** État du mode ; { stop: null, fromEarth: false } au rendu serveur et à l'hydratation. */
export function useExploration(): ExploreState {
  return useSyncExternalStore(exploreStore.subscribe, exploreStore.get, serverState);
}
