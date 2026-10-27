"use client";

import { useRef, useState } from "react";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { ModuleCanvas } from "./ModuleCanvas";
import { INK, TAU } from "./paint";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
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
const PLAY_LABEL: Record<Phase, string> = {
  idle: "Lancer la course",
  running: "Pause",
  paused: "Reprendre",
  done: "Relancer",
};

const YEAR_READOUT = "Jour 224,7 : l'année de Vénus est bouclée. Sa rotation n'en est qu'à 92 %.";
const ROTATION_READOUT =
  "Jour 243 : Vénus a enfin fait un tour sur elle-même. Son jour sidéral dure plus longtemps que son année. Du lever au lever du Soleil, il s'écoule 117 jours.";

const percent = (fraction: number) => Math.floor(Math.min(1, fraction) * 100);

/** État lu à la pause : le compteur de jours et les cadrans ne sont dessinés que sur le canvas. */
const pauseText = (days: number) =>
  `Jour ${formatNumber(Math.floor(days))} : ${percent(days / YEAR_DAYS)} % du tour du Soleil, ${percent(
    days / ROTATION_DAYS,
  )} % du tour sur elle-même.`;

/** 3. Vénus : l'année contre la rotation, sur deux cadrans menés par la même horloge. */
export function VenusRace() {
  const [phase, setPhase] = useState<Phase>("idle");
  /** L'étiquette « Année bouclée » s'estompe : l'animation continue jusqu'à son extinction. */
  const [flashing, setFlashing] = useState(false);
  const [readout, setReadout] = useState("Jour 0.");
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
        setReadout(YEAR_READOUT);
      }
      if (s.days >= ROTATION_DAYS) {
        s.run = false;
        setPhase("done");
        setReadout(ROTATION_READOUT);
        announce(ROTATION_READOUT);
      }
    }
    s.flash = Math.max(0, s.flash - dt * FLASH_FADE_PER_S);
    if (s.flash === 0 && flashing) setFlashing(false);

    const r = Math.min(w * 0.18, h * 0.3);
    const y = h * 0.44;
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
      p.text(label, x, y + r + 26, { align: "center", weight: 700, size: 12.5 });
      p.text(sub, x, y + r + 42, { align: "center", size: 11.5, color: INK.brume });
      p.text(`${percent(frac)} %`, x, y + r * 0.62, { align: "center", size: 12, color: INK.brume });
    };
    const x1 = w * 0.27;
    const x2 = w * 0.73;
    const yearFrac = s.days / YEAR_DAYS;
    const rotationFrac = s.days / ROTATION_DAYS;
    dial(x1, yearFrac, "Un tour du Soleil", "224,7 jours", yearFrac >= 1);
    dial(x2, rotationFrac, "Un tour sur elle-même", "243 jours, dans l’autre sens", rotationFrac >= 1);

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

    p.text(`Jour ${formatNumber(Math.floor(s.days))}`, w / 2, 22, { align: "center", weight: 700, size: 14 });
    if (s.flash > 0) {
      c.globalAlpha = s.flash;
      p.text("Année bouclée", x1, y - r - 14, { align: "center", weight: 700, color: INK.soleil });
      c.globalAlpha = 1;
    }
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: phase === "running" || flashing });

  const togglePlay = () => {
    const s = race.current;
    if (s.days >= ROTATION_DAYS) s.days = 0;
    s.run = !s.run;
    setPhase(s.run ? "running" : s.days > 0 ? "paused" : "idle");
    if (!s.run) announce(pauseText(s.days));
  };

  return (
    <>
      <ModuleCanvas {...canvas} label="Deux cadrans : l'année de Vénus et sa rotation" />
      <div className="ctrls">
        <button className="chip" type="button" id="venus-race-play" onClick={togglePlay}>
          {PLAY_LABEL[phase]}
        </button>
      </div>
      <p className={`readout ${styles.reserve}`} id="venus-race-readout" aria-live="off">
        {readout}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
