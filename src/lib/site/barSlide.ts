/*
 * Barre haute du Voyage et de Tailles, là où elle n'a pas de fondus (mise en page compacte, écran bas) : elle glisse
 * hors de l'écran quand on descend et revient dès qu'on remonte (AutoHideBar). Ici, la logique pure du défilement, et
 * la mesure de la barre à sa place de repos, que les scènes lisent pour cadrer et poser leurs étiquettes sans suivre
 * le glissement : l'astre ne bouge pas quand la barre part ou revient, et aucune étiquette ne se pose là où elle
 * reviendra. Module sans dépendance.
 */

/** Course vers le bas, en px, après laquelle la barre glisse hors de l'écran : un frôlement ne la cache pas. */
export const CONCEAL_AFTER_PX = 16;
/** Course vers le haut, en px, après laquelle elle revient : aussitôt qu'on remonte, sans trembler sur un rebond. */
export const REVEAL_AFTER_PX = 8;

/** Où en est la barre. */
export interface BarSlide {
  /** Glissée hors de l'écran. */
  concealed: boolean;
  /** Dernier défilement lu, en px. */
  y: number;
  /** Course dans le sens du défilement en cours, en px : positive vers le bas, négative vers le haut. */
  travel: number;
}

/** Barre affichée, au défilement `y`. */
export function shownBar(y: number): BarSlide {
  return { concealed: false, y, travel: 0 };
}

/**
 * La barre après un défilement jusqu'à `y` (px) : affichée en haut de la page, tant que le défilement ne dépasse pas
 * `top` (sa propre hauteur) ; glissée hors de l'écran après 16 px de descente d'affilée ; revenue après 8 px de
 * remontée. Chaque changement de sens repart de zéro : un va-et-vient ne la fait ni partir ni revenir. Même état (même
 * objet) quand le défilement n'a pas bougé.
 */
export function followScroll(bar: BarSlide, y: number, top: number): BarSlide {
  if (y <= top) return shownBar(y);
  const delta = y - bar.y;
  if (delta === 0) return bar;
  const travel = Math.sign(delta) === Math.sign(bar.travel) ? bar.travel + delta : delta;
  const concealed = travel >= CONCEAL_AFTER_PX ? true : travel <= -REVEAL_AFTER_PX ? false : bar.concealed;
  return { concealed, y, travel };
}

/**
 * La barre après un défilement programmé jusqu'à `y` (saut de scrollInstantly : repli d'une plaque, caméra posée avant
 * l'exploration) : ce n'est pas un geste de la personne. Cachée ou affichée, elle reste comme elle est ; sa course
 * repart de la nouvelle position.
 */
export function rebaseBar(bar: BarSlide, y: number): BarSlide {
  return { concealed: bar.concealed, y, travel: 0 };
}

/** Abonnés aux défilements programmés (AutoHideBar). */
const jumpListeners = new Set<() => void>();

/**
 * Prévient que la page vient de sauter d'elle-même (scrollInstantly), et non sous la main de la personne. Appelé juste
 * après le saut : le défilement lu est déjà le nouveau, et l'événement `scroll` qui suivra ne bougera plus rien.
 */
export function announceScrollJump(): void {
  for (const listener of jumpListeners) listener();
}

/** Suit les défilements programmés ; renvoie le désabonnement. */
export function onScrollJump(listener: () => void): () => void {
  jumpListeners.add(listener);
  return () => {
    jumpListeners.delete(listener);
  };
}

/**
 * Translation verticale (px) d'une transformation calculée, telle que le navigateur l'écrit : `none`, `matrix(…)` ou
 * `matrix3d(…)`. 0 pour toute autre forme.
 */
export function translateYOf(transform: string): number {
  const match = /^matrix(3d)?\(([^)]*)\)$/.exec(transform.trim());
  if (!match) return 0;
  const values = match[2].split(",").map(Number);
  const translateY = match[1] ? values[13] : values[5];
  return Number.isFinite(translateY) ? translateY : 0;
}

/**
 * Boîte de l'élément à sa place de repos, à l'écran : celle qu'il occupe, moins la translation verticale qui le fait
 * glisser (pendant le glissement comme après). La barre cachée garde ainsi sa place dans le cadrage des scènes.
 */
export function restingRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const slid = translateYOf(getComputedStyle(element).transform);
  return slid === 0 ? rect : new DOMRect(rect.x, rect.y - slid, rect.width, rect.height);
}
