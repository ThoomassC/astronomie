import { useSyncExternalStore } from "react";
import { getClock, type ClockSnapshot } from "@/lib/sim/clock";

const subscribeClock = (listener: () => void) => getClock().subscribe(listener);

/**
 * Valeur simple tirée de l'horloge : le composant ne se re-rend que lorsqu'elle change,
 * pas à chaque jour simulé. `serverValue` sert au rendu serveur et à l'hydratation.
 */
export function useClockValue<T extends string | number | boolean | null>(
  select: (snapshot: ClockSnapshot) => T,
  serverValue: T,
): T {
  return useSyncExternalStore(
    subscribeClock,
    () => select(getClock().snapshot()),
    () => serverValue,
  );
}
