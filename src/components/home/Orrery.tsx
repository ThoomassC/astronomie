"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cssVars } from "@/components/journey/cssVars";
import { useLocale } from "@/i18n/LocaleProvider";
import { INTL_LOCALE } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { julianDate } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY, PLANETS, SUN, type PlanetKey } from "@/lib/astro/planets";
import { pad2 } from "@/lib/format";
import {
  clockHour,
  EARTH_HALO_RADIUS,
  ORRERY_HALF_SIZE,
  ORRERY_ORBIT_UNITS,
  ORRERY_PLANET_RADIUS,
  ORRERY_SUN,
  orreryOrbit,
  orreryPlanets,
  SATURN_RING,
  type OrreryPlanet,
} from "@/lib/home/orrery";
import { placeOrreryLabels, type LabelSize, type PlacedLabel } from "@/lib/home/orreryLabels";
import { HOME_STRINGS } from "./home.strings";
import styles from "./Orrery.module.css";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

const subscribeNever = () => () => {};
/** Instant du chargement de la page (origine des temps du navigateur) : stable, sans lire l'heure courante. */
const readLoadTime = () => performance.timeOrigin;
const readServerLoadTime = () => null;

const VIEW_BOX = `${-ORRERY_HALF_SIZE} ${-ORRERY_HALF_SIZE} ${2 * ORRERY_HALF_SIZE} ${2 * ORRERY_HALF_SIZE}`;

/** Orbites, dessinées dès le serveur : un cercle par planète, de Mercure à Neptune. */
const ORBITS = PLANETS.map((planet) => ({
  key: planet.key,
  radius: (orreryOrbit(planet.elements[0]) * ORRERY_ORBIT_UNITS).toFixed(3),
}));

