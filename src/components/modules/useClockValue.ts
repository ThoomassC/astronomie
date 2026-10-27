import { useSyncExternalStore } from "react";
import { getClock, type ClockSnapshot } from "@/lib/sim/clock";

const subscribe = (listener: () => void) => getClock().subscribe(listener);

/**
 * Valeur tirée de l'horloge du site. React ne re-rend le module que lorsqu'elle change :
 * `select` renvoie une valeur primitive (comparée avec Object.is), pas un objet neuf.
 * `serverValue` sert au rendu serveur et à l'hydratation, où la date simulée est inconnue.
 */
export function useClockValue<T extends string | number | boolean | null>(
  select: (snapshot: ClockSnapshot) => T,
  serverValue: T,
): T {
  return useSyncExternalStore(subscribe, () => select(getClock().snapshot()), () => serverValue);
}
