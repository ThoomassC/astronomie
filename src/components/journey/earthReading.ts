import { EXPLORE, type ReadingFigures } from "@/content/explore";
import { viewFromEarth, type EarthViewTarget } from "@/lib/astro/earthView";
import { julianDate } from "@/lib/astro/ephemeris";

export interface EarthReading {
  /** Deux lignes visibles, sans région live (elles changent avec la date simulée). */
  lines: readonly [string, string];
  /** Phrase annoncée une seule fois, à l'activation (« secondes d'arc », « degrés » en toutes lettres). */
  spoken: string;
}

/** Arrondi à `digits` décimales, comme l'affichage. */
const roundTo = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * Ce qu'on voit de la planète depuis la Terre à l'instant simulé `ms` :
 * lines[0] = « Éclairée à {pct} % · {diam}″ de diamètre · {E}° {à l'est | à l'ouest} du Soleil », pourcentage et
 * élongation à l'unité, diamètre au dixième sous 10″ (une fois arrondi), à l'unité au-delà ;
 * lines[1] = quand regarder, suivi de « , aux jumelles » ou « , au télescope » sauf si elle est trop près du Soleil.
 */
export function earthReading(key: EarthViewTarget, ms: number): EarthReading {
  const view = viewFromEarth(key, julianDate(ms));
  // 9,96″ s'écrit « 10″ », pas « 10,0″ ».
  const diameterDigits = roundTo(view.diameterArcsec, 1) < 10 ? 1 : 0;
  const figures: ReadingFigures = {
    percent: Math.round(view.illuminated * 100),
    diameter: roundTo(view.diameterArcsec, diameterDigits),
    diameterDigits,
    elongation: Math.round(view.elongationDeg),
    side: view.side,
    visibility: view.visibility,
    instrument: view.visibility === "too-close" || view.instrument === "eye" ? null : view.instrument,
  };
  return { lines: EXPLORE.reading.lines(figures), spoken: EXPLORE.reading.spoken(figures) };
}
