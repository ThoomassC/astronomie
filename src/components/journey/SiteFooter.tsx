import { SiteNavFooter } from "@/components/site/SiteNavFooter";
import { getVoyageContent } from "@/content/voyage/content";
import type { Locale } from "@/i18n/locales";
import styles from "./SiteFooter.module.css";

/**
 * Pied de page du voyage, dans la langue de la page : sources des données, avertissement sur l'échelle et crédit des
 * cartes des astres, puis le plan du site (rubriques et langues), comme au pied des autres pages. Le lien « Menu » de
 * la barre y mène sans JavaScript (`#plan-du-site`).
 */
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
      <div className={styles.siteMap}>
        <SiteNavFooter locale={locale} page="voyage" />
      </div>
    </footer>
  );
}
