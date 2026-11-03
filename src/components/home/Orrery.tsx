"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type TransitionEvent,
} from "react";
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
  glideLongitude,
  ORRERY_HALF_SIZE,
  ORRERY_ORBIT_UNITS,
  ORRERY_PLANET_RADIUS,
  ORRERY_SUN,
  orreryOrbit,
  orreryPlanets,
  SATURN_RING,
} from "@/lib/home/orrery";
import { placeOrreryLabels, type LabelSize, type PlacedLabel } from "@/lib/home/orreryLabels";
import { useReducedMotion } from "@/lib/sim/reducedMotion";
import { HOME_STRINGS } from "./home.strings";
import styles from "./Orrery.module.css";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
/** La date de génération s'écrit en temps universel : le serveur et le navigateur l'écrivent à l'identique. */
const GENERATED_DATE_FORMAT: Intl.DateTimeFormatOptions = { ...DATE_FORMAT, timeZone: "UTC" };

/** En deçà de cet écart (°) entre la génération et le chargement, rien ne glisse : les étiquettes viennent d'emblée. */
const GLIDE_MIN_DEG = 0.5;

/**
 * Durée du glissement (ms), passée au CSS (`--glide`) : c'est aussi la minuterie de secours qui le termine quand la
 * transition n'a pas lieu, donc pas de `transitionend`.
 */
const GLIDE_MS = 1200;

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

/** Jour de la génération, en temps universel, pour `<time dateTime>`. */
function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
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

interface PlanetMarkProps {
  planetKey: PlanetKey;
  /** Rayon dessiné de l'orbite, dans ]0, 1]. */
  orbit: number;
  /** Longitude de la planète (°), écrite à partir de celle de la génération quand elle glisse (`glideLongitude`). */
  longitudeDeg: number;
}

/**
 * Une planète posée sur son orbite : tournée de sa longitude autour du Soleil (l'origine du dessin), puis redressée
 * pour que l'anneau de Saturne garde son inclinaison. Quand la longitude change, la transition de `transform`
 * interpole chaque rotation : la planète glisse le long de son orbite, sans couper par la corde.
 */
