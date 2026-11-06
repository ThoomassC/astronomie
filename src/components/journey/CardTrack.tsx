"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { showsCard } from "@/lib/journey/card";
import type { StopStore } from "@/lib/journey/store";

/** Parcours que suit la carte fixe du téléphone : son vol, et les escales qui ont une plaque. */
interface CardTrackValue {
  store: StopStore<string>;
  hasCard(key: string): boolean;
}

const CardTrackContext = createContext<CardTrackValue | null>(null);

const noSubscription = () => () => {};
const serverSnapshot = () => false;

/**
 * Carte fixe du téléphone (lib/journey/card.ts) : les plaques du parcours `store` (Voyage, Tailles), dont `cards` dit
 * les escales qui en ont une, savent laquelle est courante. Aucun rendu propre.
 */
export function CardTrack<K extends string>({
  store,
  cards,
  children,
}: {
  store: StopStore<K>;
  cards: readonly K[];
  children: ReactNode;
}) {
  const value = useMemo<CardTrackValue>(() => {
    const keys: ReadonlySet<string> = new Set(cards);
    return { store, hasCard: (key) => keys.has(key) };
  }, [store, cards]);
  return <CardTrackContext value={value}>{children}</CardTrackContext>;
}

/**
 * La plaque de l'escale `stop` est la carte courante : au repos sur elle, ou au tout bout d'un vol qui la quitte ou y
 * arrive (cardView). Faux hors d'un suivi, sans escale, et au rendu serveur (le parcours y est au repos sur l'accueil
 * ou l'introduction, qui n'ont pas de carte). Ne rend à nouveau la plaque que quand cette réponse change.
 */
export function useIsCurrentCard(stop: string | undefined): boolean {
  const track = useContext(CardTrackContext);
  return useSyncExternalStore(
    track ? track.store.subscribeFlight : noSubscription,
    () => track !== null && stop !== undefined && showsCard(track.store.get(), track.hasCard, stop),
    serverSnapshot,
  );
}
