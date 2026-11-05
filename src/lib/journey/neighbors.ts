/** Escales voisines d'une escale du parcours : la précédente et la suivante, `null` aux deux bouts. */
export interface StopNeighbors<K extends string> {
  previous: K | null;
  next: K | null;
}

/**
 * Voisines de `key` parmi `stops`, les escales du parcours dans l'ordre de la page (Voyage, Tailles), sans
 * l'introduction, qui n'en est pas une : ni précédente à la première escale, ni suivante à la dernière, dont la plaque
 * ramène déjà au départ. Une clé hors du parcours (l'introduction) n'a pas de voisines.
 */
export function stopNeighbors<K extends string>(stops: readonly K[], key: K): StopNeighbors<K> {
  const index = stops.indexOf(key);
  if (index < 0) return { previous: null, next: null };
  return { previous: stops[index - 1] ?? null, next: stops[index + 1] ?? null };
}
