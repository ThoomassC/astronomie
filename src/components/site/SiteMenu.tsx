"use client";

import { useId } from "react";
import type { Locale } from "@/i18n/locales";
import type { PageKey } from "@/i18n/routes";
import { LanguageMenu } from "./LanguageMenu";
import { SITE_STRINGS } from "./site.strings";
import styles from "./SiteHeader.module.css";
import { SiteTabs } from "./SiteTabs";
import { useDisclosure } from "./useDisclosure";

/** Trois traits en laiton, une croix quand le panneau est ouvert (échange, sans transformation de l'un en l'autre). */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className={styles.icon} width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={open ? "M5 5l10 10M15 5L5 15" : "M3 5h14M3 10h14M3 15h14"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Menu replié des fenêtres de 860 px et moins : « ≡ Menu » déplie les quatre rubriques puis les trois langues, sous
 * la barre, à droite. Un lien choisi referme le panneau et rend le focus au bouton (la page reste la même quand on
 * choisit la rubrique ou la langue déjà affichées). Sans JavaScript, le bouton ne déplierait rien : la feuille de
 * style le retire, et la barre montre à sa place les onglets et les langues.
 */
export function SiteMenu({ locale, page }: { locale: Locale; page: PageKey }) {
  const t = SITE_STRINGS[locale];
  const { open, toggle, rootRef, buttonRef, panelId, onBlur, onChoose } = useDisclosure<HTMLDivElement>();
  const tabsTitleId = useId();
  return (
    <div ref={rootRef} className={styles.siteMenu} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <MenuIcon open={open} />
        <span className={styles.menuLabel}>{t.menu}</span>
      </button>
      <div id={panelId} className={`${styles.panel} ${styles.menuPanel}`} hidden={!open} onClick={onChoose}>
        <nav className={styles.group} aria-labelledby={tabsTitleId}>
          <p id={tabsTitleId} className={styles.groupTitle}>
            {t.tabsLabel}
          </p>
          <SiteTabs className={styles.lines} locale={locale} page={page} />
        </nav>
        <LanguageMenu locale={locale} page={page} variant="list" />
      </div>
    </div>
  );
}
