/**
 * Positions (px) des repères de la règle : au plus près de leur position vraie (triée),
 * espacés d'au moins `gap`, poussés vers le bas puis remontés s'ils dépassent `height`.
 * Si la règle est trop courte pour l'écart demandé, l'écart se réduit pour tout y faire tenir.
 */
export function spreadPositions(ideal: readonly number[], gap: number, height: number): number[] {
  const count = ideal.length;
  if (count === 0) return [];
  const step = count > 1 ? Math.min(gap, height / (count - 1)) : gap;
  const placed = ideal.slice();
  for (let i = 1; i < count; i++) placed[i] = Math.max(placed[i], placed[i - 1] + step);
  if (placed[count - 1] > height) {
    placed[count - 1] = height;
    for (let i = count - 2; i >= 0; i--) placed[i] = Math.min(placed[i], placed[i + 1] - step);
  }
  return placed;
}

/**
 * Rangs des repères dont la règle affiche le nom et la précision : l'escale en cours et ses deux voisines, dans l'ordre
 * de la règle. Une escale absente de la règle (rang −1 : l'accueil, l'introduction) se place comme le premier repère.
 */
export function nearIndexes(count: number, current: number): number[] {
  const focus = Math.max(0, current);
  const near: number[] = [];
  for (let i = Math.max(0, focus - 1); i <= Math.min(count - 1, focus + 1); i++) near.push(i);
  return near;
}

/**
 * Décalages verticaux (px) des textes affichés sur la règle, pour qu'aucun ne chevauche son voisin : `centers`, centres
 * de leurs repères (px, croissants) ; `heights`, hauteurs des textes (px, 0 tant qu'ils ne sont pas mesurés) ;
 * `anchor`, rang du texte qui ne bouge pas (l'escale en cours) ; `gap`, air laissé entre deux textes mesurés. Les
 * textes d'avant montent, ceux d'après descendent, juste assez ; un texte déjà dégagé reste centré sur son repère.
 */
export function separateLabels(
  centers: readonly number[],
  heights: readonly number[],
  anchor: number,
  gap = 0,
): number[] {
  const shifts = centers.map(() => 0);
  /** Air entre les textes `i` et `j`, s'ils sont mesurés tous deux. */
  const air = (i: number, j: number) => (heights[i] > 0 && heights[j] > 0 ? gap : 0);
  for (let i = anchor - 1; i >= 0; i--) {
    const ceiling = centers[i + 1] + shifts[i + 1] - heights[i + 1] / 2 - air(i, i + 1);
    shifts[i] = Math.min(0, ceiling - heights[i] / 2 - centers[i]);
  }
  for (let i = anchor + 1; i < centers.length; i++) {
    const floor = centers[i - 1] + shifts[i - 1] + heights[i - 1] / 2 + air(i - 1, i);
    shifts[i] = Math.max(0, floor + heights[i] / 2 - centers[i]);
  }
  return shifts;
}
