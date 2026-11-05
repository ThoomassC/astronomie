import { GoToLink } from "@/components/journey/GoToLink";
import { getSizesContent } from "@/content/sizes/content";
import type { Locale } from "@/i18n/locales";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { SIZE_STOP_IDS, sizeStopAnchor } from "@/lib/sizes/stops";
import styles from "./SizesPage.module.css";

const INTRO_ID = SIZE_STOP_IDS.intro;
const TITLE_ID = `${INTRO_ID}-titre`;
/** Le plus petit astre, première escale : Cygnus X-1. */
const SMALLEST = COMPARED_OBJECTS[0].key;

/**
 * Introduction de la page « Tailles », dans la mise en page de l'accueil du Voyage (`.hero`) : titre de la page,
 * promesse, une ligne discrète sur ce qui est à l'échelle et ce qui est calculé, et l'unique bouton plein, vers le plus
 * petit astre (défilement piloté, ancre native sans JavaScript). Le texte forme un bloc : sur téléphone, où la scène
 * montre déjà le plus petit astre derrière lui, la feuille de style le pose sur un panneau de plaque.
 */
export function SizesIntro({ locale }: { locale: Locale }) {
  const { intro } = getSizesContent(locale);
  return (
    <section className="hero" id={INTRO_ID} data-stop="intro" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <div className={styles.introText}>
        <h1 id={TITLE_ID}>{intro.title}</h1>
        <p>{intro.text}</p>
        <p className={styles.introNote}>{intro.note}</p>
        {/* La scène 3D est décorative (aria-hidden) : cette phrase dit ce qu'elle montre. */}
        <p className="sr">{intro.sceneDescription}</p>
        <div className="actions">
          <GoToLink className="btn" href={sizeStopAnchor(SMALLEST)} stop={SMALLEST}>
            {intro.start}
          </GoToLink>
        </div>
      </div>
    </section>
  );
}
