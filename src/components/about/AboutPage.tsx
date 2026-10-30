import { MAIN_ID } from "@/components/journey/ids";
import { ContactFooter } from "@/components/site/ContactFooter";
import { getAboutContent } from "@/content/about/content";
import type { AboutLink, AboutSection } from "@/content/about/types";
import type { Locale } from "@/i18n/locales";
import styles from "./AboutPage.module.css";

/** Identifiant du titre qui nomme une section : « sources-titre », comme les escales du voyage. */
function headingId(sectionId: string): string {
  return `${sectionId}-titre`;
}

interface OutboundLinksProps {
  links: readonly AboutLink[];
  external: string;
  /** Langue de la page : un titre de source dans une autre langue y est marqué. */
  locale: Locale;
}

/**
 * Liste filetée de liens vers d'autres sites : le nom (le lien), puis ce que le site en tire. La flèche dit à l'œil
 * que le lien quitte le site, la précision masquée le dit aux lecteurs d'écran ; tout s'ouvre dans le même onglet.
 * Un titre original laissé dans sa langue (« Sun Fact Sheet ») porte `lang` quand ce n'est pas celle de la page, et le
 * lien dit la langue de la page liée (`hrefLang`) ; la précision masquée reste dans la langue de la page.
 * `role="list"` : Safari retire le rôle de liste aux listes sans puces, et le nombre d'entrées annoncé aide à
 * s'orienter.
 */
function OutboundLinks({ links, external, locale }: OutboundLinksProps) {
  return (
    <ul role="list" className={styles.outbound}>
      {links.map(({ label, href, lang, description }) => (
        <li key={label}>
          <a href={href} hrefLang={lang}>
            {lang === undefined || lang === locale ? label : <span lang={lang}>{label}</span>}
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

/** Une section sous son h2 : ses paragraphes, puis ses liens vers d'autres sites (Sources). */
function AboutPart({ section, external, locale }: { section: AboutSection; external: string; locale: Locale }) {
  const { id, heading, paragraphs, links } = section;
  return (
    <section className={styles.part} id={id} aria-labelledby={headingId(id)}>
      <h2 id={headingId(id)}>{heading}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {links ? <OutboundLinks links={links} external={external} locale={locale} /> : null}
    </section>
  );
}

/**
 * La page À propos : pourquoi ce site, puis ses sources. Composant serveur, sans aucun script : la page se lit entière
 * sans JavaScript. Les deux sections se partagent toute la largeur de la page, côte à côte sur grand écran, l'une sous
 * l'autre ailleurs ; l'ordre du DOM reste l'ordre de lecture.
 */
export function AboutPage({ locale }: { locale: Locale }) {
  const { title, intro, external, sections } = getAboutContent(locale);
  return (
    <main id={MAIN_ID} tabIndex={-1} className={styles.page}>
      {/* Un div, pas un <header> : dans <main>, il ne nommerait rien, et certains outils y voient une bannière. */}
      <div className={styles.head}>
        <h1>{title}</h1>
        <p className={styles.intro}>{intro}</p>
      </div>
      {sections.map((section) => (
        <AboutPart key={section.id} section={section} external={external} locale={locale} />
      ))}
    </main>
  );
}

/** Pied de la page : le pied de page commun (signature, contacts de l'auteur), entre les marges de la page. */
export function AboutFooter({ locale }: { locale: Locale }) {
  return (
    <footer className={styles.footer}>
      <ContactFooter locale={locale} />
    </footer>
  );
}
