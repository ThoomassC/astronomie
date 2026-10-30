const D2R = Math.PI / 180;

/** Longueurs possibles de l'échelle graphique, en Soleils posés côte à côte. */
const SCALE_BAR_SUNS = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000] as const;
/** Au-dessus de ce diamètre à l'écran, en px, le Soleil se voit assez lui-même : pas d'échelle. */
const SCALE_BAR_SUN_MAX_PX = 24;
/** Diamètre à l'écran, en px, sous lequel le Soleil de l'échelle n'est plus un disque, mais un point dans un anneau. */
const SCALE_BAR_DISC_MIN_PX = 4;

/** Échelle graphique : « {suns} Soleils côte à côte » sur `lengthPx` px. */
export interface ScaleBar {
  suns: number;
  lengthPx: number;
}

/**
 * Pixels par rayon solaire au plan de la cible, où sont les centres de toutes les étoiles :
 * hauteur de vue / (2 × dist × tan(champ / 2)), dist en R☉.
 */
export function pixelsPerSolarRadius(viewHeight: number, dist: number, fovDeg: number): number {
  return viewHeight / (2 * dist * Math.tan((fovDeg * D2R) / 2));
}

/**
 * Échelle graphique pour `pxPerSolarRadius` px par R☉ : le plus grand nombre de Soleils côte à côte, parmi 2, 5, 10,
 * 20 … 2 000, dont la longueur (n × 2 × px par R☉) tient dans `maxPx` (160 px sur grand écran, 112 px en mise en page
 * compacte). `null` quand le Soleil fait plus de 24 px à l'écran : il se voit assez lui-même.
 */
export function scaleBarFor(pxPerSolarRadius: number, maxPx: number): ScaleBar | null {
  if (2 * pxPerSolarRadius > SCALE_BAR_SUN_MAX_PX) return null;
  let bar: ScaleBar | null = null;
  for (const suns of SCALE_BAR_SUNS) {
    const lengthPx = suns * 2 * pxPerSolarRadius;
    if (lengthPx <= maxPx) bar = { suns, lengthPx };
  }
  return bar;
}

/** Soleil dessiné au bout de l'échelle : disque à l'échelle de 4 à 24 px de diamètre, sinon un point dans un anneau. */
export function scaleBarSun(sunDiameterPx: number): "disc" | "ring" {
  return sunDiameterPx >= SCALE_BAR_DISC_MIN_PX ? "disc" : "ring";
}
