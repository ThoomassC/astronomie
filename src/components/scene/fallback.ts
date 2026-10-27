/** Raisons de passer au repli sans scène 3D. */
export type SceneFallbackReason = "webgl" | "runtime" | "boundary";

const FALLBACK_CLASS = "no3d";
const reasons = new Set<SceneFallbackReason>();

/**
 * Active ou retire une raison de repli. Tant qu'il en reste une, `no3d` sur <body> masque
 * le canvas WebGL (qui garderait sa dernière image) et affiche le Soleil dessiné en CSS.
 * Chaque source ne retire que sa propre raison : l'ordre des nettoyages n'importe pas.
 */
export function setSceneFallback(reason: SceneFallbackReason, active: boolean): void {
  if (active) reasons.add(reason);
  else reasons.delete(reason);
  document.body.classList.toggle(FALLBACK_CLASS, reasons.size > 0);
}
