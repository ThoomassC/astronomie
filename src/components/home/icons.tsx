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
