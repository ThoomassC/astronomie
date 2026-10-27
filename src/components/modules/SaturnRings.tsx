"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { decimalYear } from "@/lib/astro/neptune";
import { ringOpeningDeg } from "@/lib/astro/saturn";
import { formatNumber } from "@/lib/format";
import { getClock } from "@/lib/sim/clock";
import { ModuleCanvas } from "./ModuleCanvas";
import { clamp, D2R, INK, TAU } from "./paint";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 250 };

const YEAR_MIN = 2010;
const YEAR_MAX = 2050;
/** Année du curseur avant de connaître la date simulée (rendu serveur). */
const INITIAL_YEAR = 2030;
/** Défilement automatique, en années par seconde (l'année affichée reste décimale, le curseur va par an). */
const YEARS_PER_S = 2.5;
/** Amplitude du modèle d'ouverture (`ringOpeningDeg`), pour normaliser la courbe de la frise. */
const OPENING_AMPLITUDE_DEG = 26.7;
/** En dessous de cette ouverture, les anneaux sont vus par la tranche. */
const EDGE_ON_DEG = 1.2;
const EDGE_ON_YEARS = [2025.2, 2039.9] as const;
const DECADES = [2010, 2020, 2030, 2040, 2050] as const;
/** Anneaux C, B et A : rayons intérieur et extérieur (en rayons de Saturne), opacité. */
const RINGS = [
  [1.24, 1.53, 0.3],
  [1.53, 1.95, 0.85],
  [2.03, 2.27, 0.6],
] as const;

const CANVAS_LABEL =
  "Saturne et l'ouverture de ses anneaux selon l'année, de 2010 à 2050. Les anneaux sont vus par la tranche en 2025, puis en 2039-2040 ; entre ces passages, ils s'ouvrent jusqu'à environ 27°.";

