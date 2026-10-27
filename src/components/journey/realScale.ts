import { useSyncExternalStore } from "react";
import { getClock, type ClockSnapshot } from "@/lib/sim/clock";
import { useClockValue } from "./useClockValue";

/** La note d'échelle reste visible tant que les distances réelles sont actives, sauf si on la masque. */
let noteDismissed = false;
const noteListeners = new Set<() => void>();

function setNoteDismissed(dismissed: boolean): void {
  if (dismissed === noteDismissed) return;
  noteDismissed = dismissed;
  noteListeners.forEach((listener) => listener());
}

/** Passe toute la page en distances réelles ou compressées (scène, boutons, dock). */
export function setRealScale(on: boolean): void {
  // Chaque activation remontre la note, même masquée la fois précédente.
  if (on) setNoteDismissed(false);
  getClock().setRealScale(on);
}

export function toggleRealScale(): void {
  setRealScale(!getClock().snapshot().realScale);
}

export function dismissScaleNote(): void {
  setNoteDismissed(true);
}

const selectRealScale = (snapshot: ClockSnapshot) => snapshot.realScale;

/** Distances réelles demandées ; faux au rendu serveur. Ne re-rend qu'au changement de la valeur. */
export function useRealScale(): boolean {
  return useClockValue(selectRealScale, false);
}

function subscribeNote(listener: () => void): () => void {
  noteListeners.add(listener);
  return () => {
    noteListeners.delete(listener);
  };
}

const readNoteDismissed = () => noteDismissed;
const serverFalse = () => false;

export function useScaleNoteVisible(): boolean {
  const realScale = useRealScale();
  const dismissed = useSyncExternalStore(subscribeNote, readNoteDismissed, serverFalse);
  return realScale && !dismissed;
}
