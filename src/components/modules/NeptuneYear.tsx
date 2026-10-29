"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import {
  decimalYear,
  MARS_YEAR_YEARS,
  NEPTUNE_DISCOVERY_YEAR,
  NEPTUNE_YEAR_YEARS,
  orbitFraction,
  parseBirthYear,
} from "@/lib/astro/neptune";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { getClock } from "@/lib/sim/clock";
import { COMMON_STRINGS, type Count } from "./common.strings";
import { ModuleCanvas } from "./ModuleCanvas";
import { NEPTUNE_YEAR_STRINGS } from "./neptuneYear.strings";
import { INK, TAU } from "./paint";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import { useClockValue } from "./useClockValue";
import { useNumberInput } from "./useNumberInput";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 270 };

const DEFAULT_BIRTH_YEAR = 2012;
const INPUT_ID = "neptune-year-birth";
const HINT_ID = "neptune-year-birth-hint";
const ERROR_ID = "neptune-year-birth-error";
/** Retrait de la piste intérieure qui montre ce qui dépasse un tour complet, en px. */
const EXTRA_TURN_INSET = 12;
/** Marge gardée au bord droit du canvas par les textes, en px. */
const EDGE = 8;

/** Année réelle (pas la date simulée du site) : borne de l'année de naissance. */
const currentYear = () => new Date().getFullYear();

/** Angle d'une année sur le cadran : 1846 en haut, un tour par année neptunienne, sens horaire. */
function dialAngle(year: number): number {
  const turns = (year - NEPTUNE_DISCOVERY_YEAR) / NEPTUNE_YEAR_YEARS;
  return -Math.PI / 2 + TAU * (((turns % 1) + 1) % 1);
}

/** Nombre à accorder, écrit avec `digits` décimales dans la langue. */
const countOf = (value: number, digits: number, locale: Locale): Count => ({
  value,
  text: formatNumber(value, digits, locale),
});

/** Part en pour cent, une décimale : « 9,0 % », « 9.0% ». */
const percentOf = (fraction: number, locale: Locale) => withUnit(formatNumber(fraction * 100, 1, locale), "percent", locale);

/** Tours de Neptune depuis sa découverte (0 si la date du site la précède). */
const turnsSinceDiscovery = (now: number) =>
  Math.max(0, orbitFraction(NEPTUNE_DISCOVERY_YEAR, now, NEPTUNE_YEAR_YEARS));

/** Ligne de lecture pour une naissance en `birthYear`, à la date du site `now` (année décimale). */
function lifeReadout(birthYear: number, now: number, locale: Locale): string {
  const t = NEPTUNE_YEAR_STRINGS[locale];
  if (birthYear > now) return t.notBorn;
  const life = orbitFraction(birthYear, now, NEPTUNE_YEAR_YEARS);
  const mars = countOf(orbitFraction(birthYear, now, MARS_YEAR_YEARS), 1, locale);
  if (life < 1) return t.beforeOneOrbit(birthYear, percentOf(life, locale), countOf(life, 2, locale), mars);
  return t.afterOneOrbit(birthYear, countOf(life, 2, locale), mars);
}

