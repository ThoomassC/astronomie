"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { INTL_LOCALE, type Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import { DAY_MS } from "@/lib/astro/constants";
import { eclipticLongitudeDeg, heliocentric, julianDate } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import {
  daylightFraction,
  formatDayLength,
  noonAltitudeDeg,
  northernSeason,
  solarDeclinationRad,
} from "@/lib/astro/seasons";
import { formatNumber } from "@/lib/format";
import { getClock } from "@/lib/sim/clock";
import { ModuleCanvas } from "./ModuleCanvas";
import { clamp, D2R, INK, TAU } from "./paint";
import { SEASONS_STRINGS } from "./seasons.strings";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import { useClockValue } from "./useClockValue";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 280, narrow: 1.08 };

/** Latitude de référence : Paris. */
const LATITUDE_DEG = 48.85;
/** Rafraîchissement de la ligne de lecture quand la date défile, en secondes. */
const READOUT_EVERY_S = 0.25;

export type SeasonsPlanet = "earth" | "uranus";

/** Réglages d'une planète ; ses textes, par langue, sont dans `SEASONS_STRINGS`. */
interface SeasonsConfig {
  /** Préfixe des id des commandes. */
  idPrefix: string;
  rangeMin: number;
  /** Borne haute et position du curseur avant de connaître la date simulée (rendu serveur). */
  rangeMaxInitial: number;
  rangeInitial: number;
  /** Hauteur de l'horizon pour la durée du jour, en degrés. */
  horizonDeg: number;
  /** Longitude héliocentrique de la planète à l'équinoxe de printemps boréal, en degrés. */
  equinoxLongitudeDeg(): number;
  /** Instant (ms) d'une position du curseur ; `nowMs` = date simulée du site. */
  fromRange(value: number, nowMs: number): number;
  toRange(ms: number): number;
  /** Borne haute du curseur pour l'instant `ms`. */
  rangeMax(ms: number): number;
  /** Début de la ligne de lecture, repris comme valeur lue du curseur. */
  when(ms: number, locale: Locale): string;
  /** Part du tour passée au soleil, hors jour et nuit polaires. */
  dayText(fraction: number, locale: Locale): string;
}

/** Formats « jour mois » créés une seule fois par langue : 29 octobre, 29 October, 29 de octubre. */
const dayMonthFormats = new Map<Locale, Intl.DateTimeFormat>();

function dayMonth(locale: Locale): Intl.DateTimeFormat {
  let format = dayMonthFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long" });
    dayMonthFormats.set(locale, format);
  }
  return format;
}

/** 1er janvier (heure locale) de l'année de `ms`. */
const yearStart = (ms: number) => new Date(new Date(ms).getFullYear(), 0, 1).getTime();

