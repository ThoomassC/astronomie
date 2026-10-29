import { MAIN_ID } from "@/components/journey/ids";
import { LanguageLinks } from "@/components/site/LanguageLinks";
import { SiteNavFooter } from "@/components/site/SiteNavFooter";
import { getAboutContent } from "@/content/about/content";
import { LANGUAGES_SECTION_ID } from "@/content/about/structure";
import type { AboutLink, AboutSection } from "@/content/about/types";
import type { Locale } from "@/i18n/locales";
import styles from "./AboutPage.module.css";

/** Identifiant du titre qui nomme une section : « accessibilite-titre », comme les escales du voyage. */
function headingId(sectionId: string): string {
  return `${sectionId}-titre`;
}

/**
 * Liens vers les sections, dans l'ordre de la page. `role="list"` : Safari retire le rôle de liste aux listes sans
 * puces, et le nombre d'entrées annoncé aide à s'orienter.
 */
function TocLinks({ sections }: { sections: readonly AboutSection[] }) {
  return (
    <ol role="list" className={styles.tocList}>
      {sections.map(({ id, heading }) => (
        <li key={id}>
          <a href={`#${id}`}>{heading}</a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Liste filetée de liens vers d'autres sites : le nom (le lien), puis ce que le site en tire. La flèche dit à l'œil
 * que le lien quitte le site, la précision masquée le dit aux lecteurs d'écran ; tout s'ouvre dans le même onglet.
 */
function OutboundLinks({ links, external }: { links: readonly AboutLink[]; external: string }) {
  return (
    <ul role="list" className={styles.outbound}>
      {links.map(({ label, href, description }) => (
        <li key={label}>
          <a href={href}>
            {label}
            <span className="sr">, {external}</span>
            {/* Espace insécable : la flèche ne passe jamais seule à la ligne. */}
            <span className={styles.arrow} aria-hidden="true">
              {"\u00a0↗"}
            </span>
          </a>
          <p>{description}</p>
        </li>
      ))}
    </ul>
  );
}

/** Une section sous son h2, dans l'ordre du contenu : encart, paragraphes, définitions, liens. */
function AboutPart({ section, locale, external }: { section: AboutSection; locale: Locale; external: string }) {
  const { id, heading, note, paragraphs, entries, links } = section;
  return (
    <section className={styles.part} id={id} tabIndex={-1} aria-labelledby={headingId(id)}>
      <h2 id={headingId(id)}>{heading}</h2>
      {note ? <p className={styles.note}>{note}</p> : null}
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {entries ? (
        <dl className={styles.entries}>
          {entries.map(({ term, text }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {/* Les liens de langue de la barre et du plan du site : même choix retenu (cookie), même position gardée. */}
      {id === LANGUAGES_SECTION_ID ? (
        <LanguageLinks locale={locale} page="about" role="list" className={styles.languages} />
      ) : null}
      {links ? <OutboundLinks links={links} external={external} /> : null}
    </section>
  );
}

/**
 * La page À propos : pourquoi ce site, pour qui, sa démarche, ses sources, ses crédits, son accessibilité, sa
 * confidentialité, ses langues et son code. Composant serveur, sans aucun script : la page se lit entière sans
 * JavaScript, et le sommaire se replie dans un `<details>` natif.
 *
 * Le sommaire est rendu deux fois, et la feuille de style n'en montre qu'un (l'autre est en `display: none`, hors de
 * l'arbre d'accessibilité) : replié en tête sur téléphone et tablette, ouvert et collant à gauche sur grand écran.
 * Un `<details>` fermé ne laisse pas afficher son contenu par CSS partout ; deux rendus évitent le script.
 */
export function AboutPage({ locale }: { locale: Locale }) {
  const { title, intro, toc, external, sections } = getAboutContent(locale);
  return (
    <main id={MAIN_ID} tabIndex={-1} className={styles.page}>
      <nav className={styles.toc} aria-label={toc}>
        <details className={styles.tocFolded}>
          <summary>{toc}</summary>
          <TocLinks sections={sections} />
        </details>
        <div className={styles.tocOpen}>
          {/* Le nom de la navigation le dit déjà aux lecteurs d'écran. */}
          <p className={styles.tocTitle} aria-hidden="true">
            {toc}
          </p>
          <TocLinks sections={sections} />
        </div>
      </nav>
      <div className={styles.column}>
        {/* Un div, pas un <header> : dans <main>, il ne nommerait rien, et certains outils y voient une bannière. */}
        <div className={styles.head}>
          <h1>{title}</h1>
          <p className={styles.intro}>{intro}</p>
        </div>
        {sections.map((section) => (
          <AboutPart key={section.id} section={section} locale={locale} external={external} />
        ))}
      </div>
    </main>
  );
}

/** Pied de la page : le plan du site (rubriques et langues), aligné sur la grille de la page. */
export function AboutFooter({ locale }: { locale: Locale }) {
  return (
    <footer className={styles.footer}>
      <SiteNavFooter locale={locale} page="about" />
    </footer>
  );
}
