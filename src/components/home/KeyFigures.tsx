import Link from "next/link";
import { Fragment } from "react";
import { cssVars } from "@/components/journey/cssVars";
import type { HomeContent } from "@/content/home/types";
import type { Locale } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";
import { KEY_FIGURE_COLORS, KEY_FIGURES, keyFigureParts, type KeyFigurePart } from "@/lib/home/keyFigures";
import styles from "./HomePage.module.css";

const TITLE_ID = "accueil-chiffres";

/**
 * Valeur affichée : les nombres en grand (Bodoni), les symboles et l'unité en mots plus petits (Atkinson), sur la même
 * ligne de base. L'espace qui précède un symbole ou l'unité est dans leur span, donc à leur taille : « 8 min » reste
 * serré, quand « min 19 » garde l'espace des grands chiffres. Le nombre et ses symboles ne se coupent jamais ; l'unité
 * en mots (« années-lumière », d'un seul tenant) passe sous le nombre si la colonne est trop étroite.
 */
function FigureValue({ parts, unit }: { parts: readonly KeyFigurePart[]; unit?: string }) {
  return (
    <>
      <span className={styles.number}>
        {parts.map((part, index) => {
          const space = index > 0 ? " " : null;
          return part.kind === "symbol" ? (
            <span key={index} className={styles.unit}>
              {space}
              {part.text}
            </span>
          ) : (
            <Fragment key={index}>
              {space}
              {part.text}
            </Fragment>
          );
        })}
      </span>
      {unit ? (
        <span className={styles.unit}>
          {" "}
          <span className={styles.word}>{unit}</span>
        </span>
      ) : null}
    </>
  );
}

/**
 * Quatre ordres de grandeur, suspendus à un réglet : un filet en haut, et au départ de chaque chiffre un repère de la
 * couleur de l'astre dont il parle. La valeur et sa légende forment une seule phrase (« 109 Terres côte à côte… ») ;
 * une valeur écrite avec des symboles (« 8 min 19 s ») se lit en toutes lettres aux lecteurs d'écran. Les sources
 * détaillées sont dans À propos.
 */
export function KeyFigures({ locale, content }: { locale: Locale; content: HomeContent["figures"] }) {
  return (
    <section className={styles.figures} aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className={styles.heading}>
        {content.title}
      </h2>
      <ul className={styles.figureList}>
        {KEY_FIGURES.map((key) => {
          const { unit, caption, spoken } = content.items[key];
          const value = <FigureValue parts={keyFigureParts(key, locale)} unit={unit} />;
          return (
            <li key={key} className={styles.figure} style={cssVars({ "--fc": KEY_FIGURE_COLORS[key] })}>
              <p>
                <strong className={styles.value}>
                  {spoken ? (
                    <>
                      <span aria-hidden="true">{value}</span>
                      <span className="sr">{spoken}</span>
                    </>
                  ) : (
                    value
                  )}
                </strong>{" "}
                <span className={styles.caption}>{caption}</span>
              </p>
            </li>
          );
        })}
      </ul>
      <p className={styles.figuresNote}>
        {content.note.before}
        <Link href={pathFor("about", locale)}>{content.note.link}</Link>
        {content.note.after}
      </p>
    </section>
  );
}
