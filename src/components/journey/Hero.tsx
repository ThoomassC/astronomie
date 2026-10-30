import { getVoyageContent } from "@/content/voyage/content";
import type { Locale } from "@/i18n/locales";
import { STOP_IDS } from "@/lib/journey/stopIds";
import { GoToLink } from "./GoToLink";
import { HeroStamp } from "./HeroStamp";
import { ScaleToggle } from "./ScaleToggle";

const TITLE_ID = `${STOP_IDS.hero}-titre`;

/** Accueil du voyage, dans la langue de la page : titre, promesse, date de départ des positions, départ vers le Soleil. */
export function Hero({ locale, sunHref }: { locale: Locale; sunHref: `#${string}` }) {
  const { hero } = getVoyageContent(locale);
  return (
    <section className="hero" id={STOP_IDS.hero} data-stop="hero" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <h1 id={TITLE_ID}>{hero.title}</h1>
      <p>{hero.text}</p>
      {/* La scène 3D est décorative (aria-hidden) : cette phrase dit ce qu'elle montre. */}
      <p className="sr">{hero.sceneDescription}</p>
      <p className="stamp">
        <i aria-hidden="true" />
        <HeroStamp prefix={hero.stampPrefix} />
      </p>
      <div className="actions">
        <GoToLink className="btn" href={sunHref} stop="sun">
          {hero.start}
        </GoToLink>
        <ScaleToggle className="btn ghost" />
      </div>
    </section>
  );
}
