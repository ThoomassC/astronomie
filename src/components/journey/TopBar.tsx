import { SITE } from "@/content/site";
import { anchorOf } from "./anchors";
import { CurrentStop } from "./CurrentStop";
import type { RailStop } from "./DistanceRail";
import { GoToLink } from "./GoToLink";
import { StopsMenu } from "./StopsMenu";

/** Pictogramme du planétaire : deux orbites en laiton, le Soleil, la Terre et Mars. */
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="16" rx="14" ry="6.5" fill="none" stroke="#C2A36B" strokeWidth="1.2" transform="rotate(-18 16 16)" />
      <ellipse cx="16" cy="16" rx="8.5" ry="3.8" fill="none" stroke="#C2A36B" strokeWidth="1.2" transform="rotate(-18 16 16)" />
      <circle cx="16" cy="16" r="3.6" fill="#FFB547" />
      <circle cx="28.6" cy="11.6" r="1.9" fill="#5B9BE6" />
      <circle cx="9" cy="19.8" r="1.4" fill="#DA6A43" />
    </svg>
  );
}

/** Barre haute : marque (retour à l'accueil) et escale en cours ; sur téléphone, celle-ci ouvre la liste des escales. */
export function TopBar({ stops }: { stops: readonly RailStop[] }) {
  return (
    <header className="bar">
      <GoToLink className="brand" href={anchorOf("hero")} stop="hero" aria-label={`${SITE.name}, retour à l'accueil`}>
        <BrandMark />
        <span className="brand-name">{SITE.name}</span>
      </GoToLink>
      <CurrentStop />
      <StopsMenu stops={stops} />
    </header>
  );
}
