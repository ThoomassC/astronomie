"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { COMMON_STRINGS } from "./common.strings";
import { ModuleCanvas } from "./ModuleCanvas";
import { INK, TAU } from "./paint";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import { VENUS_RACE_STRINGS } from "./venusRace.strings";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 236 };

const VENUS = PLANET_BY_KEY.venus;
/** Année de Vénus, en jours terrestres. */
const YEAR_DAYS = 224.7;
/** Rotation sidérale de Vénus (rétrograde), en jours terrestres. */
const ROTATION_DAYS = VENUS.rotationHours / 24;
/** Allure de la course, en jours par seconde. */
const DAYS_PER_S = 28;
/** Extinction de l'étiquette « Année bouclée », par seconde. */
const FLASH_FADE_PER_S = 0.8;

type Phase = "idle" | "running" | "paused" | "done";

/** Part d'un tour en pour cent entier, tronquée et plafonnée à 100 : « 92 % », « 92% ». */
const percent = (fraction: number, locale: Locale) =>
  withUnit(formatNumber(Math.floor(Math.min(1, fraction) * 100), 0, locale), "percent", locale);

/** Numéro du jour (entier) : « Jour 12 », « Day 12 ». */
const dayText = (days: number, locale: Locale) =>
  VENUS_RACE_STRINGS[locale].day(formatNumber(Math.floor(days), 0, locale));

/** État lu à la pause : le compteur de jours et les cadrans ne sont dessinés que sur le canvas. */
const pauseText = (days: number, locale: Locale) =>
  VENUS_RACE_STRINGS[locale].paused(
    dayText(days, locale),
    percent(days / YEAR_DAYS, locale),
    percent(days / ROTATION_DAYS, locale),
  );

/** 3. Vénus : l'année contre la rotation, sur deux cadrans menés par la même horloge. */
export function VenusRace() {
  const locale = useLocale();
  const t = VENUS_RACE_STRINGS[locale];
  const common = COMMON_STRINGS[locale];
  const playLabel: Record<Phase, string> = {
    idle: t.start,
    running: common.pause,
    paused: common.resume,
    done: common.restart,
  };
  const [phase, setPhase] = useState<Phase>("idle");
  /** L'étiquette « Année bouclée » s'estompe : l'animation continue jusqu'à son extinction. */
  const [flashing, setFlashing] = useState(false);
  const [readout, setReadout] = useState(() => `${dayText(0, locale)}.`);
  const { message, announce } = useAnnouncer();
  /** Jours écoulés, course en cours, opacité de l'étiquette « Année bouclée ». */
  const race = useRef({ days: 0, run: false, flash: 0 });

  const draw = ({ p, ctx: c, w, h, dt }: CanvasFrame) => {
    const s = race.current;
    if (s.run) {
      const before = s.days;
      s.days = Math.min(ROTATION_DAYS, s.days + dt * DAYS_PER_S);
      if (before < YEAR_DAYS && s.days >= YEAR_DAYS) {
        s.flash = 1;
        setFlashing(true);
        setReadout(t.yearReadout);
      }
      if (s.days >= ROTATION_DAYS) {
        s.run = false;
        setPhase("done");
        setReadout(t.rotationReadout);
        announce(t.rotationReadout);
      }
    }
    s.flash = Math.max(0, s.flash - dt * FLASH_FADE_PER_S);
    if (s.flash === 0 && flashing) setFlashing(false);

    const r = Math.min(w * 0.18, h * 0.3);
    const y = h * 0.44;
    const x1 = w * 0.27;
    const x2 = w * 0.73;
    // Les libellés de chaque cadran, centrés, tiennent dans l'écart entre les deux centres.
    const labelWidth = x2 - x1 - 12;
    c.clearRect(0, 0, w, h);
    const dial = (x: number, frac: number, label: string, sub: string, done: boolean) => {
      c.strokeStyle = "rgba(236,229,211,.12)";
      c.lineWidth = 8;
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.stroke();
      c.strokeStyle = done ? INK.soleil : VENUS.color;
      c.beginPath();
      c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, frac));
      c.stroke();
      p.text(label, x, y + r + 26, { align: "center", weight: 700, size: 12.5, maxWidth: labelWidth });
      p.text(sub, x, y + r + 42, { align: "center", size: 11.5, color: INK.brume, maxWidth: labelWidth });
      p.text(percent(frac, locale), x, y + r * 0.62, { align: "center", size: 12, color: INK.brume });
    };
    const yearFrac = s.days / YEAR_DAYS;
    const rotationFrac = s.days / ROTATION_DAYS;
    dial(x1, yearFrac, t.orbit, t.orbitDays, yearFrac >= 1);
    dial(x2, rotationFrac, t.spin, t.spinDays, rotationFrac >= 1);

    // À gauche : Vénus autour du Soleil.
    p.dot(x1, y, 7, SUN.color);
    const orbitAngle = -Math.PI / 2 + TAU * yearFrac;
    p.dot(x1 + Math.cos(orbitAngle) * r * 0.62, y + Math.sin(orbitAngle) * r * 0.62, 5.5, VENUS.color);
    c.strokeStyle = "rgba(194,163,107,.35)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x1, y, r * 0.62, 0, TAU);
    c.stroke();

    // À droite : Vénus sur elle-même, dans le sens rétrograde.
    p.dot(x2, y, r * 0.42, VENUS.color);
    const spinAngle = -Math.PI / 2 - TAU * rotationFrac;
    const handX = x2 + Math.cos(spinAngle) * r * 0.42;
    const handY = y + Math.sin(spinAngle) * r * 0.42;
    c.strokeStyle = INK.nuit;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(x2, y);
    c.lineTo(handX, handY);
    c.stroke();
    p.dot(handX, handY, 3.5, INK.soleil);

    p.text(dayText(s.days, locale), w / 2, 22, { align: "center", weight: 700, size: 14 });
    if (s.flash > 0) {
      c.globalAlpha = s.flash;
      p.text(t.yearDone, x1, y - r - 14, { align: "center", weight: 700, color: INK.soleil, maxWidth: labelWidth });
      c.globalAlpha = 1;
    }
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: phase === "running" || flashing });

  const togglePlay = () => {
    const s = race.current;
    if (s.days >= ROTATION_DAYS) s.days = 0;
    s.run = !s.run;
    setPhase(s.run ? "running" : s.days > 0 ? "paused" : "idle");
    if (!s.run) announce(pauseText(s.days, locale));
  };

  return (
    <>
      <ModuleCanvas {...canvas} label={t.canvasLabel} />
      <div className="ctrls">
        <button className="chip" type="button" id="venus-race-play" onClick={togglePlay}>
          {playLabel[phase]}
        </button>
      </div>
      <p className={`readout ${styles.reserve}`} id="venus-race-readout" aria-live="off">
        {readout}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
