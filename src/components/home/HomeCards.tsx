import Link from "next/link";
import type { HomeCardPage, HomeContent } from "@/content/home/types";
import type { Locale } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";
import { ArrowIcon, CardIcon } from "./icons";
import styles from "./HomePage.module.css";

/** Pages ouvertes par les cartes, dans l'ordre des onglets. */
const CARD_PAGES: readonly HomeCardPage[] = ["voyage", "sizes", "about"];

const TITLE_ID = "accueil-rubriques";

/**
 * Trois portes, aussi sobres l'une que l'autre : pictogramme, titre (le lien, étendu à toute la carte), présentation,
 * ligne d'action. Le nom du lien se limite au titre ; la ligne d'action n'est qu'un signal visuel.
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
            <li key={page} className={styles.card}>
              <CardIcon page={page} className={styles.icon} />
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
