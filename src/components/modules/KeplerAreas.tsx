"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { AU_KM } from "@/lib/astro/constants";
import { solveKepler } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { useReducedMotion } from "@/lib/sim/reducedMotion";
import { KEPLER_STRINGS } from "./kepler.strings";
import { ModuleCanvas } from "./ModuleCanvas";
import { INK, TAU } from "./paint";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 300 };

const MERCURY = PLANET_BY_KEY.mercury;
const ECCENTRICITY = MERCURY.elements[1];
/** Demi-grand axe de Mercure, en km. */
const SEMI_MAJOR_KM = MERCURY.elements[0] * AU_KM;
/** Paramètre gravitationnel du Soleil GM, en km³/s². */
const GM_SUN = 1.32712440018e11;
/** 88 jours en 11 secteurs : 8 jours chacun. */
const SECTORS = 11;
/** Points calculés sur l'arc de chaque secteur. */
const ARC_STEPS = 24;
/** Durée d'une orbite animée, en secondes. */
const ORBIT_S = 8.8;
/** Rafraîchissement de la ligne de lecture (non annoncée) pendant l'animation, en secondes. */
const READOUT_EVERY_S = 0.3;
/** Marge des textes au bord du canvas, et écart entre les repères du périhélie et de l'aphélie, en px. */
const EDGE = 14;
const LABEL_GAP = 8;

/** Anomalie excentrique, distance au Soleil (km) et vitesse (km/s, vis-viva) de Mercure. */
function orbitAt(meanAnomaly: number) {
  const ea = solveKepler(meanAnomaly, ECCENTRICITY);
  const r = SEMI_MAJOR_KM * (1 - ECCENTRICITY * Math.cos(ea));
  const v = Math.sqrt(GM_SUN * (2 / r - 1 / SEMI_MAJOR_KM));
  return { ea, r, v };
}

const speedText = (v: number, locale: Locale) => `${formatNumber(v, 1, locale)} km/s`;
/** Distance en millions de km, une décimale. */
const distanceText = (r: number, locale: Locale) => formatNumber(r / 1e6, 1, locale);
const readoutText = (v: number, r: number, locale: Locale) =>
  KEPLER_STRINGS[locale].readout(speedText(v, locale), distanceText(r, locale));

