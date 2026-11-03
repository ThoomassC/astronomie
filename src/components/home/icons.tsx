import type { HomeCardPage } from "@/content/home/types";

/** Traits de laiton des pictogrammes : 1,5 px, extrémités arrondies (la couleur vient de `color`). */
const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Flèche de 12 px des lignes d'action et du bouton de départ. */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path {...STROKE} d="M1.5 6h8.5M6.5 2.5 10 6l-3.5 3.5" />
    </svg>
  );
}

/**
 * Pictogramme de chaque carte, 48 × 48 : le Soleil, une orbite et une étoile au bout du chemin (Voyage) ; trois astres
 * posés sur une règle (Tailles) ; une plaque gravée (À propos). Décoratifs : le titre de la carte dit tout.
 */
export function CardIcon({ page, className }: { page: HomeCardPage; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <g {...STROKE}>
        {page === "voyage" ? (
          <>
            <circle cx="11" cy="24" r="4.5" />
            <circle cx="11" cy="24" r="10" strokeOpacity={0.55} />
            <circle cx="18.1" cy="16.9" r="1.8" fill="currentColor" />
            <path d="M23 24h11" strokeDasharray="2 3.2" />
            <path d="M40 18.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
          </>
        ) : page === "sizes" ? (
          <>
            <path d="M2 41h44" strokeOpacity={0.55} />
            <circle cx="6" cy="37.5" r="2.5" />
            <circle cx="16" cy="34" r="6" />
            <circle cx="35" cy="28" r="12" />
          </>
        ) : (
          <>
            <rect x="9" y="5" width="30" height="38" rx="7" />
            <path d="M16 15h16M16 21h16M16 27h10" strokeOpacity={0.7} />
            <circle cx="30" cy="34" r="2.2" fill="currentColor" />
          </>
        )}
      </g>
    </svg>
  );
}
