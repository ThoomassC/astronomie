import { getSizesContent } from "@/content/sizes/content";
import type { Locale } from "@/i18n/locales";
import { SIZE_STOP_IDS } from "@/lib/sizes/stops";

const INTRO_ID = SIZE_STOP_IDS.intro;
const TITLE_ID = `${INTRO_ID}-titre`;

/**
 * Introduction de la page « Tailles » : surtitre, titre de la page, promesse, et départ vers la plus petite étoile.
 * Ancre simple : le navigateur la suit, avec ou sans JavaScript.
 */
export function SizesIntro({ locale }: { locale: Locale }) {
  const { intro } = getSizesContent(locale);
  return (
    <section className="hero" id={INTRO_ID} data-stop="intro" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <p className="rank">{intro.rank}</p>
      <h1 id={TITLE_ID}>{intro.title}</h1>
      <p>{intro.text}</p>
      {/* La scène 3D est décorative (aria-hidden) : cette phrase dit ce qu'elle montre. */}
      <p className="sr">{intro.sceneDescription}</p>
      <div className="actions">
        <a className="btn" href={`#${SIZE_STOP_IDS["proxima-centauri"]}`}>
          {intro.start}
        </a>
      </div>
    </section>
  );
}