/** 7. Les anneaux de Saturne vus de la Terre : ouverture selon l'année, frise 2010-2050. */
export function SaturnRings() {
  const [running, setRunning] = useState(false);
  const [readout, setReadout] = useState("–");
  const { message, announce } = useAnnouncer();
  const rangeRef = useRef<HTMLInputElement>(null);
  /** Année affichée (décimale), année du curseur, dernière lecture transmise à React. */
  const view = useRef({ year: INITIAL_YEAR, sliderYear: INITIAL_YEAR, text: "–" });

  useEffect(() => {
    // Le module part de l'année simulée au chargement, inconnue au rendu serveur.
    const s = view.current;
    s.year = clamp(decimalYear(getClock().now()), YEAR_MIN, YEAR_MAX);
    s.sliderYear = Math.floor(s.year);
    if (rangeRef.current) rangeRef.current.value = String(s.sliderYear);
  }, []);

  const draw = ({ p, ctx: c, w, h, dt }: CanvasFrame) => {
    const s = view.current;
    if (running) {
      s.year += dt * YEARS_PER_S;
      if (s.year > YEAR_MAX) s.year = YEAR_MIN;
      const sliderYear = Math.floor(s.year);
      if (sliderYear !== s.sliderYear && rangeRef.current) {
        s.sliderYear = sliderYear;
        rangeRef.current.value = String(sliderYear);
      }
    }
    const opening = ringOpeningDeg(s.year);
    const north = opening > 0;
    const sinB = Math.sin(opening * D2R);
    const cx = w / 2;
    const cy = h * 0.42;
    const R = Math.min(w * 0.14, h * 0.26);
    const ry = R * 0.9;
    c.clearRect(0, 0, w, h);

    const ring = (from: number, to: number) => {
      for (const [inner, outer, alpha] of RINGS) {
        c.strokeStyle = `rgba(232,214,176,${alpha})`;
        c.lineWidth = (outer - inner) * R;
        const rr = ((inner + outer) / 2) * R;
        c.beginPath();
        c.ellipse(cx, cy, rr, Math.max(0.4, rr * Math.abs(sinB)), 0, from, to);
        c.stroke();
      }
    };
    // Moitié arrière des anneaux, la planète, puis la moitié avant.
    ring(north ? Math.PI : 0, north ? TAU : Math.PI);
    const body = c.createLinearGradient(0, cy - ry, 0, cy + ry);
    body.addColorStop(0, "#CDB27C");
    body.addColorStop(0.35, "#F0DFB4");
    body.addColorStop(0.55, "#D4B57A");
    body.addColorStop(1, "#B8955E");
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(cx, cy, R, ry, 0, 0, TAU);
    c.fill();
    ring(north ? 0 : Math.PI, north ? Math.PI : TAU);

    // Frise des années : hauteur = ouverture des anneaux.
    const L = 24;
    const Rr = w - 24;
    const ty = h - 30;
    const toX = (year: number) => L + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (Rr - L);
    c.strokeStyle = "rgba(194,163,107,.5)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(L, ty);
    c.lineTo(Rr, ty);
    c.stroke();
    c.beginPath();
    for (let year = YEAR_MIN; year <= YEAR_MAX; year += 0.25) {
      const yy = ty - (14 * Math.abs(ringOpeningDeg(year))) / OPENING_AMPLITUDE_DEG;
      if (year === YEAR_MIN) c.moveTo(toX(year), yy);
      else c.lineTo(toX(year), yy);
    }
    c.strokeStyle = "rgba(226,201,143,.7)";
    c.stroke();
    for (const year of DECADES) {
      p.text(String(year), toX(year), ty + 15, { align: "center", size: 10.5, color: INK.brume });
    }
    c.fillStyle = INK.brume;
    for (const year of EDGE_ON_YEARS) c.fillRect(toX(year) - 0.5, ty - 4, 1, 8);
    p.text("par la tranche", toX(EDGE_ON_YEARS[0]), ty - 20, { align: "center", size: 10, color: INK.brume });
    p.dot(toX(s.year), ty, 4.5, INK.soleil);
    const shownYear = Math.floor(s.year);
    p.text(String(shownYear), 16, 24, { weight: 700, size: 15 });

    // Ligne de lecture (non annoncée), réécrite seulement quand elle change.
    const tilt = Math.abs(opening);
    const next =
      tilt < EDGE_ON_DEG
        ? `${shownYear} : anneaux vus par la tranche, presque invisibles.`
        : `${shownYear} : anneaux ouverts d'environ ${formatNumber(tilt)}°, vus ${
            north ? "par-dessus (face nord)" : "par-dessous (face sud)"
          }.`;
    if (next !== s.text) {
      s.text = next;
      setReadout(next);
    }
  };
  const { canvas, invalidate } = useCanvasModule(SIZE, draw, { animating: running });

  /** Annonce la ligne de lecture une fois le geste terminé (après le calme). */
  const announceReadout = () => announce(() => view.current.text);

  const togglePlay = () => {
    const next = !running;
    setRunning(next);
    if (!next) announceReadout();
  };

  const onRange = (event: ChangeEvent<HTMLInputElement>) => {
    const s = view.current;
    s.year = Number(event.currentTarget.value);
    s.sliderYear = s.year;
    invalidate();
    announceReadout();
  };

  return (
    <>
      <ModuleCanvas {...canvas} label={CANVAS_LABEL} />
      <div className="ctrls">
        <button className="chip" type="button" id="saturn-rings-play" onClick={togglePlay}>
          {running ? "Pause" : "Faire défiler les années"}
        </button>
        <label className="grow" htmlFor="saturn-rings-year">
          {"Année "}
          <input
            ref={rangeRef}
            id="saturn-rings-year"
            type="range"
            min={YEAR_MIN}
            max={YEAR_MAX}
            step={1}
            defaultValue={INITIAL_YEAR}
            onChange={onRange}
          />
        </label>
      </div>
      <p className={`readout ${styles.reserve}`} id="saturn-rings-readout" aria-live="off">
        {readout}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
