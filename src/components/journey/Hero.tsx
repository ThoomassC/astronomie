import { HERO } from "@/content/site";
import { GoToLink } from "./GoToLink";
import { HeroStamp } from "./HeroStamp";
import { HERO_ID } from "./ids";
import { ScaleToggle } from "./ScaleToggle";

const TITLE_ID = `${HERO_ID}-titre`;

/** Accueil : titre, promesse, date de départ des positions, départ vers le Soleil. */
export function Hero({ sunHref }: { sunHref: `#${string}` }) {
  return (
    <section className="hero" id={HERO_ID} data-stop="hero" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <h1 id={TITLE_ID}>{HERO.title}</h1>
      <p>{HERO.text}</p>
      {/* La scène 3D est décorative (aria-hidden) : cette phrase dit ce qu'elle montre. */}
      <p className="sr">
        En arrière-plan, une vue 3D du système solaire aux positions du jour ; la caméra suit le défilement.
      </p>
      <p className="stamp">
        <i aria-hidden="true" />
        <HeroStamp prefix={HERO.stampPrefix} />
      </p>
      <div className="actions">
        <GoToLink className="btn" href={sunHref} stop="sun">
          {HERO.start}
        </GoToLink>
        <ScaleToggle className="btn ghost" />
      </div>
    </section>
  );
}
