import { SkipToContent } from "@/components/site/SkipToContent";
import { getVoyageContent } from "@/content/voyage/content";
import type { Locale } from "@/i18n/locales";
import { DOCK_ID } from "./ids";

/**
 * Liens d'évitement du voyage, visibles au focus, dans la langue de la page : vers le contenu (celui de toutes les
 * pages, « Aller au contenu ») et vers la machine à remonter le temps.
 */
export function SkipLinks({ locale }: { locale: Locale }) {
  return (
    <div className="skip-links" data-hide-on-explore>
      <SkipToContent locale={locale} />
      <a className="skip" href={`#${DOCK_ID}`}>
        {getVoyageContent(locale).skipToDock}
      </a>
    </div>
  );
}
