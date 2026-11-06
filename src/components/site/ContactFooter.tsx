import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import { AUTHOR, COPYRIGHT_YEAR } from "./author";
import styles from "./ContactFooter.module.css";
import { SITE_STRINGS } from "./site.strings";

/** Pictogramme de 18 px en laiton, décoratif : le libellé visible dit où mène le lien. */
function Icon({ viewBox, children }: { viewBox: string; children: ReactNode }) {
  return (
    <svg className={styles.icon} width="18" height="18" viewBox={viewBox} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** Marque de GitHub (Octicons, licence MIT), pleine. */
function GitHubIcon() {
  return (
    <Icon viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </Icon>
  );
}

/** « in » de LinkedIn, évidé dans un carré aux coins arrondis. */
function LinkedInIcon() {
  return (
    <Icon viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 1h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zm.25 5.25h2v6.25h-2zm1-3.15a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 1 0 0-2.3zm2.5 3.15h1.9v.86c.28-.5.95-1.01 1.95-1.01 2.06 0 2.4 1.33 2.4 3.06v3.34h-2V9.55c0-.72-.01-1.64-1-1.64s-1.25.78-1.25 1.59v3h-2z"
      />
    </Icon>
  );
}

/** Enveloppe, tracée comme les pictogrammes de la barre (traits de 1,4 px). */
function MailIcon() {
  return (
    <Icon viewBox="0 0 20 20">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
        <path d="m3.5 6 6.5 5 6.5-5" />
      </g>
    </Icon>
  );
}

interface ContactLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  /**
   * Précision lue d'un lien vers un autre site (« site externe ») ; la flèche la dit à l'œil. Sans objet pour
   * l'e-mail.
   */
  external?: string;
}

/**
 * Lien du pied de page : pictogramme, puis libellé visible, qui ouvre le nom accessible (critère 2.5.3). Vers un autre
 * site, la flèche et la précision masquée suivent, comme sur À propos ; tout s'ouvre dans le même onglet.
 */
function ContactLink({ href, icon, label, external }: ContactLinkProps) {
  return (
    <a className={styles.link} href={href}>
      {icon}
      <span className={styles.label}>
        {label}
        {external === undefined ? null : (
          <>
            <span className="sr">, {external}</span>
            {/* Espace insécable : la flèche ne passe jamais seule à la ligne. */}
            <span aria-hidden="true">{"\u00a0↗"}</span>
          </>
        )}
      </span>
    </a>
  );
}

/**
 * Pied de page commun aux cinq pages, posé dans leur `footer` (au voyage, après les sources et le crédit des
 * cartes) : la signature du site, les adresses publiques de l'auteur (GitHub, LinkedIn, e-mail en clair) et la
 * mention de droit d'auteur. Composant serveur, sans script. `address` : ce sont les coordonnées de l'auteur.
 */
export function ContactFooter({ locale }: { locale: Locale }) {
  const t = SITE_STRINGS[locale];
  return (
    <div className={styles.contact}>
      <p>{t.signature}</p>
      <address className={styles.address}>
        <ul role="list" className={styles.links}>
          <li>
            <ContactLink href={AUTHOR.github} icon={<GitHubIcon />} label="GitHub" external={t.externalSite} />
          </li>
          <li>
            <ContactLink href={AUTHOR.linkedin} icon={<LinkedInIcon />} label="LinkedIn" external={t.externalSite} />
          </li>
          <li>
            <ContactLink href={`mailto:${AUTHOR.email}`} icon={<MailIcon />} label={AUTHOR.email} />
          </li>
        </ul>
      </address>
      <p className={styles.copyright}>
        © {COPYRIGHT_YEAR} {AUTHOR.name}
      </p>
    </div>
  );
}
