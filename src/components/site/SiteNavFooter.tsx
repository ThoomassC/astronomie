import type { Locale } from "@/i18n/locales";
import type { PageKey } from "@/i18n/routes";
import { SITE_MAP_ID } from "./ids";
import { LanguageLinks } from "./LanguageLinks";
import { SITE_STRINGS } from "./site.strings";
import styles from "./SiteNavFooter.module.css";
import { SiteTabs } from "./SiteTabs";

/** Titres des deux groupes : identifiants fixes, le plan du site n'apparaît qu'une fois par page. */
const TABS_TITLE_ID = `${SITE_MAP_ID}-rubriques`;
const LANGUAGES_TITLE_ID = `${SITE_MAP_ID}-langues`;

/**
 * Plan du site, à poser en pied de page de chaque page : les quatre rubriques et les trois langues, rendus par le
 * serveur. Sans JavaScript, c'est la navigation des fenêtres de 860 px et moins, où le lien « Menu » de la barre y
 * mène (`#plan-du-site`). Avec JavaScript, ses liens de langue retiennent le choix et gardent la position, comme ceux
 * de la barre.
 */
export function SiteNavFooter({ locale, page }: { locale: Locale; page: PageKey }) {
  const t = SITE_STRINGS[locale];
  return (
    <nav id={SITE_MAP_ID} className={styles.siteMap} aria-label={t.siteMap}>
      <div className={styles.group}>
        <p id={TABS_TITLE_ID} className={styles.title}>
          {t.tabsLabel}
        </p>
        <SiteTabs className={styles.links} aria-labelledby={TABS_TITLE_ID} locale={locale} page={page} />
      </div>
      <div className={styles.group}>
        <p id={LANGUAGES_TITLE_ID} className={styles.title}>
          {t.language}
        </p>
        <LanguageLinks className={styles.links} aria-labelledby={LANGUAGES_TITLE_ID} locale={locale} page={page} />
      </div>
    </nav>
  );
}
