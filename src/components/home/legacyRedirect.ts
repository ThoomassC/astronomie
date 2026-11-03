import type { Locale } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";
import { STOP_IDS } from "@/lib/journey/stopIds";

/**
 * Ancres des escales qui quittent l'accueil : toutes celles du voyage sauf « accueil », la vue d'ensemble, que le
 * nouvel accueil remplace. Lue dans STOP_IDS, sans liste recopiée : une escale ajoutée y est redirigée d'office.
 */
const VOYAGE_IDS: readonly string[] = Object.values(STOP_IDS).filter((id) => id !== STOP_IDS.hero);

/**
 * Adresse du voyage pour un ancien lien (« /#saturne », arrivé ici par le proxy) :
 * `/${locale}/voyage${hash}` si hash = « #<id> » avec id ∈ STOP_IDS sauf "accueil" (sensible à la casse) ; sinon null.
 * « #saturne » (en) → « /en/voyage#saturne » ; « #accueil », « #Saturne », « » → null.
 */
export function legacyRedirectTarget(hash: string, locale: Locale): string | null {
  const id = hash.startsWith("#") ? hash.slice(1) : null;
  return id !== null && VOYAGE_IDS.includes(id) ? `${pathFor("voyage", locale)}${hash}` : null;
}

/**
 * Donnée écrite dans le script en littéral JSON, où « < » devient `\u003c` : les ancres (`[a-z-]`) et le chemin
 * (pathFor) n'en contiennent pas, mais aucune évolution ne pourra ainsi fermer la balise qui porte le script.
 */
function scriptLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Script en ligne (sans dépendance, ES5) qui applique legacyRedirectTarget à location.hash et appelle
 * location.replace : le navigateur l'exécute en analysant la page, avant la première peinture et avant
 * l'hydratation, si bien que l'accueil ne s'affiche pas avant de céder la place à l'escale. `replace` ne laisse pas
 * l'accueil dans l'historique (le retour ramène à la page d'avant), et la cible, sous /voyage, ne repasse jamais ici.
 */
export function legacyRedirectScript(locale: Locale): string {
  const ids = scriptLiteral(VOYAGE_IDS);
  const voyage = scriptLiteral(pathFor("voyage", locale));
  return (
    `(function(){var h=location.hash;` +
    `if(h.charAt(0)==="#"&&${ids}.indexOf(h.slice(1))!==-1)location.replace(${voyage}+h)})()`
  );
}
