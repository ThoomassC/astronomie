"use client";

import { useId } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/locales";
import { pathFor, type PageKey } from "@/i18n/routes";
import { LanguageLinks } from "./LanguageLinks";
import { SITE_STRINGS } from "./site.strings";
import styles from "./SiteHeader.module.css";
import { useDisclosure } from "./useDisclosure";

/** Sphère armillaire, dans le laiton de l'instrument : le choix de la langue. */
function SphereIcon() {
  return (
    <svg className={styles.icon} width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="10" cy="10" r="7.5" />
        <ellipse cx="10" cy="10" rx="3.2" ry="7.5" />
        <path d="M2.8 7.5h14.4M2.8 12.5h14.4" />
      </g>
    </svg>
  );
}

/** Chevron du bouton, retourné quand la liste est ouverte. */
function Chevron() {
  return (
    <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LanguageMenuProps {
  locale: Locale;
  page: PageKey;
  /** « menu » : bouton de la barre, au-dessus de 860 px ; « list » : les liens seuls, dans le menu replié. */
  variant?: "menu" | "list";
}

/**
 * Choix de la langue. Les liens (`LanguageLinks`) retiennent le choix et gardent la position affichée ; la variante
 * décide seulement de leur présentation.
 */
export function LanguageMenu({ locale, page, variant = "menu" }: LanguageMenuProps) {
  return variant === "menu" ? (
    <LanguageDisclosure locale={locale} page={page} />
  ) : (
    <LanguageGroup locale={locale} page={page} />
  );
}

/**
 * « ◍ FR ⌄ » déplie les trois langues sous le bouton. Le code visible ouvre le nom accessible, que la suite complète
 * pour les lecteurs d'écran (« FR, langue : français ») : la commande vocale « cliquer FR » le trouve. Sans
 * JavaScript, le bouton ne déplierait rien : trois liens directs FR · EN · ES prennent sa place.
 */
function LanguageDisclosure({ locale, page }: { locale: Locale; page: PageKey }) {
  const t = SITE_STRINGS[locale];
  const { open, toggle, rootRef, buttonRef, panelId, onBlur, onChoose } = useDisclosure<HTMLElement>();
  return (
    <nav ref={rootRef} className={styles.langMenu} aria-label={t.language} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.langToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <SphereIcon />
        <span className={styles.code}>{locale.toUpperCase()}</span>
        <span className="sr">, {t.currentLanguage}</span>
        <Chevron />
      </button>
      <LanguageLinks
        id={panelId}
        className={`${styles.panel} ${styles.langPanel}`}
        hidden={!open}
        locale={locale}
        page={page}
        onClick={onChoose}
      />
      {/* Masqués tant que le script tourne ; la feuille de style les montre à la place du bouton sans JavaScript. */}
      <ul className={styles.pills} hidden>
        {LOCALES.map((target) => (
          <li key={target}>
            <a
              href={pathFor(page, target)}
              lang={target}
              hrefLang={target}
              aria-current={target === locale ? "true" : undefined}
            >
              {target.toUpperCase()}
              <span className="sr">, {LOCALE_NAMES[target]}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Les trois liens sous le titre de groupe « Langue », dans le panneau du menu replié. */
function LanguageGroup({ locale, page }: { locale: Locale; page: PageKey }) {
  const titleId = useId();
  return (
    <nav className={styles.group} aria-labelledby={titleId}>
      <p id={titleId} className={styles.groupTitle}>
        {SITE_STRINGS[locale].language}
      </p>
      <LanguageLinks className={styles.lines} locale={locale} page={page} />
    </nav>
  );
}
