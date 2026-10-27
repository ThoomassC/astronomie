"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { railPercent, smootherstep, type StopKey } from "@/lib/journey/camera";
import { journeyStore, useCurrentStop } from "@/lib/journey/store";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";
import { RAIL_ID } from "./ids";
import { spreadPositions } from "./railLayout";
import { railDistanceLabel, stopColor, stopName } from "./stopMeta";

export interface RailStop {
  key: StopKey;
  /** Distance au Soleil, en UA. */
  au: number;
  /** Ancre de la section (lien natif sans JavaScript). */
  href: `#${string}`;
}

/** Écart minimal entre deux repères, en px (relevé à la hauteur réelle d'un repère si elle est plus grande). */
const MIN_GAP_PX = 26;

/** Graduations logarithmiques : dixièmes d'UA jusqu'à 1, unités jusqu'à 10, dizaines jusqu'à 50. */
const TICKS: readonly { au: number; major: boolean }[] = [
  ...[3, 4, 5, 6, 7, 8, 9].map((n) => ({ au: n / 10, major: false })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ au: n, major: n === 1 })),
  ...[10, 20, 30, 40, 50].map((n) => ({ au: n, major: n === 10 })),
];

interface RailMetrics {
  /** Hauteur de la règle, en px. */
  height: number;
  /** Écart minimal entre deux repères, en px. */
  gap: number;
}

/**
 * Règle des distances : sommaire des escales (liens) et repère du vol. Les graduations
 * restent à leur position logarithmique ; les repères trop proches (Vénus et la Terre)
 * s'écartent et un trait fin les relie à leur vraie position. Le curseur suit la caméra
 * par `transform`, hors de React.
 */
export function DistanceRail({ stops }: { stops: readonly RailStop[] }) {
  const current = useCurrentStop();
  const railRef = useRef<HTMLElement>(null);
  const cursorTrackRef = useRef<HTMLDivElement>(null);
  const lastCursor = useRef("");
  const [metrics, setMetrics] = useState<RailMetrics | null>(null);
  const [tipsDismissed, setTipsDismissed] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      let tallest = 0;
      for (const link of rail.querySelectorAll<HTMLElement>("a")) tallest = Math.max(tallest, link.offsetHeight);
      const next = { height: rail.clientHeight, gap: Math.max(MIN_GAP_PX, tallest) };
      setMetrics((previous) =>
        previous && previous.height === next.height && previous.gap === next.gap ? previous : next,
      );
    };
    // La règle change de hauteur avec la vue, les repères avec les polices et le point de rupture.
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    const firstLink = rail.querySelector("a");
    if (firstLink) observer.observe(firstLink);
    return () => observer.disconnect();
  }, []);

  /** Distance d'une escale sur la règle ; l'accueil se place comme le Soleil. */
  const auOf = (key: StopKey) => stops.find((stop) => stop.key === key)?.au ?? 0;

  useFrame(() => {
    const track = cursorTrackRef.current;
    if (!track) return;
    const { from, to, t } = journeyStore.get();
    const start = railPercent(auOf(from));
    const end = railPercent(auOf(to));
    const transform = `translateY(${(start + (end - start) * smootherstep(t)).toFixed(3)}%)`;
    if (transform === lastCursor.current) return;
    lastCursor.current = transform;
    track.style.transform = transform;
  }, FRAME_ORDER.ui);

  // Échap masque l'infobulle des petits écrans ; elle revient au prochain survol ou focus.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") setTipsDismissed(true);
  };

  const idealPercent = stops.map((stop) => railPercent(stop.au));
  const idealPx = metrics ? idealPercent.map((percent) => (percent / 100) * metrics.height) : null;
  const placedPx = metrics && idealPx ? spreadPositions(idealPx, metrics.gap, metrics.height) : null;

  return (
    <nav
      id={RAIL_ID}
      ref={railRef}
      className="rail"
      aria-label="Escales, du Soleil vers l'extérieur"
      data-tips={tipsDismissed ? "off" : undefined}
      onKeyDown={onKeyDown}
      onFocus={() => setTipsDismissed(false)}
      onPointerLeave={() => setTipsDismissed(false)}
    >
      <div className="axis" />
      <div className="cursor-track" ref={cursorTrackRef} style={{ transform: `translateY(${railPercent(0)}%)` }}>
        <div className="cursor" />
      </div>
      {TICKS.map(({ au, major }) => (
        <div
          key={au}
          className={major ? "tick maj" : "tick"}
          style={{ top: `${railPercent(au)}%`, width: major ? 12 : 6 }}
        />
      ))}
      {placedPx && idealPx
        ? stops.map((stop, i) => {
            const shift = placedPx[i] - idealPx[i];
            // Sous 2 px, l'écart ne se voit pas : pas de trait.
            if (Math.abs(shift) < 2) return null;
            // Équerre fine : de la vraie position (sur l'échelle) jusqu'au repère déplacé.
            return (
              <span
                key={stop.key}
                className={shift > 0 ? "leader down" : "leader up"}
                style={cssVars(
                  { "--pc": stopColor(stop.key) },
                  { top: Math.min(idealPx[i], placedPx[i]), height: Math.abs(shift) },
                )}
              />
            );
          })
        : null}
      {stops.map((stop, i) => {
        const name = stopName(stop.key);
        const distanceLabel = railDistanceLabel(stop.key, stop.au);
        return (
          <GoToLink
            key={stop.key}
            stop={stop.key}
            href={stop.href}
            style={cssVars(
              { "--pc": stopColor(stop.key) },
              { top: placedPx ? `${placedPx[i]}px` : `${idealPercent[i]}%` },
            )}
            aria-label={`${name}, ${distanceLabel}`}
            aria-current={stop.key === current ? "step" : undefined}
          >
            <span>
              {name}
              <small>{distanceLabel}</small>
            </span>
            <i />
          </GoToLink>
        );
      })}
    </nav>
  );
}
