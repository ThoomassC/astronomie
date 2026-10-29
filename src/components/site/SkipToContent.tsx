import { MAIN_ID } from "@/components/journey/ids";
import type { Locale } from "@/i18n/locales";
import { SITE_STRINGS } from "./site.strings";

/** Lien d'évitement vers le contenu de la page (`main#contenu`), visible au focus (`.skip` de globals.css). */
export function SkipToContent({ locale }: { locale: Locale }) {
  return (
    <a className="skip" href={`#${MAIN_ID}`}>
      {SITE_STRINGS[locale].skipToContent}
    </a>
  );
}
