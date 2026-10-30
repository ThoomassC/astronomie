"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { INTL_LOCALE } from "@/i18n/locales";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

const subscribeNever = () => () => {};
/** Instant du chargement de la page (origine des temps du navigateur) : stable, sans lire l'heure courante. */
const readLoadTime = () => performance.timeOrigin;
const readServerLoadTime = () => null;

/**
 * « Positions réelles au départ : 27 octobre 2026 » : date du chargement, écrite par Intl dans la langue de la page
 * (« 27 October 2026 », « 27 de octubre de 2026 ») ; « – » avant hydratation. Le préfixe vient du contenu serveur.
 */
export function HeroStamp({ prefix }: { prefix: string }) {
  const locale = useLocale();
  const loadedAt = useSyncExternalStore<number | null>(subscribeNever, readLoadTime, readServerLoadTime);
  const date = loadedAt === null ? "–" : new Date(loadedAt).toLocaleDateString(INTL_LOCALE[locale], DATE_FORMAT);
  return (
    <span>
      {prefix} {date}
    </span>
  );
}
