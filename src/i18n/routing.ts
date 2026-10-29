import { isLocale } from "./locales";
import { preferredLocale, type LocalePreferences } from "./negotiate";

/** Décision du proxy : laisser passer, ou rediriger vers le chemin préfixé par la langue préférée. */
export type RoutingDecision = { kind: "next" } | { kind: "redirect"; location: string; status: 307 };

/**
 * Premier segment ∈ LOCALES → next (défensif : le matcher ne devrait pas laisser passer ces chemins).
 * Sinon → 307 vers `/${preferredLocale(prefs)}${pathname === "/" ? "" : pathname}${search}`.
 * Redirection temporaire : la cible dépend des préférences de la personne, aucun cache ne doit la retenir.
 * La cible commence toujours par la langue (« /fr… ») : un chemin du site, jamais une autre origine (« //… »).
 */
export function routeRequest(url: { pathname: string; search: string }, prefs: LocalePreferences): RoutingDecision {
  const [, first] = url.pathname.split("/");
  if (isLocale(first)) return { kind: "next" };
  const path = url.pathname === "/" ? "" : url.pathname;
  return { kind: "redirect", location: `/${preferredLocale(prefs)}${path}${url.search}`, status: 307 };
}