/** Nombre de jours de l'année civile de `ms` : 366 les années bissextiles. */
function daysInYear(ms: number): number {
  const year = new Date(ms).getFullYear();
  return Math.round((new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / DAY_MS);
}

const EARTH: SeasonsConfig = {
  idPrefix: "seasons-earth",
  rangeMin: 0,
  rangeMaxInitial: 364,
  rangeInitial: 299,
  horizonDeg: -0.833,
  // Vue du Soleil, la Terre est à l'opposé : longitude héliocentrique 180° à l'équinoxe de mars.
  equinoxLongitudeDeg: () => 180,
  fromRange: (value, nowMs) => yearStart(nowMs) + value * DAY_MS,
  toRange: (ms) => Math.floor((ms - yearStart(ms)) / DAY_MS),
  // Le 31 décembre reste atteignable les années bissextiles.
  rangeMax: (ms) => daysInYear(ms) - 1,
  when: (ms, locale) => dayMonth(locale).format(ms),
  dayText: formatDayLength,
};

/** Équinoxe d'Uranus du 7 décembre 2007. */
const URANUS_EQUINOX_MS = Date.UTC(2007, 11, 7);
/** Curseur en années civiles, sur une orbite de 84 ans depuis l'équinoxe de 2007. */
const URANUS_FIRST_YEAR = 2007;
const URANUS_LAST_YEAR = 2091;

const URANUS: SeasonsConfig = {
  idPrefix: "seasons-uranus",
  rangeMin: URANUS_FIRST_YEAR,
  rangeMaxInitial: URANUS_LAST_YEAR,
  rangeInitial: 2049,
  horizonDeg: 0,
  equinoxLongitudeDeg: () =>
    eclipticLongitudeDeg(heliocentric(PLANET_BY_KEY.uranus, julianDate(URANUS_EQUINOX_MS))),
  // Une année choisie est montrée en son milieu (1er juillet).
  fromRange: (year) => new Date(year, 6, 1).getTime(),
  toRange: (ms) => clamp(new Date(ms).getFullYear(), URANUS_FIRST_YEAR, URANUS_LAST_YEAR),
  rangeMax: () => URANUS_LAST_YEAR,
  when: (ms, locale) => SEASONS_STRINGS[locale].inYear(new Date(ms).getFullYear()),
  dayText: (fraction, locale) =>
    SEASONS_STRINGS[locale].sunlitShare(withUnit(formatNumber(fraction * 100, 0, locale), "percent", locale)),
};

const CONFIGS: Record<SeasonsPlanet, SeasonsConfig> = { earth: EARTH, uranus: URANUS };

/** Ligne de lecture, déjà écrite dans la langue, coupée autour du nom de la saison (en gras). */
interface SeasonsReadout {
  before: string;
  season: string;
  after: string;
}

/** État d'animation, hors React. */
interface SeasonsView {
  /** Copie de « Suivre la date du site », lue par le dessin et les gestionnaires. */
  following: boolean;
  /** Instant affiché, en ms. */
  ms: number;
  /** Temps écoulé depuis la dernière lecture, en secondes. */
  acc: number;
  /** Longitude à l'équinoxe, calculée au premier dessin. */
  equinoxDeg: number | null;
  rangeValue: number;
  rangeMax: number;
  readoutKey: string;
  /** Ligne de lecture en texte brut, pour les annonces. */
  readoutText: string;
}

/** Place le curseur sans passer par React (la date défile à chaque image). */
function showRange(input: HTMLInputElement | null, value: number, max: number, valueText: string): void {
  if (!input) return;
  input.max = String(max);
  input.value = String(value);
  input.setAttribute("aria-valuetext", valueText);
}

/**
 * 4 et 8. Les saisons (Terre, Uranus) : orbite vue du dessus, éclairement vu de côté,
 * durée du jour et hauteur du Soleil à la latitude de Paris.
 */
export function Seasons({ planet }: { planet: SeasonsPlanet }) {
  const locale = useLocale();
  const t = SEASONS_STRINGS[locale];
  const text = t[planet];
  const config = CONFIGS[planet];
  const body = PLANET_BY_KEY[planet];
  const [following, setFollowing] = useState(true);
  const [readout, setReadout] = useState<SeasonsReadout | null>(null);
  const clockPlaying = useClockValue((snapshot) => snapshot.playing, false);
  const { message, announce } = useAnnouncer();
  const rangeRef = useRef<HTMLInputElement>(null);
  const view = useRef<SeasonsView>({
    following: true,
    ms: 0,
    acc: 0,
    equinoxDeg: null,
    rangeValue: -1,
    rangeMax: -1,
    readoutKey: "",
    readoutText: "",
  });

  useEffect(() => {
    // Le rendu serveur ignore la date simulée : on la prend au montage, curseur compris.
    const s = view.current;
    s.ms = getClock().now();
    s.rangeValue = config.toRange(s.ms);
    s.rangeMax = config.rangeMax(s.ms);
    showRange(rangeRef.current, s.rangeValue, s.rangeMax, config.when(s.ms, locale));
  }, [config, locale]);

  const draw = ({ p, ctx: c, w, h, narrow, dt }: CanvasFrame) => {
    const s = view.current;
    if (s.following) {
      s.ms = getClock().now();
      const value = config.toRange(s.ms);
      const max = config.rangeMax(s.ms);
      if (value !== s.rangeValue || max !== s.rangeMax) {
        s.rangeValue = value;
        s.rangeMax = max;
        showRange(rangeRef.current, value, max, config.when(s.ms, locale));
      }
    }
    const equinoxDeg = (s.equinoxDeg ??= config.equinoxLongitudeDeg());
    const longitudeDeg = eclipticLongitudeDeg(heliocentric(body, julianDate(s.ms)));
    const sinceEquinoxDeg = (((longitudeDeg - equinoxDeg) % 360) + 360) % 360;
    const tilt = body.tiltDeg * D2R;
    const dec = solarDeclinationRad(body.tiltDeg, sinceEquinoxDeg);
    const phi = LATITUDE_DEG * D2R;
    c.clearRect(0, 0, w, h);

    // Vue du dessus (au-dessus de la vue de côté en largeur étroite).
    const ox = narrow ? w * 0.5 : w * 0.25;
    const oy = narrow ? h * 0.27 : h * 0.5;
    const R = narrow ? Math.min(w * 0.27, h * 0.17) : Math.min(w * 0.19, h * 0.36);
    c.strokeStyle = "rgba(194,163,107,.6)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(ox, oy, R, 0, TAU);
    c.stroke();
    const glow = c.createRadialGradient(ox, oy, 0, ox, oy, 14);
    glow.addColorStop(0, "#FFE2A8");
    glow.addColorStop(0.5, SUN.color);
    glow.addColorStop(1, "rgba(255,140,40,0)");
    c.fillStyle = glow;
    c.beginPath();
    c.arc(ox, oy, 14, 0, TAU);
    c.fill();
    text.marks.forEach((label, i) => {
      const a = (equinoxDeg + i * 90) * D2R;
      const x = ox + Math.cos(a) * R;
      const y = oy - Math.sin(a) * R;
      c.fillStyle = "rgba(194,163,107,.9)";
      c.fillRect(x - 1.5, y - 1.5, 3, 3);
      const lx = ox + Math.cos(a) * (R + 14);
      const ly = oy - Math.sin(a) * (R + 14);
      p.text(label, lx, ly + 4, {
        align: Math.abs(Math.cos(a)) < 0.3 ? "center" : Math.cos(a) > 0 ? "left" : "right",
        size: 10.5,
        color: INK.brume,
      });
    });
    const pa = longitudeDeg * D2R;
    const px = ox + Math.cos(pa) * R;
    const py = oy - Math.sin(pa) * R;
    const toSun = Math.atan2(oy - py, ox - px);
    p.dot(px, py, 7, "#16233F");
    c.beginPath();
    c.arc(px, py, 7, toSun - Math.PI / 2, toSun + Math.PI / 2);
    c.fillStyle = body.color;
    c.fill();
    // L'axe garde la même direction tout au long de l'orbite.
    const pole = (equinoxDeg + 270) * D2R;
    const len = 8 + 16 * Math.abs(Math.sin(tilt));
    const ux = Math.cos(pole);
    const uy = -Math.sin(pole);
    c.strokeStyle = INK.ivoire;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(px - ux * len, py - uy * len);
    c.lineTo(px + ux * len, py + uy * len);
    c.stroke();
    p.text(t.north, px + ux * (len + 7), py + uy * (len + 7) + 4, { align: "center", size: 10, weight: 700 });
    // Titres des vues : seuls sur leur ligne en largeur étroite, côte à côte sinon (chacun dans sa moitié).
    const captionWidth = narrow ? w - 16 : w * 0.46;
    p.text(t.topView, narrow ? 8 : ox, narrow ? 16 : h - 10, {
      align: narrow ? "left" : "center",
      size: 11,
      color: INK.brume,
      maxWidth: captionWidth,
    });

    // Vue de côté : le Soleil éclaire depuis la gauche.
    const gx = narrow ? w * 0.62 : w * 0.73;
    const gy = narrow ? h * 0.76 : h * 0.5;
    const gr = narrow ? Math.min(w * 0.18, h * 0.15) : Math.min(w * 0.15, h * 0.3);
    const ax0 = narrow ? w * 0.06 : w * 0.5;
    for (let i = -2; i <= 2; i++) {
      const yy = gy + i * gr * 0.42;
      c.strokeStyle = "rgba(255,181,71,.45)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(ax0, yy);
      c.lineTo(gx - gr - 10, yy);
      c.stroke();
      c.beginPath();
      c.moveTo(gx - gr - 10, yy);
      c.lineTo(gx - gr - 16, yy - 3);
      c.lineTo(gx - gr - 16, yy + 3);
      c.fillStyle = "rgba(255,181,71,.6)";
      c.fill();
    }
    p.text(t.sunlight, ax0, gy - gr - 12, { size: 11, color: INK.soleil, maxWidth: w - ax0 - 8 });
    p.dot(gx, gy, gr, body.color);
    c.save();
    c.beginPath();
    c.arc(gx, gy, gr, 0, TAU);
    c.clip();
    c.fillStyle = "rgba(6,11,24,.72)";
    c.fillRect(gx, gy - gr, gr, gr * 2);
    c.restore();
    const ax = -Math.sin(dec);
    const ay = -Math.cos(dec);
    const ex = Math.cos(dec);
    const ey = -Math.sin(dec);
    c.setLineDash([4, 4]);
    c.strokeStyle = INK.ivoire;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(gx - ax * gr * 1.35, gy - ay * gr * 1.35);
    c.lineTo(gx + ax * gr * 1.35, gy + ay * gr * 1.35);
    c.stroke();
    c.setLineDash([]);
    p.text(t.north, gx + ax * gr * 1.5, gy + ay * gr * 1.5 + 4, { align: "center", size: 11, weight: 700 });
    c.strokeStyle = "rgba(236,229,211,.35)";
    c.beginPath();
    c.moveTo(gx - ex * gr, gy - ey * gr);
    c.lineTo(gx + ex * gr, gy + ey * gr);
    c.stroke();
    // Le parallèle de la latitude, vu par la tranche : partie au jour, partie à la nuit.
    const cx2 = gx + ax * gr * Math.sin(phi);
    const cy2 = gy + ay * gr * Math.sin(phi);
    const hl = gr * Math.cos(phi);
    const x0 = cx2 - ex * hl;
    const y0 = cy2 - ey * hl;
    const x1 = cx2 + ex * hl;
    const y1 = cy2 + ey * hl;
    const tt = Math.abs(x1 - x0) < 1e-6 ? (x0 < gx ? 1 : 0) : clamp((gx - x0) / (x1 - x0), 0, 1);
    const splitX = x0 + (x1 - x0) * tt;
    const splitY = y0 + (y1 - y0) * tt;
    c.lineWidth = 3;
    c.strokeStyle = INK.soleil;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(splitX, splitY);
    c.stroke();
    c.strokeStyle = "#3B4A75";
    c.beginPath();
    c.moveTo(splitX, splitY);
    c.lineTo(x1, y1);
    c.stroke();
    p.text(text.latLabel, x1 + 8, y1 + 4, { size: 11, weight: 700 });
    p.text(t.sideView, narrow ? 8 : gx, h - 10, {
      align: narrow ? "left" : "center",
      size: 11,
      color: INK.brume,
      maxWidth: captionWidth,
    });

    // Ligne de lecture (non annoncée) : à chaque redessin ponctuel, et au plus toutes les 0,25 s en animation.
    s.acc += dt;
    if (dt === 0 || s.acc > READOUT_EVERY_S) {
      s.acc = 0;
      const fraction = daylightFraction(LATITUDE_DEG, dec, config.horizonDeg);
      const noonDeg = noonAltitudeDeg(LATITUDE_DEG, dec);
      const day =
        fraction >= 1 ? t.polarDay : fraction <= 0 ? t.polarNight : config.dayText(fraction, locale);
      const noon =
        noonDeg > 0 ? t.noonAbove(withUnit(formatNumber(noonDeg, 0, locale), "degree", locale)) : t.noonBelow;
      const [before, after] = t.line(config.when(s.ms, locale), text.latName, day, noon);
      const next: SeasonsReadout = { before, season: t.seasons[northernSeason(sinceEquinoxDeg)], after };
      const key = `${next.before}|${next.season}|${next.after}`;
      if (key !== s.readoutKey) {
        s.readoutKey = key;
        s.readoutText = `${next.before}${next.season}${next.after}`;
        setReadout(next);
      }
    }
  };
  const { canvas, invalidate } = useCanvasModule(SIZE, draw, {
    animating: following && clockPlaying,
    redrawOnClock: following,
  });

  /** Annonce la ligne de lecture une fois le geste terminé (après le calme). */
  const announceReadout = () => announce(() => view.current.readoutText);

  const toggleFollowing = () => {
    const s = view.current;
    s.following = !s.following;
    if (s.following) s.ms = getClock().now();
    setFollowing(s.following);
    invalidate();
    announceReadout();
  };

  const onRange = (event: ChangeEvent<HTMLInputElement>) => {
    const s = view.current;
    const value = Number(event.currentTarget.value);
    s.following = false;
    s.ms = config.fromRange(value, getClock().now());
    s.rangeValue = value;
    event.currentTarget.setAttribute("aria-valuetext", config.when(s.ms, locale));
    setFollowing(false);
    invalidate();
    announceReadout();
  };

  const prefix = config.idPrefix;
  return (
    <>
      <ModuleCanvas {...canvas} label={text.canvasLabel} />
      <div className="ctrls">
        <button
          className="chip"
          type="button"
          id={`${prefix}-sync`}
          aria-pressed={following}
          onClick={toggleFollowing}
        >
          {t.follow}
        </button>
        <label className="grow" htmlFor={`${prefix}-range`}>
          {`${text.rangeLabel} `}
          <input
            ref={rangeRef}
            id={`${prefix}-range`}
            type="range"
            min={config.rangeMin}
            max={config.rangeMaxInitial}
            step={1}
            defaultValue={config.rangeInitial}
            onChange={onRange}
          />
        </label>
      </div>
      <p className={`readout ${styles.reserve}`} id={`${prefix}-readout`} aria-live="off">
        {readout ? (
          <>
            {readout.before}
            <b>{readout.season}</b>
            {readout.after}
          </>
        ) : (
          "–"
        )}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
