import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import { pathFor, type PageKey } from "@/i18n/routes";
import { AutoHideBar } from "./AutoHideBar";
import { LanguageMenu } from "./LanguageMenu";
import { SITE_NAME, SITE_STRINGS } from "./site.strings";
import styles from "./SiteHeader.module.css";
import { SiteMenu } from "./SiteMenu";
import { SiteTabs } from "./SiteTabs";

/** Pictogramme du planétaire : deux orbites en laiton, le Soleil, la Terre et Mars (celui de la barre du voyage). */
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="16" rx="14" ry="6.5" fill="none" stroke="#C2A36B" strokeWidth="1.2" transform="rotate(-18 16 16)" />
      <ellipse cx="16" cy="16" rx="8.5" ry="3.8" fill="none" stroke="#C2A36B" strokeWidth="1.2" transform="rotate(-18 16 16)" />
      <circle cx="16" cy="16" r="3.6" fill="#FFB547" />
      <circle cx="28.6" cy="11.6" r="1.9" fill="#5B9BE6" />
      <circle cx="9" cy="19.8" r="1.4" fill="#DA6A43" />
    </svg>
  );
}

interface SiteHeaderProps {
  locale: Locale;
  page: PageKey;
  /** Commandes propres à la page (escale, menu des escales, « Tourner autour »), entre les onglets et la langue. */
  children?: ReactNode;
}

/** Pages à scène, longues, où la barre glisse hors de l'écran quand on descend (AutoHideBar). */
const SLIDING_PAGES: ReadonlySet<PageKey> = new Set(["voyage", "sizes"]);

/**
 * Barre haute commune aux quatre pages, rendue par chaque page : l'onglet courant est connu sans `usePathname`, et
 * chaque page y glisse ses commandes. Dans l'ordre du DOM, qui est l'ordre de tabulation : marque (retour à
 * l'accueil), onglets (plus de 860 px), puis un bloc à droite : commandes de la page, langue (plus de 860 px), menu
 * replié (860 px et moins). Ces trois parties sont les trois colonnes de la grille qui centre les onglets dans la
 * barre (SiteHeader.module.css). `data-page` et `data-controls` (commandes présentes) règlent la mise en page ; la
 * barre s'efface pendant l'exploration du voyage (`data-hide-on-explore`). Au Voyage et à Tailles, elle suit le
 * défilement (AutoHideBar, seule feuille client ici) ; son contenu reste rendu par le serveur.
 */
export function SiteHeader({ locale, page, children }: SiteHeaderProps) {
  const t = SITE_STRINGS[locale];
  const hasControls = children !== undefined && children !== null && children !== false;
  const className = `bar ${styles.header}`;
  const content = (
    <>
      {/* Le nom passe par aria-label : la mise en page masque le texte visible sur les écrans étroits. */}
      <Link className="brand" href={pathFor("home", locale)} aria-label={t.brandHome}>
        <BrandMark />
        <span className="brand-name">{SITE_NAME}</span>
      </Link>
      <nav className={styles.tabs} aria-label={t.tabsLabel}>
        <SiteTabs locale={locale} page={page} />
      </nav>
      <div className={styles.end}>
        {children}
        <LanguageMenu locale={locale} page={page} />
        <SiteMenu locale={locale} page={page} />
      </div>
    </>
  );
  if (SLIDING_PAGES.has(page)) {
    return (
      <AutoHideBar className={className} page={page} controls={hasControls}>
        {content}
      </AutoHideBar>
    );
  }
  return (
    <header className={className} data-hide-on-explore data-page={page} data-controls={hasControls ? "" : undefined}>
      {content}
    </header>
  );
}
