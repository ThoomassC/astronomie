import { useEffect, useRef } from "react";

/** Ancre de la position affichée (« #saturne », « #betelgeuse »), ou null quand la page n'en a pas à donner. */
export type FragmentSource = () => `#${string}` | null;

/** Source de la page affichée : une seule à la fois. */
let source: FragmentSource | null = null;

/**
 * Fragment de la position courante, gardé par un changement de langue ; null sans source. Lu au moment du clic,
 * jamais gardé : la position change au défilement, sans prévenir React.
 */
export function currentFragment(): `#${string}` | null {
  return source === null ? null : source();
}

/**
 * Une seule source à la fois (la page affichée) ; renvoie le retrait. Le retrait n'efface que sa propre source : la
 * page suivante, si elle s'est déjà déclarée, garde la sienne.
 */
export function setFragmentSource(next: FragmentSource): () => void {
  source = next;
  return () => {
    if (source === next) source = null;
  };
}

/**
 * Enregistre la source le temps du montage. La fonction du dernier rendu est celle qu'on appelle : on peut la passer
 * en ligne (`useFragmentSource(() => stopAnchor(journeyStore.get().current))`) sans se déclarer à chaque rendu.
 */
export function useFragmentSource(read: FragmentSource): void {
  const latest = useRef(read);
  useEffect(() => {
    latest.current = read;
  });
  useEffect(() => setFragmentSource(() => latest.current()), []);
}
