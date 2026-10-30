"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { AU_PER_LIGHT_YEAR } from "@/lib/astro/constants";
import { RAIL_AXIS_END, RAIL_BREAK, railPercent, type StopKey } from "@/lib/journey/camera";
import { journeyStore, useCurrentStop } from "@/lib/journey/store";
import { RAIL_ID } from "./ids";
import { JOURNEY_STRINGS } from "./journey.strings";
import { RailView, type RailMarker, type RailTick } from "./RailView";
import { railDistanceLabel, stopColor, stopName } from "./stopMeta";

export interface RailStop {
  key: StopKey;
  /** Distance au Soleil, en UA. */
  au: number;
  /** Ancre de la section (lien natif sans JavaScript). */
  href: `#${string}`;
}

/** Puissances de dix d'années-lumière marquées d'une graduation majeure : 1 al, 1 million et 1 milliard d'al. */
const MAJOR_LY_EXPONENTS: ReadonlySet<number> = new Set([0, 6, 9]);

/**
 * Graduations logarithmiques : dixièmes d'UA jusqu'à 1, unités jusqu'à 10, dizaines jusqu'à 50 ; après la
 * rupture, une par puissance de dix d'années-lumière, de 1 à 10¹¹ al (majeures : 1 al, 1 Mal, 1 Gal).
 */
const TICKS: readonly RailTick[] = [
  ...[3, 4, 5, 6, 7, 8, 9].map((n) => ({ au: n / 10, major: false })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ au: n, major: n === 1 })),
  ...[10, 20, 30, 40, 50].map((n) => ({ au: n, major: n === 10 })),
  ...Array.from({ length: 12 }, (_, k) => ({ au: 10 ** k * AU_PER_LIGHT_YEAR, major: MAJOR_LY_EXPONENTS.has(k) })),
].map(({ au, major }) => ({ percent: railPercent(au), major }));

/**
 * Axe interrompu entre le système solaire et les étoiles : l'échelle y change d'unité, des UA aux années-lumière.
 * Il s'arrête à 10¹¹ al (RAIL_AXIS_END) : le multivers, à l'infini, se pose après lui, hors échelle.
 */
const AXIS = [
  { from: 0, to: RAIL_BREAK.from },
  { from: RAIL_BREAK.to, to: RAIL_AXIS_END },
] as const;

/** Milieu de la rupture de l'axe, où se pose le signe « ≈ ». */
const BREAK_MARKS = [(RAIL_BREAK.from + RAIL_BREAK.to) / 2] as const;

/**
 * Règle des distances du voyage (RailView) : sommaire des escales (liens) et repère du vol. Les graduations
 * restent à leur position logarithmique ; les repères trop proches (Vénus et la Terre) s'écartent et un trait fin
 * les relie à leur vraie position. Entre le système solaire et les étoiles, l'axe s'interrompt (« ≈ ») : l'échelle
 * change d'unité, des UA aux années-lumière. Il s'arrête après l'Univers observable ; le multivers se pose au-delà,
 * hors échelle. L'accueil se place comme le Soleil. Le curseur suit la caméra par `transform`, hors de React. Noms et
 * distances dans la langue de la page.
 */
export function DistanceRail({ stops }: { stops: readonly RailStop[] }) {
  const locale = useLocale();
  const current = useCurrentStop();
  const markers: RailMarker[] = stops.map(({ key, au, href }) => ({
    key,
    href,
    name: stopName(key, locale),
    sub: railDistanceLabel(key, au, locale),
    color: stopColor(key),
    percent: railPercent(au),
  }));
  return (
    <RailView
      id={RAIL_ID}
      label={JOURNEY_STRINGS[locale].railLabel}
      markers={markers}
      ticks={TICKS}
      axis={AXIS}
      breakMarks={BREAK_MARKS}
      current={current}
      readFlight={journeyStore.get}
    />
  );
}