/** 9. Une seule année neptunienne : le cadran d'une orbite depuis 1846, et la part d'une vie. */
export function NeptuneYear() {
  const locale = useLocale();
  const t = NEPTUNE_YEAR_STRINGS[locale];
  /** Dernière année valide : l'affichage la garde pendant une saisie invalide. */
  const [birthYear, setBirthYear] = useState(DEFAULT_BIRTH_YEAR);
  const maxYear = useRef<number | null>(null);
  const { message, announce } = useAnnouncer();
  // La date du site peut défiler : lecture et texte du cadran suivent l'horloge, sans annonce.
  const readout = useClockValue((snapshot) => lifeReadout(birthYear, decimalYear(snapshot.ms), locale), null);
  const discovery = useClockValue(
    (snapshot) => t.discovery(countOf(turnsSinceDiscovery(decimalYear(snapshot.ms)), 2, locale)),
    null,
  );

  useEffect(() => {
    maxYear.current = currentYear();
  }, []);

  const field = useNumberInput(
    (raw) => parseBirthYear(raw, maxYear.current ?? currentYear()),
    (value) => {
      setBirthYear(value);
      announce(() => lifeReadout(value, decimalYear(getClock().now()), locale));
    },
    // Une saisie illisible reçoit la même phrase que hors bornes : elle dit quelle année saisir.
    (error) => {
      if (error.kind === "range") return t.error(error.min, error.max);
      return t.error(NEPTUNE_DISCOVERY_YEAR, maxYear.current ?? currentYear());
    },
  );

  const draw = ({ p, ctx: c, w, h }: CanvasFrame) => {
    const now = decimalYear(getClock().now());
    const born = birthYear <= now;
    const cx = w * 0.27;
    const cy = h * 0.56;
    const R = Math.min(w * 0.2, h * 0.36);
    c.clearRect(0, 0, w, h);

    c.strokeStyle = "rgba(194,163,107,.55)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, R, 0, TAU);
    c.stroke();
    // Graduations tous les 10 ans, plus longues tous les 50 ans.
    for (let year = NEPTUNE_DISCOVERY_YEAR; year < NEPTUNE_DISCOVERY_YEAR + NEPTUNE_YEAR_YEARS; year += 10) {
      const a = dialAngle(year);
      const tick = (year - NEPTUNE_DISCOVERY_YEAR) % 50 === 0 ? 9 : 4;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      c.lineTo(cx + Math.cos(a) * (R - tick), cy + Math.sin(a) * (R - tick));
      c.stroke();
    }
    p.dot(cx, cy, 8, SUN.color);

    const sinceDiscovery = turnsSinceDiscovery(now);
    const nowAngle = dialAngle(now);
    c.lineWidth = 3;
    c.strokeStyle = "rgba(88,120,232,.45)";
    c.beginPath();
    c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, sinceDiscovery));
    c.stroke();

    const life = born ? orbitFraction(birthYear, now, NEPTUNE_YEAR_YEARS) : 0;
    if (born) {
      const birthAngle = dialAngle(birthYear);
      c.strokeStyle = INK.soleil;
      c.lineWidth = 4;
      c.beginPath();
      if (life >= 1) c.arc(cx, cy, R, 0, TAU);
      else c.arc(cx, cy, R, birthAngle, birthAngle + TAU * life);
      c.stroke();
      if (life >= 1) {
        // Au-delà d'un tour complet, le reste se lit sur une piste intérieure.
        c.beginPath();
        c.arc(cx, cy, R - EXTRA_TURN_INSET, birthAngle, birthAngle + TAU * (life % 1));
        c.stroke();
      }
    }
    p.dot(cx + Math.cos(nowAngle) * R, cy + Math.sin(nowAngle) * R, 7, PLANET_BY_KEY.neptune.color);

    c.strokeStyle = "rgba(149,158,181,.6)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx, cy - R);
    c.lineTo(cx + R * 0.7, cy - R - 2);
    c.stroke();
    // Les textes s'arrêtent avant le bord droit, quelle que soit leur longueur dans la langue.
    const markX = cx + R * 0.7 + 6;
    p.text(t.discovered, markX, cy - R + 2, { size: 11.5, weight: 700, maxWidth: w - markX - EDGE });
    p.text(t.fullOrbit, markX, cy - R + 16, { size: 11, color: INK.brume, maxWidth: w - markX - EDGE });

    const tx = w * 0.62;
    const column = w - tx - EDGE;
    const lifeText = !born
      ? "–"
      : life < 1
        ? t.orbitShare(percentOf(life, locale))
        : t.orbits(countOf(life, 2, locale));
    p.text(t.yourLife, tx, h * 0.5, { size: 12, color: INK.soleil, weight: 700, maxWidth: column });
    p.text(lifeText, tx, h * 0.5 + 19, { size: 14, weight: 700, maxWidth: column });
    p.text(t.sinceDiscovery, tx, h * 0.78, { size: 12, color: "#7D97FF", weight: 700, maxWidth: column });
    p.text(t.turns(countOf(sinceDiscovery, 2, locale)), tx, h * 0.78 + 19, { size: 14, weight: 700, maxWidth: column });
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: false, redrawOnClock: true });

  return (
    <>
      <ModuleCanvas {...canvas} label={discovery ? `${t.canvasLabel}. ${discovery}` : t.canvasLabel} />
      <div className="ctrls">
        <label htmlFor={INPUT_ID}>
          {`${t.birthYear} `}
          <input
            id={INPUT_ID}
            className={styles.field}
            type="text"
            inputMode="numeric"
            autoComplete="bday-year"
            defaultValue={String(DEFAULT_BIRTH_YEAR)}
            aria-invalid={field.error !== null}
            aria-describedby={field.error ? `${ERROR_ID} ${HINT_ID}` : HINT_ID}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        </label>
        <span id={HINT_ID} className={styles.hint}>
          {COMMON_STRINGS[locale].example(String(NEPTUNE_DISCOVERY_YEAR), t.today)}
        </span>
      </div>
      <div id={ERROR_ID} className={styles.error} aria-live="polite">
        {field.error}
      </div>
      <p className={`readout ${styles.reserve}`} id="neptune-year-readout" aria-live="off">
        {readout ?? "–"}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
