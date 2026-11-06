import { getVoyageContent } from "@/content/voyage/content";
import type { Locale } from "@/i18n/locales";
import { RAIL_STOPS, type StopKey } from "@/lib/journey/camera";
import { stopNeighbors } from "@/lib/journey/neighbors";
import { stopAnchor } from "@/lib/journey/stopIds";
import { GoToLink } from "./GoToLink";
import { stopName } from "./stopMeta";

/** Escale voisine vers laquelle mène un lien. */
export interface StopStep {
  /** Clé `data-stop` de sa section. */
  key: string;
  /** Ancre de sa section (lien natif sans JavaScript). */
  href: `#${string}`;
  /** Nom court, affiché avec la flèche. */
  name: string;
  /** Nom accessible : le sens, puis le nom entier (« Escale suivante : Mars »), qui contient le nom affiché. */
  label: string;
}

/** Flèche du lien, vers la gauche (précédente) ou la droite (suivante), décorative. */
function Arrow({ toward }: { toward: "previous" | "next" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d={toward === "previous" ? "M12 7H2.5M6.5 3 2.5 7l4 4" : "M2 7h9.5M7.5 3l4 4-4 4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Escales voisines, de part et d'autre du nom dans la plaque compacte (téléphone, tablette en portrait), en pilules
 * ailleurs : un lien vers la précédente (la flèche, puis son nom court) et un vers la suivante (son nom, puis la
 * flèche), nommés en entier pour les lecteurs d'écran ; autour du nom, la flèche seule. Défilement piloté (goTo : doux, immédiat en mouvement réduit), ancre native sans JavaScript. Absents aux
 * bouts du parcours. Sur grand écran, la règle suffit : la feuille de style les masque (« Escales voisines »).
 */
export function StopSteps({ previous, next }: { previous: StopStep | null; next: StopStep | null }) {
  if (!previous && !next) return null;
  return (
    <div className="stop-steps">
      {previous && (
        <GoToLink
          className="stop-step"
          data-step="previous"
          href={previous.href}
          stop={previous.key}
          aria-label={previous.label}
        >
          <Arrow toward="previous" />
          <span>{previous.name}</span>
        </GoToLink>
      )}
      {next && (
        <GoToLink className="stop-step" data-step="next" href={next.href} stop={next.key} aria-label={next.label}>
          <span>{next.name}</span>
          <Arrow toward="next" />
        </GoToLink>
      )}
    </div>
  );
}

/** Escales du voyage, dans l'ordre de la page : celles de la règle et du menu, du Soleil au multivers. */
const JOURNEY_STOPS: readonly StopKey[] = RAIL_STOPS.map(({ key }) => key);

/**
 * Escales voisines d'une escale du voyage, nommées dans la langue de la page comme dans la barre et la règle
 * (`stopName`) : « ← Terre », « Astéroïdes → ». Rien avant le Soleil, rien après le multivers.
 */
export function JourneySteps({ stop, locale }: { stop: StopKey; locale: Locale }) {
  const { steps } = getVoyageContent(locale);
  const { previous, next } = stopNeighbors(JOURNEY_STOPS, stop);
  const step = (key: StopKey | null, label: (name: string) => string): StopStep | null => {
    if (key === null) return null;
    const name = stopName(key, locale);
    return { key, href: stopAnchor(key), name, label: label(name) };
  };
  return <StopSteps previous={step(previous, steps.previous)} next={step(next, steps.next)} />;
}
