import { GoToLink } from "@/components/journey/GoToLink";
import { getSizesContent } from "@/content/sizes/content";
import type { Locale } from "@/i18n/locales";
import { SIZE_STOP_IDS, sizeStopAnchor } from "@/lib/sizes/stops";
import styles from "./SizesPage.module.css";

const INTRO_ID = SIZE_STOP_IDS.intro;
const TITLE_ID = `${INTRO_ID}-titre`;

/**
 * Introduction de la page « Tailles », dans la mise en page de l'accueil du Voyage (`.hero`) : titre de la page,
 * promesse, une ligne discrète sur ce qui est à l'échelle, et l'unique bouton plein, vers la plus petite étoile
 * (défilement piloté, ancre native sans JavaScript).
 */
export function SizesIntro({ locale }: { locale: Locale }) {
  const { intro } = getSizesContent(locale);
  return (
    <section className="hero" id={INTRO_ID} data-stop="intro" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <h1 id={TITLE_ID}>{intro.title}</h1>
      <p>{intro.text}</p>
      <p className={styles.introNote}>{intro.note}</p>
      {/* La scène 3D est décorative (aria-hidden) : cette phrase dit ce qu'elle montre. */}
      <p className="sr">{intro.sceneDescription}</p>
      <div className="actions">
        <GoToLink className="btn" href={sizeStopAnchor("proxima-centauri")} stop="proxima-centauri">
          {intro.start}
        </GoToLink>
      </div>
    </section>
  );
}
