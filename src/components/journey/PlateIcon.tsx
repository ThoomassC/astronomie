import type { ReactNode } from "react";

/**
 * Pictogrammes des titres-boutons de la plaque compacte, un par type de section : fiche, et un par module explicatif,
 * tableau ou geste (« Replier »).
 */
export const PLATE_ICONS = [
  "story",
  "light",
  "orbit",
  "day",
  "seasons",
  "weight",
  "sizes",
  "rings",
  "age",
  "stars",
  "galaxies",
  "fold",
] as const;

export type PlateIconName = (typeof PLATE_ICONS)[number];

/** Petit point plein (astre, étoile), au trait comme le reste : la couleur du trait le remplit. */
function Dot({ cx, cy, r = 1.1 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
}

/** Dessins sur une grille de 20 × 20, au trait de 1,4 : ceux d'un instrument en laiton. */
const DRAWINGS: Record<PlateIconName, ReactNode> = {
  // Fiche : une page cornée et ses lignes.
  story: (
    <>
      <path d="M5.5 2.5h6.25L15 5.75V17.5H5.5z" />
      <path d="M11.5 2.5v3.5H15M8 9.5h4.5M8 12.25h4.5M8 15h3" />
    </>
  ),
  // La course de la lumière : un astre, et son rayon qui file.
  light: (
    <>
      <circle cx="5" cy="10" r="2.6" />
      <path d="M9.5 10h8M15 7.5l2.5 2.5-2.5 2.5" />
      <path d="M5 4v1.4M5 14.6V16M1.5 6.6l1 1M1.5 13.4l1-1" />
    </>
  ),
  // Une orbite elliptique : le Soleil à un foyer, la planète sur l'ellipse.
  orbit: (
    <>
      <ellipse cx="10" cy="10" rx="8" ry="5" />
      <Dot cx={6.2} cy={10} r={1.6} />
      <circle cx="14.6" cy="6" r="1.4" />
    </>
  ),
  // Le jour contre l'année : un globe mi-éclairé, et la flèche de sa rotation.
  day: (
    <>
      <circle cx="10" cy="11" r="5.5" />
      <path d="M10 5.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" fillOpacity="0.35" />
      <path d="M3.2 6.2A8 8 0 0 1 15.4 3.6M15.4 3.6l-.3 2.6M15.4 3.6l-2.5-.6" />
    </>
  ),
  // Les saisons : un globe à l'axe incliné et son équateur.
  seasons: (
    <>
      <circle cx="10" cy="10" r="5.75" />
      <path d="M7.4 1.9l5.2 16.2M4.6 11.8c3.4 1.3 7.7-.1 10.8-3.6" />
    </>
  ),
  // Le poids : une balance à deux plateaux.
  weight: (
    <>
      <path d="M10 3.6v13.4M6.5 17h7M3.8 6h12.4" />
      <path d="M3.8 6 1.6 11.2h4.4zM16.2 6 14 11.2h4.4z" />
      <path d="M1.6 11.2a2.2 2.2 0 0 0 4.4 0M14 11.2a2.2 2.2 0 0 0 4.4 0" />
      <circle cx="10" cy="3" r="0.9" />
    </>
  ),
  // Comparer les tailles : trois cercles emboîtés, posés sur la même ligne.
  sizes: (
    <>
      <circle cx="10" cy="10.25" r="7.25" />
      <circle cx="10" cy="12.75" r="4.75" />
      <circle cx="10" cy="15.25" r="2.25" />
    </>
  ),
  // Les anneaux : une planète ceinte d'un anneau incliné.
  rings: (
    <>
      <circle cx="10" cy="10" r="4.5" />
      <ellipse cx="10" cy="10" rx="8.75" ry="2.75" transform="rotate(-18 10 10)" />
    </>
  ),
  // L'âge sur une autre planète : un sablier.
  age: (
    <>
      <path d="M5.5 2.5h9M5.5 17.5h9" />
      <path d="M6.75 2.5v2.25c0 2.6 3.25 3.4 3.25 5.25s-3.25 2.65-3.25 5.25v2.25M13.25 2.5v2.25c0 2.6-3.25 3.4-3.25 5.25s3.25 2.65 3.25 5.25v2.25" />
      <path d="M8.4 16.2 10 14.6l1.6 1.6" />
    </>
  ),
  // Les étoiles de la carte : des points reliés, comme une constellation.
  stars: (
    <>
      <path d="M3.5 14.5 7.5 6l5.5 3.5L16.5 3.5M13 9.5l2 6.5" strokeOpacity="0.6" />
      <Dot cx={3.5} cy={14.5} />
      <Dot cx={7.5} cy={6} r={1.4} />
      <Dot cx={13} cy={9.5} />
      <Dot cx={16.5} cy={3.5} r={1.4} />
      <Dot cx={15} cy={16} />
    </>
  ),
  // Les galaxies de la carte : une galaxie spirale vue de biais, son bulbe au centre.
  galaxies: (
    <>
      <ellipse cx="10" cy="10" rx="8.25" ry="3.5" transform="rotate(-22 10 10)" />
      <path d="M13.6 6.4c-2.4-.6-5.6.6-6.4 2.6M6.4 13.6c2.4.6 5.6-.6 6.4-2.6" />
      <Dot cx={10} cy={10} r={1.6} />
    </>
  ),
  // Replier : deux chevrons qui se rejoignent sur un trait.
  fold: <path d="M6 3.5l4 4 4-4M6 16.5l4-4 4 4M4 10h12" />,
};

/** Pictogramme d'un titre-bouton : décoratif, le libellé du bouton reste son nom accessible. */
export function PlateIcon({ name }: { name: PlateIconName }) {
  return (
    <svg
      className="plate-icon"
      data-icon={name}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {DRAWINGS[name]}
    </svg>
  );
}
