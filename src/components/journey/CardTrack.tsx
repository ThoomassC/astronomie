"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { FIXED_CARD_QUERY, showsCard, showsSkeleton } from "@/lib/journey/card";
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
 * les escales qui en ont une, savent laquelle est courante ; le squelette du passage suit leurs plaques.
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
  return (
    <CardTrackContext value={value}>
      {children}
      <PlateSkeleton />
    </CardTrackContext>
  );
}

/**
 * Squelette de la carte fixe, pendant le passage d'une escale à l'autre (`data-shown`) : de la taille de la carte
 * repliée, à sa place, une barre pour le rang, une pour le nom, deux cercles éteints pour les flèches, et un balayage
 * lumineux discret (immobile en mouvement réduit). Décoratif : sans texte, masqué aux lecteurs d'écran, rien
 * d'annoncé ; le nom de l'escale reste dans la barre. Ailleurs qu'en carte fixe, la feuille de style ne le montre pas.
 * Rendu après le contenu suivi (`main`), hors de lui, et effacé comme lui pendant l'exploration.
 */
function PlateSkeleton() {
  const track = useContext(CardTrackContext);
  const shown = useSyncExternalStore(
    track ? track.store.subscribeFlight : noSubscription,
    () => track !== null && showsSkeleton(track.store.get(), track.hasCard),
    serverSnapshot,
  );
  return (
    <div className="plate-skeleton" aria-hidden="true" data-shown={shown || undefined} data-hide-on-explore="">
      <span className="skeleton-rank" />
      <span className="skeleton-title">
        <span className="skeleton-step" />
        <span className="skeleton-name" />
        <span className="skeleton-step" />
      </span>
    </div>
  );
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

/** Suit la requête de la carte fixe ; sans `matchMedia` (rendu serveur, tests), rien à suivre. */
function subscribeFixedCard(listener: () => void): () => void {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia(FIXED_CARD_QUERY);
  if (typeof query.addEventListener !== "function") return () => {};
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const fixedCardSnapshot = () => typeof matchMedia === "function" && matchMedia(FIXED_CARD_QUERY).matches;

/**
 * La mise en page est celle de la carte fixe (FIXED_CARD_QUERY : téléphone ou tablette en portrait, assez haut, avec
 * JavaScript). Faux au rendu serveur : le nom y reste un simple titre, comme sans JavaScript.
 */
export function useFixedCard(): boolean {
  return useSyncExternalStore(subscribeFixedCard, fixedCardSnapshot, serverSnapshot);
}
