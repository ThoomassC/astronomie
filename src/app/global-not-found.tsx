import type { Metadata, Viewport } from "next";
import { SITE_NAME } from "@/components/site/site.strings";
import { getCommonContent } from "@/content/common/content";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";
import { SITE_VIEWPORT } from "@/lib/site/viewport";
import styles from "./global-not-found.module.css";
import "./globals.css";

/** Versions de la page : la langue du document d'abord, puis les autres dans l'ordre des menus. */
const VERSIONS = [DEFAULT_LOCALE, ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)];

export const metadata: Metadata = {
  title: `${getCommonContent(DEFAULT_LOCALE).notFound.title} · ${SITE_NAME}`,
};

export const viewport: Viewport = SITE_VIEWPORT;

/**
 * Page introuvable, pour toute adresse qu'aucune route ne sert (« /fr/inexistant », ou « /de/voyage » une fois
 * préfixé par le proxy). Next la sert sans le layout `[lang]` : document complet, styles globaux, polices de repli du
 * système (page légère, sans next/font). La langue voulue est inconnue ici : la page est en français, langue par
 * défaut, et donne aussi les autres versions, chacune déclarant sa langue et menant à l'accueil dans cette langue.
 */
export default function GlobalNotFound() {
  return (
    <html lang={DEFAULT_LOCALE} data-scroll-behavior="smooth">
      <body>
        <main className={styles.page}>
          <p className={styles.code}>404</p>
          {VERSIONS.map((locale) => {
            const { title, text, back } = getCommonContent(locale).notFound;
            const titleId = `introuvable-${locale}`;
            const Heading = locale === DEFAULT_LOCALE ? "h1" : "h2";
            return (
              <section key={locale} className={styles.version} lang={locale} aria-labelledby={titleId}>
                <Heading className={styles.title} id={titleId}>
                  {title}
                </Heading>
                <p className={styles.text}>{text}</p>
                {/* Lien simple : l'accueil a un autre layout racine, le navigateur charge la page entière. */}
                <a className="btn ghost" href={pathFor("home", locale)} hrefLang={locale}>
                  {back}
                </a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
