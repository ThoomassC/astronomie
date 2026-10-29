"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { bodyName } from "@/i18n/names";
import { LIGHT_SECONDS_PER_AU } from "@/lib/astro/constants";
import { formatDuration, lightSeconds } from "@/lib/astro/light";
import { PLANETS, SUN } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { COMMON_STRINGS } from "./common.strings";
import { LIGHT_RACE_STRINGS } from "./lightRace.strings";
import { ModuleCanvas } from "./ModuleCanvas";
import { INK, TAU } from "./paint";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 236, narrow: 0.78 };

/** Planètes sur la piste, à leur demi-grand axe (UA). */
const TRACK = PLANETS.map((planet) => ({ key: planet.key, au: planet.elements[0], color: planet.color }));
const NEPTUNE_AU = TRACK[TRACK.length - 1].au;
/** Étendue de la piste zoomée, en UA (de Mercure à Mars). */
const ZOOM_AU = 1.6;

/** Écart entre le temps écoulé et l'échelle quand ils partagent la première ligne, en px. */
const HEADER_GAP = 12;

const SPEEDS = [100, 1000, 10000] as const;
type Speed = (typeof SPEEDS)[number];

type Phase = "idle" | "running" | "paused" | "done";

/** 1. La course de la lumière (Soleil) : un éclair parcourt une piste à l'échelle, avec une loupe sur les planètes intérieures. */
export function LightRace() {
  const locale = useLocale();
  const t = LIGHT_RACE_STRINGS[locale];
  const common = COMMON_STRINGS[locale];
  const playLabel: Record<Phase, string> = {
    idle: t.start,
    running: common.pause,
    paused: common.resume,
    done: common.restart,
  };
  const [speed, setSpeed] = useState<Speed>(1000);
  const [phase, setPhase] = useState<Phase>("idle");
  const [readout, setReadout] = useState(t.initialReadout);
  const { message, announce } = useAnnouncer();
  /** Temps de trajet écoulé (s), course en cours, nombre de planètes atteintes. */
  const race = useRef({ t: 0, run: false, reached: 0 });

  const draw = ({ p, ctx: c, w, h, narrow, dt }: CanvasFrame) => {
    const s = race.current;
    const end = lightSeconds(NEPTUNE_AU);
    if (s.run) {
      s.t = Math.min(end, s.t + dt * speed);
      const reached = TRACK.filter((planet) => lightSeconds(planet.au) <= s.t).length;
      // Pendant la course, la ligne visible suit les planètes atteintes sans être annoncée.
      if (reached !== s.reached && reached > 0) {
        s.reached = reached;
        const last = TRACK[reached - 1];
        setReadout(t.reached(bodyName(last.key, locale), formatDuration(lightSeconds(last.au))));
      }
      if (s.t >= end) {
        s.run = false;
        setPhase("done");
        setReadout(t.arrival);
        announce(t.arrival);
      }
    }

    const L = 22;
    const R = w - 22;
    const au = s.t / LIGHT_SECONDS_PER_AU;
    c.clearRect(0, 0, w, h);
    // Sur une seule ligne (canvas large), l'échelle garde sa place à droite et le temps écoulé prend le reste ;
    // en largeur étroite, chacun a sa ligne.
    const scaleWidth = narrow ? R - L : Math.min(p.measure(t.scale), (R - L) / 2);
    p.text(t.elapsed(formatDuration(s.t)), L, 22, {
      weight: 700,
      size: 13,
      maxWidth: narrow ? R - L : R - L - scaleWidth - HEADER_GAP,
    });
    p.text(t.scale, narrow ? L : R, narrow ? 40 : 22, {
      align: narrow ? "left" : "right",
      color: INK.brume,
      maxWidth: scaleWidth,
    });
    const y1 = h * (narrow ? 0.44 : 0.4);
    const y2 = h * (narrow ? 0.84 : 0.82);
    const wideX = (a: number) => L + (a / NEPTUNE_AU) * (R - L);
    const zoomX = (a: number) => L + (a / ZOOM_AU) * (R - L);

    // Loupe : relie le début de la piste du haut à la piste zoomée du bas.
    c.fillStyle = "rgba(194,163,107,.10)";
    c.beginPath();
    c.moveTo(wideX(0), y1 + 8);
    c.lineTo(wideX(ZOOM_AU), y1 + 8);
    c.lineTo(R, y2 - 14);
    c.lineTo(L, y2 - 14);
    c.closePath();
    c.fill();
    p.text(t.zoom, (L + R) / 2, (y1 + y2) / 2 + 4, {
      align: "center",
      color: INK.brume,
      size: 11,
      maxWidth: R - L,
    });

    const tracks = [
      { y: y1, toX: wideX, max: NEPTUNE_AU },
      { y: y2, toX: zoomX, max: ZOOM_AU },
    ];
    for (const { y, toX, max } of tracks) {
      c.strokeStyle = "rgba(194,163,107,.55)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(L, y);
      c.lineTo(R, y);
      c.stroke();
      p.dot(L, y, 6, SUN.color);
      TRACK.forEach((planet, i) => {
        if (planet.au > max) return;
        const x = toX(planet.au);
        const hit = planet.au <= au + 1e-9;
        const r = hit ? 4.5 : 3.5;
        if (hit) p.dot(x, y, 8, `${planet.color}44`);
        p.dot(x, y, r, hit ? planet.color : INK.nuit);
        c.strokeStyle = planet.color;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.stroke();
        // Sur la piste entière, les planètes intérieures sont regroupées sous une seule étiquette.
        if (max > 2 && planet.au < 2) return;
        const up = max > 2 ? true : i % 2 === 0;
        p.text(bodyName(planet.key, locale), x, up ? y - 12 : y + 20, {
          align: "center",
          size: 11.5,
          color: hit ? INK.ivoire : INK.brume,
          weight: hit ? 700 : 400,
        });
      });
      if (max > 2) p.text(common.innerPlanets, L - 4, y1 + 22, { size: 11, color: INK.brume });
      // L'éclair et sa traîne.
      if (au > 0 && au <= max) {
        const x = toX(au);
        const trail = c.createLinearGradient(x - 60, 0, x, 0);
        trail.addColorStop(0, "rgba(255,214,140,0)");
        trail.addColorStop(1, "rgba(255,214,140,.9)");
        c.fillStyle = trail;
        c.fillRect(Math.max(L, x - 60), y - 1.5, Math.min(60, x - L), 3);
        p.dot(x, y, 3.2, "#FFF4D6");
      }
    }
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: phase === "running" });

  const togglePlay = () => {
    const s = race.current;
    if (s.t >= lightSeconds(NEPTUNE_AU)) {
      s.t = 0;
      s.reached = 0;
    }
    s.run = !s.run;
    setPhase(s.run ? "running" : s.t > 0 ? "paused" : "idle");
    if (!s.run) announce(readout);
  };

  const chooseSpeed = (next: Speed) => {
    setSpeed(next);
    const s = race.current;
    if (!s.run && s.t === 0) {
      const text = t.ready(formatNumber(next, 0, locale), formatDuration(lightSeconds(NEPTUNE_AU) / next));
      setReadout(text);
      announce(text);
    }
  };

  return (
    <>
      <ModuleCanvas {...canvas} label={t.canvasLabel} />
      <div className="ctrls">
        <button className="chip" type="button" id="light-race-play" onClick={togglePlay}>
          {playLabel[phase]}
        </button>
        <span className="grow" />
        <div className="seg" role="group" aria-label={t.speedGroup}>
          {SPEEDS.map((value) => (
            <button key={value} type="button" aria-pressed={value === speed} onClick={() => chooseSpeed(value)}>
              {`×${formatNumber(value, 0, locale)}`}
            </button>
          ))}
        </div>
      </div>
      <p className={`readout ${styles.reserve}`} id="light-race-readout" aria-live="off">
        {readout}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
