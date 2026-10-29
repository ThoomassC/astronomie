import type { Locale } from "@/i18n/locales";
import { InlineScript } from "./InlineScript";
import { legacyRedirectScript } from "./legacyRedirect";

/**
 * Anciens liens d'escale (« /#saturne », arrivés sur l'accueil par le proxy) : un script en ligne, **premier élément de
 * la page**, avant la barre. Il s'exécute à l'analyse, avant la peinture et l'hydratation, et remplace l'adresse par
 * l'escale du voyage (« /fr/voyage#saturne ») : l'accueil ne s'affiche pas avant. Sans effet pour tout autre fragment.
 */
export function LegacyHashRedirect({ locale }: { locale: Locale }) {
  return <InlineScript html={legacyRedirectScript(locale)} />;
}
