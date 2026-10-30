/*
 * La page affichée, parmi celles que Next garde. Avec `cacheComponents`, Next 16 garde dans le DOM jusqu'à trois pages
 * quittées, masquées sous <Activity> par `display: none` : un sélecteur peut trouver leurs éléments (même identifiant,
 * même clé d'escale) avant ceux de la page affichée. Module sans dépendance : la barre, le layout et le voyage s'en
 * servent sans rien charger d'autre.
 */

/**
 * L'élément appartient à la page affichée. Sans `checkVisibility` (jsdom, Safari avant 17.4), on remonte les
 * ancêtres à la recherche de `display: none`.
 */
export function isShown(element: Element): boolean {
  if (typeof element.checkVisibility === "function") return element.checkVisibility();
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).display === "none") return false;
  }
  return true;
}

/** Éléments de la page affichée qui répondent au sélecteur, dans l'ordre du document. */
export function shownElements<E extends Element = HTMLElement>(selector: string): E[] {
  return Array.from(document.querySelectorAll<E>(selector)).filter(isShown);
}
