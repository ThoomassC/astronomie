"use client";

import { useSyncExternalStore } from "react";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

const subscribeNever = () => () => {};
/** Instant du chargement de la page (origine des temps du navigateur) : stable, sans lire l'heure courante. */
const readLoadTime = () => performance.timeOrigin;
const readServerLoadTime = () => null;

/** « Positions réelles au départ : 27 octobre 2026 », date du chargement, « – » avant hydratation. */
export function HeroStamp({ prefix }: { prefix: string }) {
  const loadedAt = useSyncExternalStore<number | null>(subscribeNever, readLoadTime, readServerLoadTime);
  const date = loadedAt === null ? "–" : new Date(loadedAt).toLocaleDateString("fr-FR", DATE_FORMAT);
  return (
    <span>
      {prefix} {date}
    </span>
  );
}