/** Jour local du chargement, pour `<time dateTime>` : « 2026-10-29 ». */
function localDay(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Moitié de l'anneau de Saturne : celle de derrière se dessine avant le disque, celle de devant après lui, si bien que
 * l'anneau passe devant la planète en bas et derrière elle en haut.
 */
function SaturnRing({ rx, ry, half }: { rx: number; ry: number; half: "back" | "front" }) {
  return (
    <path
      className={styles.ring}
      stroke={PLANET_BY_KEY.saturn.color}
      transform={`rotate(${SATURN_RING.tiltDeg})`}
      d={`M ${-rx} 0 A ${rx} ${ry} 0 0 ${half === "back" ? 1 : 0} ${rx} 0`}
      data-ring={half === "front" ? "" : undefined}
    />
  );
}

interface PlanetShapeProps {
  planetKey: PlanetKey;
  /** Rayon du disque, en unités du dessin qui le porte. */
  radius: number;
  /** Demi-axes de l'anneau de Saturne. */
  ring: { rx: number; ry: number };
  /** Rayon de l'anneau « vous êtes ici » de la Terre. */
  halo: number;
}

/** Disque d'une planète et ses formes propres : l'anneau de Saturne, l'anneau « vous êtes ici » de la Terre. */
function PlanetShape({ planetKey, radius, ring, halo }: PlanetShapeProps) {
  return (
    <>
      {planetKey === "saturn" ? <SaturnRing rx={ring.rx} ry={ring.ry} half="back" /> : null}
      <circle className={styles.disk} r={radius} fill={PLANET_BY_KEY[planetKey].color} />
      {planetKey === "saturn" ? <SaturnRing rx={ring.rx} ry={ring.ry} half="front" /> : null}
      {planetKey === "earth" ? <circle className={styles.here} r={halo} data-here="" /> : null}
    </>
  );
}

/** Une planète posée sur le dessin, qui apparaît en fondu, de l'orbite intérieure vers l'extérieure (`--i`). */
function PlanetMark({ planet, index }: { planet: OrreryPlanet; index: number }) {
  const x = (planet.x * ORRERY_ORBIT_UNITS).toFixed(3);
  const y = (-planet.y * ORRERY_ORBIT_UNITS).toFixed(3);
  return (
    <g
      className={styles.planet}
      transform={`translate(${x} ${y})`}
      style={cssVars({ "--i": String(index) })}
      data-planet={planet.key}
    >
      <PlanetShape
        planetKey={planet.key}
        radius={ORRERY_PLANET_RADIUS[planet.key]}
        ring={SATURN_RING}
        halo={EARTH_HALO_RADIUS}
      />
    </g>
  );
}

/**
 * Filets de laiton des étiquettes reportées hors du groupe intérieur, du bord de l'astre au bord de son étiquette. La
 * pose les donne en px du dessin mesuré (`size`) : ils passent ici en unités du viewBox, centré sur le Soleil.
 */
function Leaders({ labels, size }: { labels: readonly PlacedLabel[]; size: number }) {
  const toUnits = (px: number) => ((px / size) * 2 - 1) * ORRERY_HALF_SIZE;
  return (
    <g className={styles.leaders}>
      {labels.map(({ key, leader }) =>
        leader ? (
          <line
            key={key}
            x1={toUnits(leader.x1).toFixed(3)}
            y1={toUnits(leader.y1).toFixed(3)}
            x2={toUnits(leader.x2).toFixed(3)}
            y2={toUnits(leader.y2).toFixed(3)}
            data-leader={key}
          />
        ) : null,
      )}
    </g>
  );
}

/** Pastille de la légende : la couleur de la planète, et ses formes du dessin (anneaux). */
function LegendMark({ planetKey }: { planetKey: PlanetKey }) {
  return (
    <svg className={styles.mark} viewBox="-9 -9 18 18" aria-hidden="true">
      <PlanetShape planetKey={planetKey} radius={5} ring={{ rx: 8, ry: 2.5 }} halo={7.6} />
    </svg>
  );
}

/**
 * Mini-planétaire de l'accueil : les huit planètes autour du Soleil, vues du dessus, dans leur vraie direction du jour,
 * sur des orbites compressées comme celles de la scène. Le serveur dessine les orbites, le Soleil, la légende et une
 * date « – » ; les planètes se posent à l'hydratation, à l'heure du chargement (comme `HeroStamp`), dans une boîte de
 * taille fixe : rien ne bouge autour. Les étiquettes du dessin (HTML, cachées aux lecteurs d'écran) se posent une fois
 * mesurées, sans se chevaucher : hors du groupe intérieur, où Mercure, Vénus et la Terre se serrent, celles qu'il faut
 * reporter au bout d'un filet de laiton. La légende nomme toujours les huit planètes et dit aux lecteurs d'écran où est
 * chacune, comme l'heure d'un cadran. Aucune planète ne se reconnaît à sa seule couleur : nom, ordre des orbites,
 * anneau de Saturne.
 */
export function Orrery() {
  const locale = useLocale();
  const t = HOME_STRINGS[locale];
  const titleId = useId();
  const dateId = useId();
  const glowId = useId();
  const loadedAt = useSyncExternalStore<number | null>(subscribeNever, readLoadTime, readServerLoadTime);
  const planets = useMemo(() => (loadedAt === null ? null : orreryPlanets(julianDate(loadedAt))), [loadedAt]);
  const date = useMemo(
    () => (loadedAt === null ? null : new Intl.DateTimeFormat(INTL_LOCALE[locale], DATE_FORMAT).format(loadedAt)),
    [loadedAt, locale],
  );

  const boxRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<PlanetKey, HTMLSpanElement>());
  const [layout, setLayout] = useState<{ size: number; labels: readonly PlacedLabel[] } | null>(null);

  // Étiquettes du dessin : mesurées dans le DOM et posées sans chevauchement, puis reposées quand la boîte change de
  // taille, que la police arrive ou que la langue change les textes. Synchronisation avec la mise en page : jamais
  // pendant le rendu, toujours à l'image suivante.
  useEffect(() => {
    const box = boxRef.current;
    if (!planets || !box) return;
    let frame = 0;
    let alive = true;
    const place = () => {
      const size = box.clientWidth;
      if (size === 0) return;
      const sizes: Partial<Record<PlanetKey, LabelSize>> = {};
      labelRefs.current.forEach((element, key) => {
        sizes[key] = { width: element.offsetWidth, height: element.offsetHeight };
      });
      setLayout({ size, labels: placeOrreryLabels(planets, size, sizes) });
    };
    const schedule = () => {
      if (!alive) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    if (observer) observer.observe(box);
    else schedule();
    // La promesse des polices ne s'annule pas : après le démontage, `alive` la rend sans effet.
    void document.fonts?.ready.then(schedule);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [planets, locale]);

  const placed = new Map(layout?.labels.map((label) => [label.key, label]));
  const hours = planets ? new Map(planets.map((planet) => [planet.key, clockHour(planet.longitudeDeg)])) : null;
  // Une étiquette sans place (texte très agrandi sur un petit dessin) : la légende se montre pour nommer les planètes.
  const missingLabel = layout !== null && planets !== null && layout.labels.length < planets.length;

  return (
    <div className={styles.orrery} data-legend={missingLabel ? "" : undefined}>
      <figure className={styles.figure}>
        <div className={styles.box} ref={boxRef}>
          <svg className={styles.drawing} viewBox={VIEW_BOX} role="img" aria-labelledby={`${titleId} ${dateId}`}>
            <title id={titleId}>{t.orreryTitle}</title>
            <defs>
              <radialGradient id={glowId}>
                <stop offset="0" stopColor={SUN.color} stopOpacity={0.35} />
                <stop offset="1" stopColor={SUN.color} stopOpacity={0} />
              </radialGradient>
            </defs>
            <g className={styles.orbits}>
              {ORBITS.map(({ key, radius }) => (
                <circle key={key} r={radius} data-orbit={key} />
              ))}
            </g>
            <circle r={ORRERY_SUN.glow} fill={`url(#${glowId})`} />
            <circle r={ORRERY_SUN.radius} fill={SUN.color} />
            {layout ? <Leaders labels={layout.labels} size={layout.size} /> : null}
            {planets?.map((planet, index) => <PlanetMark key={planet.key} planet={planet} index={index} />)}
          </svg>
          {planets ? (
            <div className={styles.labels} aria-hidden="true">
              {planets.map(({ key }) => {
                const label = layout ? placed.get(key) : undefined;
                return (
                  <span
                    key={key}
                    className={styles.label}
                    ref={(element) => {
                      if (!element) return;
                      labelRefs.current.set(key, element);
                      return () => {
                        labelRefs.current.delete(key);
                      };
                    }}
                    style={
                      label && layout
                        ? { left: `${(label.left / layout.size) * 100}%`, top: `${(label.top / layout.size) * 100}%` }
                        : undefined
                    }
                    data-placed={label ? "" : undefined}
                  >
                    {key === "earth" ? t.here : bodyName(key, locale)}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        <figcaption className={styles.caption}>
          <p className={styles.date} id={dateId} data-date="">
            <i aria-hidden="true" />
            <span>{t.datedLead}</span>{" "}
            <span className={styles.reserve} data-reserve={t.dateReserve}>
              {loadedAt !== null && date ? <time dateTime={localDay(loadedAt)}>{date}</time> : <span>–</span>}
            </span>
          </p>
          <p className={styles.note}>{t.note}</p>
        </figcaption>
      </figure>
      <ul className={styles.legend} aria-label={hours ? t.legendWithPositions : t.legend}>
        {PLANETS.map(({ key }) => {
          const name = bodyName(key, locale);
          const hour = hours?.get(key);
          return (
            <li key={key}>
              <LegendMark planetKey={key} />
              {key === "earth" ? t.earthInLegend(name) : name}
              {hour === undefined ? null : <span className="sr">, {t.clock(hour)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
