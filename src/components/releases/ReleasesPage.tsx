import { MAIN_ID } from "@/components/journey/ids";
import { ContactFooter } from "@/components/site/ContactFooter";
import { getReleasesContent } from "@/content/releases/content";
import { formatReleaseDate, releaseAnchor, releaseDate } from "@/content/releases/structure";
import type { ReleaseNotes } from "@/content/releases/types";
import type { Locale } from "@/i18n/locales";
import styles from "./ReleasesPage.module.css";

/** Identifiant du sommaire des versions, qui nomme son repère de navigation. */
const TOC_TITLE_ID = "versions-titre";

/** Identifiant du titre qui nomme une version : « v1-1-0-titre », comme les sections d'À propos. */
function headingId(anchor: string): string {
  return `${anchor}-titre`;
}

interface ReleaseProps {
  release: ReleaseNotes;
  locale: Locale;
  /** Mot qui précède le numéro : « Version ». */
  label: string;
  /** Étiquette de la version la plus récente, absente des autres. */
  latest?: string;
}

/**
 * Une version : son en-tête (numéro, date, étiquette de la plus récente), puis son résumé et ses rubriques. L'en-tête
 * forme la colonne de gauche sur grand écran, collée sous la barre pendant la lecture de la version
 * (ReleasesPage.module.css) ; sur téléphone, il ouvre la version. L'ordre du DOM reste l'ordre de lecture.
 * Le titre se lit « Version 1.1.0 » : l'espace entre le mot et le numéro reste dans le texte, même posés l'un sous
 * l'autre.
 */
function Release({ release, locale, label, latest }: ReleaseProps) {
  const { version, summary, sections } = release;
  const anchor = releaseAnchor(version);
  const date = releaseDate(version);
  return (
    <section className={styles.release} id={anchor} aria-labelledby={headingId(anchor)}>
      <div className={styles.meta}>
        <h2 id={headingId(anchor)} className={styles.version}>
          <span className={styles.versionLabel}>{label}</span>{" "}
          <span className={styles.versionNumber}>{version}</span>
        </h2>
        <p className={styles.date}>
          <time dateTime={date}>{formatReleaseDate(date, locale)}</time>
        </p>
        {latest ? <p className={styles.latest}>{latest}</p> : null}
      </div>
      <div className={styles.body}>
        <p className={styles.summary}>{summary}</p>
        {sections.map(({ heading, items }) => (
          <div key={heading} className={styles.group}>
            <h3>{heading}</h3>
            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * La page Notes de version : le titre, l'accroche et le sommaire des versions, puis chaque version, de la plus récente
 * à la plus ancienne. Composant serveur, sans aucun script : la page se lit entière sans JavaScript, et le sommaire
 * mène aux versions par leurs ancres (`#v1-1-0`), que le `scroll-padding` global pose sous la barre.
 */
export function ReleasesPage({ locale }: { locale: Locale }) {
  const { title, intro, toc, version, latest, releases } = getReleasesContent(locale);
  return (
    <main id={MAIN_ID} tabIndex={-1} className={styles.page}>
      {/* Un div, pas un <header> : dans <main>, il ne nommerait rien, et certains outils y voient une bannière. */}
      <div className={styles.head}>
        <h1>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        <nav className={styles.toc} aria-labelledby={TOC_TITLE_ID}>
          <p id={TOC_TITLE_ID} className={styles.tocTitle}>
            {toc}
          </p>
          {/* `role="list"` : Safari retire le rôle de liste aux listes sans puces. */}
          <ul role="list" className={styles.tocList}>
            {releases.map((release) => {
              const date = releaseDate(release.version);
              return (
                <li key={release.version}>
                  <a href={`#${releaseAnchor(release.version)}`}>{`${version} ${release.version}`}</a>
                  <time dateTime={date}>{formatReleaseDate(date, locale)}</time>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      {releases.map((release, index) => (
        <Release
          key={release.version}
          release={release}
          locale={locale}
          label={version}
          latest={index === 0 ? latest : undefined}
        />
      ))}
    </main>
  );
}

/** Pied de la page : le pied de page commun (signature, contacts de l'auteur), entre les marges de la page. */
export function ReleasesFooter({ locale }: { locale: Locale }) {
  return (
    <footer className={styles.footer}>
      <ContactFooter locale={locale} />
    </footer>
  );
}