function PlanetMark({ planetKey, orbit, longitudeDeg }: PlanetMarkProps) {
  // y vers le bas à l'écran : la longitude, comptée dans le sens direct, tourne dans le sens inverse des aiguilles.
  const turn = (-longitudeDeg).toFixed(3);
  const straighten = longitudeDeg.toFixed(3);
  const radius = (orbit * ORRERY_ORBIT_UNITS).toFixed(3);
  return (
    <g
      className={styles.planet}
      style={{ transform: `rotate(${turn}deg) translate(${radius}px) rotate(${straighten}deg)` }}
      data-planet={planetKey}
    >
      <PlanetShape
        planetKey={planetKey}
        radius={ORRERY_PLANET_RADIUS[planetKey]}
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

interface OrreryProps {
  /**
   * Instant où le serveur a produit la page (ms) : ses positions dessinent les planètes dès le HTML, et la ligne datée
   * le dit, jusqu'à ce que le script les fasse glisser vers celles du chargement.
   */
  generatedAt: number;
}

/**
 * Mini-planétaire de l'accueil : les huit planètes autour du Soleil, vues du dessus, dans leur vraie direction du jour,
 * sur des orbites compressées comme celles de la scène, dans une boîte de taille fixe : rien ne bouge autour.
 *
 * Le serveur dessine tout, aux positions du jour de la génération (`generatedAt`), daté de ce jour : la page n'est
 * jamais vide, même sans JavaScript ou avant l'hydratation, qui reprend ce rendu à l'identique. Juste après, les
 * planètes glissent le long de leurs orbites jusqu'à leurs positions du chargement (comme `HeroStamp`), en 1,2 s ; le
 * glissement s'achève avec la transition d'une planète (`transitionend`), ou au bout de 1,2 s si elle n'a pas lieu, et
 * alors seulement les étiquettes et leurs filets se montrent. En mouvement réduit, rien ne glisse, tout se pose
 * d'emblée. Monté dans le navigateur (navigation interne), le planétaire part des positions du chargement, sans glisser.
 *
 * Les étiquettes du dessin (HTML, cachées aux lecteurs d'écran) se posent une fois mesurées, sans se chevaucher : hors
 * du groupe intérieur, où Mercure, Vénus et la Terre se serrent, celles qu'il faut reporter au bout d'un filet de
 * laiton. La liste des planètes dit aux lecteurs d'écran où est chacune, comme l'heure d'un cadran ; elle ne se montre
 * (légende) que là où les étiquettes manquent. Aucune planète ne se reconnaît à sa seule couleur : nom, ordre des
 * orbites, anneau de Saturne.
 */
export function Orrery({ generatedAt }: OrreryProps) {
  const locale = useLocale();
  const t = HOME_STRINGS[locale];
  const titleId = useId();
  const dateId = useId();
  const glowId = useId();
  const loadedAt = useSyncExternalStore<number | null>(subscribeNever, readLoadTime, readServerLoadTime);
  // Rendu serveur et hydratation : `loadedAt` est nul, on montre la génération. Seul un planétaire hydraté depuis ce
  // HTML glisse ensuite ; monté dans le navigateur, il part des positions du chargement.
  const [fromServer] = useState(() => loadedAt === null);
  const shownAt = loadedAt ?? generatedAt;
  const planets = useMemo(() => orreryPlanets(julianDate(shownAt)), [shownAt]);
  const start = useMemo(() => (fromServer ? orreryPlanets(julianDate(generatedAt)) : null), [fromServer, generatedAt]);
  const forward = shownAt >= generatedAt;
  const longitudes = planets.map(({ longitudeDeg }, index) =>
    start ? glideLongitude(start[index].longitudeDeg, longitudeDeg, forward) : longitudeDeg,
  );
  // En mouvement réduit, la règle globale coupe la transition : les planètes sautent, rien n'est à attendre.
  const reducedMotion = useReducedMotion();
  const glides =
    start !== null &&
    !reducedMotion &&
    longitudes.some((longitude, index) => Math.abs(longitude - start[index].longitudeDeg) > GLIDE_MIN_DEG);
  const [glideOver, setGlideOver] = useState(false);
  const gliding = loadedAt !== null && glides && !glideOver;
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(INTL_LOCALE[locale], loadedAt === null ? GENERATED_DATE_FORMAT : DATE_FORMAT).format(
        shownAt,
      ),
    [loadedAt, shownAt, locale],
  );

  const boxRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<PlanetKey, HTMLSpanElement>());
  const [layout, setLayout] = useState<{ size: number; labels: readonly PlacedLabel[] } | null>(null);

  // Étiquettes du dessin, aux positions du chargement : mesurées dans le DOM et posées sans chevauchement, puis
  // reposées quand la boîte change de taille, que la police arrive ou que la langue change les textes.
  // Synchronisation avec la mise en page : jamais pendant le rendu, toujours à l'image suivante.
  useEffect(() => {
    const box = boxRef.current;
    if (loadedAt === null || !box) return;
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
  }, [loadedAt, planets, locale]);

  // Minuterie de secours du glissement : sans transition (page masquée pendant le glissement, mouvement réduit demandé
  // en route), `transitionend` ne vient jamais. Synchronisation avec une horloge, nettoyée au démontage.
  useEffect(() => {
    if (!gliding) return;
    const timer = window.setTimeout(() => setGlideOver(true), GLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [gliding]);

  // Le glissement s'achève avec la transition de la première planète : toutes ont la même durée.
  const endGlide = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.hasAttribute("data-planet")) setGlideOver(true);
  };

  const placed = new Map(layout?.labels.map((label) => [label.key, label]));
  const hours = new Map(planets.map((planet) => [planet.key, clockHour(planet.longitudeDeg)]));
  // Une étiquette sans place (texte très agrandi sur un petit dessin) : la légende se montre pour nommer les planètes.
  const missingLabel = layout !== null && layout.labels.length < planets.length;

  return (
    <div
      className={styles.orrery}
      style={cssVars({ "--glide": `${GLIDE_MS}ms` })}
      data-legend={missingLabel ? "" : undefined}
    >
      <figure className={styles.figure}>
        <div className={styles.box} ref={boxRef} data-glide={gliding ? "" : undefined} onTransitionEnd={endGlide}>
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
            {/* Étiquettes et filets sont posés aux positions d'arrivée : ils attendent la fin du glissement. */}
            {layout && !gliding ? <Leaders labels={layout.labels} size={layout.size} /> : null}
            {planets.map(({ key, orbit }, index) => (
              <PlanetMark key={key} planetKey={key} orbit={orbit} longitudeDeg={longitudes[index]} />
            ))}
          </svg>
          {loadedAt !== null ? (
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
                    data-placed={label && !gliding ? "" : undefined}
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
              <time dateTime={loadedAt === null ? utcDay(generatedAt) : localDay(loadedAt)}>{date}</time>
            </span>
          </p>
          <p className={styles.note}>{t.note}</p>
        </figcaption>
      </figure>
      <ul className={styles.legend} aria-label={t.legendWithPositions}>
        {PLANETS.map(({ key }) => {
          const name = bodyName(key, locale);
          const hour = hours.get(key);
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
