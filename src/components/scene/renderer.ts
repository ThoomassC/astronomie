import { WebGLRenderer } from "three";

/**
 * Moteur de rendu WebGL 2 d'une scène en fond plein écran (Voyage, Tailles), ou `null` sans WebGL ou en rendu
 * logiciel : il serait trop lent, le repli sans scène vaut mieux. Antialiasing ; GPU économe en énergie : sur un
 * portable à deux GPU, la scène n'allume pas le GPU dédié (chaleur, batterie), elle qui ne rend une image que si
 * quelque chose bouge.
 */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
  try {
    return new WebGLRenderer({ canvas, antialias: true, failIfMajorPerformanceCaveat: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
}

/**
 * Libère le moteur de rendu. Le contexte WebGL, lui, reste attaché au canevas tant que celui-ci vit, or Next garde dans
 * le DOM, masquées, les pages quittées : le tampon d'image plein écran (≈ 90 à 170 Mo, antialiasing compris) se réduit
 * donc d'abord à 1 × 1 px ; le moteur suivant lui rend la taille de la vue au retour sur la page. Pas de
 * `forceContextLoss()` : `getContext` rendrait ce contexte perdu au moteur suivant, sur le même canevas.
 */
export function releaseRenderer(renderer: WebGLRenderer): void {
  renderer.setSize(1, 1, false);
  renderer.dispose();
}
