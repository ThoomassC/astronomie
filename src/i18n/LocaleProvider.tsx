"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./locales";

/** Langue de la page ; DEFAULT_LOCALE sans fournisseur. Non exporté : on le lit par `useLocale`. */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * Donne la langue de la page aux composants client. Posé par le layout racine `[lang]` autour de ses enfants,
 * qui restent des composants serveur : la frontière client ne couvre que ce fournisseur.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }): ReactNode {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/** Langue de la page ; DEFAULT_LOCALE hors fournisseur (tests, 404 globale). */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}
