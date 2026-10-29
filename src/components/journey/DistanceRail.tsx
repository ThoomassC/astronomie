"use client";

import { AU_PER_LIGHT_YEAR } from "@/lib/astro/constants";
import { RAIL_BREAK, railPercent, type StopKey } from "@/lib/journey/camera";
import { journeyStore, useCurrentStop } from "@/lib/journey/store";
import { RAIL_ID } from "./ids";
import { RailView, type RailMarker, type RailTick } from "./RailView";
import { railDistanceLabel, stopColor, stopName } from "./stopMeta";

export interface RailStop {
  key: StopKey;
  /** Distance au Soleil, en UA. */
  au: number;
  /** Ancre de la section (lien natif sans JavaScript). */
  href: `#${string}`;
}

/**
 * Graduations logarithmiques : dixièmes d'UA jusqu'à 1, unités jusqu'à 10, dizaines jusqu'à 50 ; après la
 * rupture, une par puissance de dix d'années-lumière, de 1 à 100 000 al (majeure : 1 al).
 */
const TICKS: readonly RailTick[] = [
  ...[3, 4, 5, 6, 7, 8, 9].map((n) => ({ au: n / 10, major: false })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ au: n, major: n === 1 })),
  ...[10, 20, 30, 40, 50].map((n) => ({ au: n, major: n === 10 })),
  ...[1, 10, 100, 1_000, 10_000, 100_000].map((ly) => ({ au: ly * AU_PER_LIGHT_YEAR, major: ly === 1 })),
].map(({ au, major }) => ({ percent: railPercent(au), major }));

/** Axe interrompu entre le système solaire et les étoiles : l'échelle y change d'unité, des UA aux années-lumière. */
const AXIS = [
  { from: 0, to: RAIL_BREAK.from },
  { from: RAIL_BREAK.to, to: 100 },
] as const;

/** Milieu de la rupture de l'axe, où se pose le signe « ≈ ». */
const BREAK_MARKS = [(RAIL_BREAK.from + RAIL_BREAK.to) / 2] as const;

/**
 * Règle des distances du voyage (RailView) : sommaire des escales (liens) et repère du vol. Les graduations
 * restent à leur position logarithmique ; les repères trop proches (Vénus et la Terre) s'écartent et un trait fin
 * les relie à leur vraie position. Entre le système solaire et les étoiles, l'axe s'interrompt (« ≈ ») : l'échelle
 * change d'unité, des UA aux années-lumière. L'accueil se place comme le Soleil. Le curseur suit la caméra par
 * `transform`, hors de React.
 */
export function DistanceRail({ stops }: { stops: readonly RailStop[] }) {
  const current = useCurrentStop();
  const markers: RailMarker[] = stops.map(({ key, au, href }) => ({
    key,
    href,
    name: stopName(key),
    sub: railDistanceLabel(key, au),
    color: stopColor(key),
    percent: railPercent(au),
  }));
  return (
    <RailView
      id={RAIL_ID}
      label="Escales, du Soleil vers l'extérieur"
      markers={markers}
      ticks={TICKS}
      axis={AXIS}
      breakMarks={BREAK_MARKS}
      current={current}
      readFlight={journeyStore.get}
    />
  );
}
