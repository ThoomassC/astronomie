import { getVoyageContent } from "@/content/voyage/content";
import type { Locale } from "@/i18n/locales";

/** Sources des données, avertissement sur l'échelle et crédit des cartes des astres, dans la langue de la page. */
export function SiteFooter({ locale }: { locale: Locale }) {
  const { sources, scale, textures } = getVoyageContent(locale).footer;
  return (
    <footer data-hide-on-explore>
      <p>{sources}</p>
      <p>{scale}</p>
      <p>
        {textures.before}
        <a href={textures.source.href}>{textures.source.label}</a>
        {textures.between}
        <a href={textures.license.href}>{textures.license.label}</a>
        {textures.after}
      </p>
    </footer>
  );
}
