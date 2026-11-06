/*
 * Mesure d'un élément à sa place de repos, à l'écran, moins la translation verticale qui le déplace : les scènes du
 * Voyage et de Tailles lisent ainsi la barre haute et les plaques pour cadrer et poser leurs étiquettes, sans suivre un
 * déplacement passager (transformation en cours). La barre haute reste fixe depuis la demande de l'utilisateur
 * (2026-11-06) ; la mesure au repos reste juste pour toute transformation. Module sans dépendance.
 */

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
 * déplacer (pendant le déplacement comme après). Ce qui se déplace garde ainsi sa place dans le cadrage des scènes.
 */
export function restingRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const slid = translateYOf(getComputedStyle(element).transform);
  return slid === 0 ? rect : new DOMRect(rect.x, rect.y - slid, rect.width, rect.height);
}
