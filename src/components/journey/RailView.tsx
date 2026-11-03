"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { smootherstep } from "@/lib/journey/sections";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";
import { spreadPositions } from "./railLayout";

/** Repère d'une escale sur la règle : un lien vers sa section. */
export interface RailMarker {
  /** Clé `data-stop` de la section de l'escale. */
  key: string;
  /** Ancre de la section (lien natif sans JavaScript). */
  href: `#${string}`;
  /** Nom de l'escale, visible. */
  name: string;
  /** Précision sous le nom (distance au Soleil, rayon), lue après lui : « Mars, 1,52 UA ». */
  sub: string;
  /** Couleur de la pastille et de l'équerre. */
  color: string;
  /** Position sur la règle, en % de sa hauteur (0 en haut). */
  percent: number;
}

/** Graduation de la règle. */
export interface RailTick {
  /** Position sur la règle, en % de sa hauteur (0 en haut). */
  percent: number;
  /** Graduation majeure, deux fois plus longue. */
  major: boolean;
}

export interface RailViewProps {
  /** Identifiant de la règle : la scène l'évite (étiquettes) et le mesure (zone libre du grand écran). */
  id: string;
  /** Nom accessible du <nav>. */
  label: string;
  /** Repères, dans l'ordre de la page. */
  markers: readonly RailMarker[];
  ticks: readonly RailTick[];
  /**
   * Morceaux d'axe dessinés, en % de la hauteur : l'axe s'interrompt entre eux. Un bord à 0 ou à 100 % reste celui
   * de la feuille de style (pleine hauteur).
   */
  axis: readonly { from: number; to: number }[];
  /** Signes « ≈ » posés dans les interruptions de l'axe, en % de la hauteur. */
  breakMarks?: readonly number[];
  /** Escale affichée (`aria-current="step"`). */
  current: string;
  /**
   * Vol en cours, lu à chaque image hors de React. Une escale sans repère (l'accueil de la page) se place comme
   * le premier repère.
   */
  readFlight(): { from: string; to: string; t: number };
}

/** Écart minimal entre deux repères, en px (relevé à la hauteur réelle d'un repère si elle est plus grande). */
const MIN_GAP_PX = 26;
/** Petits écrans : le nom d'un repère devient une infobulle au survol et au focus (globals.css). */
const TIPS_QUERY = "(max-width: 860px)";

/**
 * Position en pourcentage, au millième : `Math.log` peut différer d'un bit entre Node et le navigateur,
 * et un style écrit au chiffre près ferait échouer l'hydratation.
 */
const percent = (value: number) => `${value.toFixed(3)}%`;
/** Même arrondi au millième, sans zéros inutiles : bornes de l'axe, ruptures, curseur avant la première image. */
const roundPercent = (value: number) => `${Number(value.toFixed(3))}%`;

interface RailMetrics {
  /** Hauteur de la règle, en px. */
  height: number;
  /** Écart minimal entre deux repères, en px. */
  gap: number;
}

/**
 * Règle à repères : sommaire des escales (liens) et repère du vol, commune au voyage (distances) et à la page Tailles
 * (rayons). Les graduations restent à leur position ; les repères trop proches s'écartent et un trait fin les relie à
 * leur vraie position. L'axe peut s'interrompre (« ≈ ») là où l'échelle change. Le curseur suit la caméra par
 * `transform`, hors de React, lissé comme elle (smootherstep). Sur petit écran, le nom d'un repère devient une
 * infobulle, qu'Échap masque.
 */
export function RailView({ id, label, markers, ticks, axis, breakMarks = [], current, readFlight }: RailViewProps) {
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

  /** Position d'une escale sur la règle ; une escale sans repère (l'accueil) se place comme le premier. */
  const percentOf = (key: string) => (markers.find((marker) => marker.key === key) ?? markers[0])?.percent ?? 0;

  useFrame(() => {
    const track = cursorTrackRef.current;
    if (!track) return;
    const { from, to, t } = readFlight();
    const start = percentOf(from);
    const end = percentOf(to);
    const transform = `translateY(${(start + (end - start) * smootherstep(t)).toFixed(3)}%)`;
    if (transform === lastCursor.current) return;
    lastCursor.current = transform;
    track.style.transform = transform;
  }, FRAME_ORDER.ui);

  // Échap masque l'infobulle des petits écrans ; elle revient au prochain survol ou focus.
  // Quand une infobulle était affichée, cet appui ne ferme qu'elle (pas la note d'échelle).
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || tipsDismissed) return;
    setTipsDismissed(true);
    if (window.matchMedia(TIPS_QUERY).matches) event.preventDefault();
  };

  const idealPx = metrics ? markers.map((marker) => (marker.percent / 100) * metrics.height) : null;
  const placedPx = metrics && idealPx ? spreadPositions(idealPx, metrics.gap, metrics.height) : null;

  return (
    <nav
      id={id}
      ref={railRef}
      className="rail"
      data-hide-on-explore
      aria-label={label}
      data-tips={tipsDismissed ? "off" : undefined}
      onKeyDown={onKeyDown}
      onFocus={() => setTipsDismissed(false)}
      onPointerLeave={() => setTipsDismissed(false)}
    >
      {axis.map(({ from, to }) => (
        <div
          key={`${from}-${to}`}
          className="axis"
          style={{
            top: from > 0 ? roundPercent(from) : undefined,
            bottom: to < 100 ? roundPercent(100 - to) : undefined,
          }}
        />
      ))}
      {breakMarks.map((mark) => (
        <span key={mark} className="rail-break" aria-hidden="true" style={{ top: roundPercent(mark) }}>
          ≈
        </span>
      ))}
      <div
        className="cursor-track"
        ref={cursorTrackRef}
        style={{ transform: `translateY(${roundPercent(markers[0]?.percent ?? 0)})` }}
      >
        <div className="cursor" />
      </div>
      {ticks.map((tick, i) => (
        <div
          key={i}
          className={tick.major ? "tick maj" : "tick"}
          style={{ top: percent(tick.percent), width: tick.major ? 12 : 6 }}
        />
      ))}
      {placedPx && idealPx
        ? markers.map((marker, i) => {
            const shift = placedPx[i] - idealPx[i];
            // Sous 2 px, l'écart ne se voit pas : pas de trait.
            if (Math.abs(shift) < 2) return null;
            // Équerre fine : de la vraie position (sur l'échelle) jusqu'au repère déplacé.
            return (
              <span
                key={marker.key}
                className={shift > 0 ? "leader down" : "leader up"}
                style={cssVars(
                  { "--pc": marker.color },
                  { top: Math.min(idealPx[i], placedPx[i]), height: Math.abs(shift) },
                )}
              />
            );
          })
        : null}
      {markers.map((marker, i) => (
        <GoToLink
          key={marker.key}
          stop={marker.key}
          href={marker.href}
          style={cssVars(
            { "--pc": marker.color },
            { top: placedPx ? `${placedPx[i]}px` : percent(marker.percent) },
          )}
          aria-label={`${marker.name}, ${marker.sub}`}
          aria-current={marker.key === current ? "step" : undefined}
        >
          <span>
            {marker.name}
            <small>{marker.sub}</small>
          </span>
          <i />
        </GoToLink>
      ))}
    </nav>
  );
}
