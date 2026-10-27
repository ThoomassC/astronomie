"use client";

import { useEffect, useRef, useState } from "react";
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
import { ModuleCanvas } from "./ModuleCanvas";
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
const CANVAS_LABEL = "Cadran de l'orbite de Neptune de 1846 à 2011";
/** Retrait de la piste intérieure qui montre ce qui dépasse un tour complet, en px. */
const EXTRA_TURN_INSET = 12;

/** Année réelle (pas la date simulée du site) : borne de l'année de naissance. */
const currentYear = () => new Date().getFullYear();

/** Angle d'une année sur le cadran : 1846 en haut, un tour par année neptunienne, sens horaire. */
function dialAngle(year: number): number {
  const turns = (year - NEPTUNE_DISCOVERY_YEAR) / NEPTUNE_YEAR_YEARS;
  return -Math.PI / 2 + TAU * (((turns % 1) + 1) % 1);
}

/** « 1,07 tour », « 2,03 tours » : singulier en dessous de 2. */
function count(value: number, singular: string, plural: string): string {
  return `${formatNumber(value, 2)} ${value >= 2 ? plural : singular}`;
}

/** Tours de Neptune depuis sa découverte (0 si la date du site la précède). */
const turnsSinceDiscovery = (now: number) =>
  Math.max(0, orbitFraction(NEPTUNE_DISCOVERY_YEAR, now, NEPTUNE_YEAR_YEARS));

/** Ligne de lecture pour une naissance en `birthYear`, à la date du site `now` (année décimale). */
function lifeReadout(birthYear: number, now: number): string {
  if (birthYear > now) return "La date du site est antérieure à votre naissance.";
  const life = orbitFraction(birthYear, now, NEPTUNE_YEAR_YEARS);
  const mars = formatNumber(orbitFraction(birthYear, now, MARS_YEAR_YEARS), 1);
  if (life < 1) {
    return `Depuis ${birthYear}, Neptune a parcouru ${formatNumber(life * 100, 1)} % de son orbite. Sur Neptune, vous n'auriez pas encore un an : ${formatNumber(life, 2)} année neptunienne. Sur Mars, vous auriez ${mars} ans.`;
  }
  return `Depuis ${birthYear}, Neptune a fait plus d'un tour du Soleil. Sur Neptune, vous auriez ${count(life, "année neptunienne", "années neptuniennes")}. Sur Mars, vous auriez ${mars} ans.`;
}

/** 9. Une seule année neptunienne : le cadran d'une orbite depuis 1846, et la part d'une vie. */
export function NeptuneYear() {
  /** Dernière année valide : l'affichage la garde pendant une saisie invalide. */
  const [birthYear, setBirthYear] = useState(DEFAULT_BIRTH_YEAR);
  const maxYear = useRef<number | null>(null);
  const { message, announce } = useAnnouncer();
  // La date du site peut défiler : lecture et texte du cadran suivent l'horloge, sans annonce.
  const readout = useClockValue((snapshot) => lifeReadout(birthYear, decimalYear(snapshot.ms)), null);
  const discovery = useClockValue(
    (snapshot) =>
      `Depuis sa découverte, Neptune a fait ${count(turnsSinceDiscovery(decimalYear(snapshot.ms)), "tour", "tours")} du Soleil.`,
    null,
  );

  useEffect(() => {
    maxYear.current = currentYear();
  }, []);

  const field = useNumberInput(
    (raw) => parseBirthYear(raw, maxYear.current ?? currentYear()),
    (value) => {
      setBirthYear(value);
      announce(() => lifeReadout(value, decimalYear(getClock().now())));
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
    p.text("1846, découverte", cx + R * 0.7 + 6, cy - R + 2, { size: 11.5, weight: 700 });
    p.text("2011, un tour complet", cx + R * 0.7 + 6, cy - R + 16, { size: 11, color: INK.brume });

    const tx = w * 0.62;
    const lifeText = !born
      ? "–"
      : life < 1
        ? `${formatNumber(life * 100, 1)} % d'une orbite`
        : count(life, "orbite", "orbites");
    p.text("Votre vie", tx, h * 0.5, { size: 12, color: INK.soleil, weight: 700 });
    p.text(lifeText, tx, h * 0.5 + 19, { size: 14, weight: 700 });
    p.text("Depuis la découverte", tx, h * 0.78, { size: 12, color: "#7D97FF", weight: 700 });
    p.text(count(sinceDiscovery, "tour", "tours"), tx, h * 0.78 + 19, { size: 14, weight: 700 });
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: false, redrawOnClock: true });

  return (
    <>
      <ModuleCanvas {...canvas} label={discovery ? `${CANVAS_LABEL}. ${discovery}` : CANVAS_LABEL} />
      <div className="ctrls">
        <label htmlFor={INPUT_ID}>
          {"Année de naissance "}
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
          {`exemple, modifiable (de ${NEPTUNE_DISCOVERY_YEAR} à aujourd'hui)`}
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
