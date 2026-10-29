import Link from "next/link";
import { MAIN_ID } from "@/components/journey/ids";
import { SiteNavFooter } from "@/components/site/SiteNavFooter";
import { getHomeContent } from "@/content/home/content";
import type { Locale } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";
import { HomeCards } from "./HomeCards";
import { ArrowIcon } from "./icons";
import { KeyFigures } from "./KeyFigures";
import { Orrery } from "./Orrery";
import styles from "./HomePage.module.css";

/**
 * Corps de l'accueil, rendu par le serveur dans la langue de la page : le titre, la promesse et le seul bouton plein
 * (vers le voyage), puis le planétaire du jour (seule feuille client), les trois cartes et les chiffres clés ; en pied
 * de page, le plan du site. Pas de scène 3D : la page s'affiche tout de suite. La route pose avant lui le script des
 * anciens liens, le lien d'évitement et la barre.
 */
export function HomePage({ locale }: { locale: Locale }) {
  const { intro, cards, figures } = getHomeContent(locale);
  return (
    <>
      <main id={MAIN_ID} tabIndex={-1} className={styles.page}>
        <div className={styles.intro}>
          <div>
            <h1 className={styles.title}>{intro.title}</h1>
            <p className={styles.text}>{intro.text}</p>
            <Link className={`btn ${styles.start}`} href={pathFor("voyage", locale)}>
              {intro.start}
              <ArrowIcon className={styles.arrow} />
            </Link>
          </div>
          <Orrery />
        </div>
        <HomeCards locale={locale} content={cards} />
        <KeyFigures locale={locale} content={figures} />
      </main>
      <footer className={styles.footer}>
        <SiteNavFooter locale={locale} page="home" />
      </footer>
    </>
  );
}