/** 2. La loi des aires (Mercure) : secteurs balayés en des temps égaux, vitesse sur l'orbite. */
export function KeplerAreas() {
  const locale = useLocale();
  const t = KEPLER_STRINGS[locale];
  const reduced = useReducedMotion();
  /** Choix explicite de la personne ; sans choix, l'animation tourne sauf si elle demande moins de mouvement. */
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const playing = playChoice ?? !reduced;
  const [areas, setAreas] = useState(true);
  // Mercure part du périhélie : la lecture initiale est connue dès le rendu.
  const [readout, setReadout] = useState(() => {
    const { r, v } = orbitAt(0);
    return readoutText(v, r, locale);
  });
  /** Anomalie moyenne (rad), temps écoulé depuis la dernière lecture, dernière lecture transmise. */
  const orbit = useRef({ meanAnomaly: 0, acc: 0, text: "" });

  const draw = ({ p, ctx: c, w, h, dt }: CanvasFrame) => {
    const s = orbit.current;
    if (playing) s.meanAnomaly = (s.meanAnomaly + (dt * TAU) / ORBIT_S) % TAU;
    const e = ECCENTRICITY;
    const A = Math.min(w * 0.3, h * 0.36);
    const B = A * Math.sqrt(1 - e * e);
    const cx = w * 0.5 - A * e * 0.5;
    const cy = h * 0.53;
    const sunX = cx + A * e;
    const pointX = (ea: number) => cx + A * Math.cos(ea);
    const pointY = (ea: number) => cy - B * Math.sin(ea);
    c.clearRect(0, 0, w, h);

    if (areas) {
      for (let k = 0; k < SECTORS; k++) {
        const m0 = (k * TAU) / SECTORS;
        const m1 = ((k + 1) * TAU) / SECTORS;
        const current = s.meanAnomaly >= m0 && s.meanAnomaly < m1;
        const end = current ? s.meanAnomaly : m1;
        c.beginPath();
        c.moveTo(sunX, cy);
        for (let j = 0; j <= ARC_STEPS; j++) {
          const ea = solveKepler(m0 + ((end - m0) * j) / ARC_STEPS, e);
          c.lineTo(pointX(ea), pointY(ea));
        }
        c.closePath();
        c.fillStyle = current ? "rgba(255,181,71,.32)" : k % 2 ? "rgba(181,173,163,.22)" : "rgba(181,173,163,.1)";
        c.fill();
      }
      // Filet clair entre secteurs voisins : contraste d'au moins 3:1 avec les deux teintes.
      c.strokeStyle = "rgba(236,229,211,.6)";
      c.lineWidth = 1;
      c.beginPath();
      for (let k = 0; k < SECTORS; k++) {
        const ea = solveKepler((k * TAU) / SECTORS, e);
        c.moveTo(sunX, cy);
        c.lineTo(pointX(ea), pointY(ea));
      }
      c.stroke();
    }

    c.strokeStyle = "rgba(194,163,107,.7)";
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(cx, cy, A, B, 0, 0, TAU);
    c.stroke();
    const glow = c.createRadialGradient(sunX, cy, 0, sunX, cy, 16);
    glow.addColorStop(0, "#FFE2A8");
    glow.addColorStop(0.45, SUN.color);
    glow.addColorStop(1, "rgba(255,140,40,0)");
    c.fillStyle = glow;
    c.beginPath();
    c.arc(sunX, cy, 16, 0, TAU);
    c.fill();

    // Position de Mercure et vecteur vitesse, tangent à l'orbite.
    const { ea, r, v } = orbitAt(s.meanAnomaly);
    const px = pointX(ea);
    const py = pointY(ea);
    const tx = -A * Math.sin(ea);
    const ty = -B * Math.cos(ea);
    const tl = Math.hypot(tx, ty);
    const arrow = v * 1.15;
    c.strokeStyle = INK.soleil;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + (tx / tl) * arrow, py + (ty / tl) * arrow);
    c.stroke();
    p.dot(px, py, 6, MERCURY.color);

    c.strokeStyle = "rgba(149,158,181,.5)";
    c.lineWidth = 1;
    c.setLineDash([2, 3]);
    c.beginPath();
    c.moveTo(w - 14, 46);
    c.lineTo(cx + A, cy);
    c.moveTo(14, 46);
    c.lineTo(cx - A, cy);
    c.stroke();
    c.setLineDash([]);
    // Périhélie à droite, aphélie à gauche, sur les mêmes lignes : chacun garde sa moitié du canvas.
    const half = w / 2 - EDGE - LABEL_GAP / 2;
    p.text(t.perihelion, w - EDGE, 18, { size: 11.5, weight: 700, align: "right", maxWidth: half });
    p.text(t.perihelionValues, w - EDGE, 33, { size: 11, color: INK.brume, align: "right", maxWidth: half });
    p.text(t.aphelion, EDGE, 18, { size: 11.5, weight: 700, maxWidth: half });
    p.text(t.aphelionValues, EDGE, 33, { size: 11, color: INK.brume, maxWidth: half });

    const speed = speedText(v, locale);
    p.text(speed, EDGE, h - 14, { weight: 700, size: 14, color: INK.soleil });
    // La police du texte précédent est encore appliquée : la mesure est juste.
    const distanceX = EDGE + c.measureText(speed).width + 26;
    p.text(t.distance(distanceText(r, locale)), distanceX, h - 14, {
      size: 12,
      color: INK.brume,
      maxWidth: w - EDGE - distanceX,
    });

    s.acc += dt;
    if (dt === 0 || s.acc > READOUT_EVERY_S) {
      s.acc = 0;
      const next = readoutText(v, r, locale);
      if (next !== s.text) {
        s.text = next;
        setReadout(next);
      }
    }
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: playing });

  return (
    <>
      <ModuleCanvas {...canvas} label={t.canvasLabel} />
      <div className="ctrls">
        <button className="chip" type="button" id="kepler-play" onClick={() => setPlayChoice(!playing)}>
          {playing ? t.pause : t.play}
        </button>
        <button
          className="chip"
          type="button"
          id="kepler-areas"
          aria-pressed={areas}
          onClick={() => setAreas((shown) => !shown)}
        >
          {t.areas}
        </button>
      </div>
      <p className={`readout ${styles.reserve}`} id="kepler-readout" aria-live="off">
        {readout}
      </p>
    </>
  );
}
