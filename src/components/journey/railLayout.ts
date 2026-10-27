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
