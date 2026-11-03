import Link from "next/link";
import type { HomeCardPage, HomeContent } from "@/content/home/types";
import type { Locale } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";
import { CardArt } from "./CardArt";
import { ArrowIcon } from "./icons";
import styles from "./HomePage.module.css";

/** Pages ouvertes par les cartes, dans l'ordre des onglets. */
const CARD_PAGES: readonly HomeCardPage[] = ["voyage", "sizes", "about"];

/** La carte mise en avant : le Voyage, cœur du site, plus grand sur grand écran. */
const FEATURED: HomeCardPage = "voyage";

const TITLE_ID = "accueil-rubriques";

/**
 * Trois portes : une illustration (une fenêtre sur le ciel de nuit, décorative), le titre (le seul lien, étendu à
 * toute la carte), la présentation, la ligne d'action. Le Voyage passe devant : pleine largeur au-dessus des deux
 * autres, et dès 64 rem son dessin à gauche, son texte à droite. Le nom du lien se limite au titre ; la ligne d'action
 * n'est qu'un signal visuel.
 */
export function HomeCards({ locale, content }: { locale: Locale; content: HomeContent["cards"] }) {
  return (
    <section className={styles.cards} aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className="sr">
        {content.title}
      </h2>
      <ul className={styles.cardList}>
        {CARD_PAGES.map((page) => {
          const card = content.items[page];
          return (
            <li key={page} className={styles.card} data-featured={page === FEATURED ? "" : undefined}>
              <div className={styles.art}>
                <CardArt page={page} />
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>
                  <Link href={pathFor(page, locale)}>{card.title}</Link>
                </h3>
                <p className={styles.cardText}>{card.text}</p>
                <p className={styles.action} aria-hidden="true">
                  {card.action}
                  <ArrowIcon className={styles.arrow} />
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
