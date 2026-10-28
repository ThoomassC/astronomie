"use client";

import { useEffect, useRef, useState } from "react";
import { SPEEDS, getClock, type ClockSnapshot } from "@/lib/sim/clock";
import { DOCK_ID, DOCK_SCALE_TOGGLE_ID } from "./ids";
import { toggleRealScale, useRealScale } from "./realScale";
import { CheckIcon } from "./ScaleToggle";
import { SimDate } from "./SimDate";
import { SpeedSelector } from "./SpeedSelector";
import { useClockValue } from "./useClockValue";

/**
 * Réglages affichés avant hydratation : ceux de `getClock()` à sa création
 * (temps en marche, une semaine par seconde, distances compressées).
 */
const DEFAULT_PLAYING = true;
const DEFAULT_SPEED_DAYS = 7;
/** Durée de l'annonce « Retour au … », effacée ensuite pour pouvoir être répétée. */
const STATUS_DURATION_MS = 5000;
const TODAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const selectPlaying = (snapshot: ClockSnapshot) => snapshot.playing;
const selectSpeedDays = (snapshot: ClockSnapshot) => snapshot.speedDays;

function togglePlaying(): void {
  const clock = getClock();
  clock.setPlaying(!clock.snapshot().playing);
}

/** Machine à remonter le temps : lecture, vitesse, date simulée, retour à aujourd'hui, distances réelles. */
export function TimeDock() {
  // Sélecteurs plutôt que `useClock()` : la date avance hors de React (SimDate), le dock
  // ne se re-rend qu'aux changements de réglage.
  const playing = useClockValue(selectPlaying, DEFAULT_PLAYING);
  const speedDays = useClockValue(selectSpeedDays, DEFAULT_SPEED_DAYS);
  const realScale = useRealScale();
  const speedIndex = Math.max(0, SPEEDS.findIndex((speed) => speed.days === speedDays));
  const nextSpeed = SPEEDS[(speedIndex + 1) % SPEEDS.length];

  const [status, setStatus] = useState("");
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const timer = statusTimer;
    return () => clearTimeout(timer.current);
  }, []);

  const backToToday = () => {
    const now = Date.now();
    getClock().reset(now);
    setStatus(`Retour au ${TODAY_FORMAT.format(now)}`);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), STATUS_DURATION_MS);
  };

  return (
    <section id={DOCK_ID} className="dock" aria-label="Machine à remonter le temps" tabIndex={-1}>
      <button
        className="ibtn"
        type="button"
        aria-label={playing ? "Mettre le temps en pause" : "Relancer le temps"}
        onClick={togglePlaying}
      >
        <svg viewBox="0 0 18 18" aria-hidden="true">
          {playing ? (
            <g>
              <rect x="4" y="3" width="3.2" height="12" rx="1" fill="currentColor" />
              <rect x="10.8" y="3" width="3.2" height="12" rx="1" fill="currentColor" />
            </g>
          ) : (
            <path d="M5 3.2v11.6L14.6 9z" fill="currentColor" />
          )}
        </svg>
      </button>

      <SpeedSelector value={speedDays} onChange={(days) => getClock().setSpeed(days)} />
      {/* Sur mobile, un seul bouton fait défiler les vitesses ; son nom reste le texte visible. */}
      <button
        className="today cycle"
        type="button"
        aria-describedby="speedCycleHint"
        onClick={() => getClock().setSpeed(nextSpeed.days)}
      >
        <span>{SPEEDS[speedIndex].short}</span>
        {/* Tous les libellés, invisibles : la pilule garde la largeur du plus long d'une vitesse à l'autre. */}
        {SPEEDS.map((speed) => (
          <span key={speed.days} className="ghost" aria-hidden="true">
            {speed.short}
          </span>
        ))}
      </button>
      <span id="speedCycleHint" hidden>
        Changer la vitesse du temps
      </span>

      <span className="sep" />
      <SimDate />
      <button className="today" type="button" aria-label="Revenir à aujourd'hui" onClick={backToToday}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.2 2.2v2.9h2.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>{" "}
        <span className="label">{"Aujourd'hui"}</span>
      </button>

      <span className="sep opt" />
      <button
        id={DOCK_SCALE_TOGGLE_ID}
        className="today toggle"
        type="button"
        aria-pressed={realScale}
        aria-label="Distances réelles"
        onClick={toggleRealScale}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M1.5 8h13M1.5 5.5v5M14.5 5.5v5M5.5 7v2M8 6.5v3M10.5 7v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>{" "}
        <span className="label">Distances réelles</span>
        {realScale ? <CheckIcon checked /> : null}
      </button>

      <p className="sr" role="status">
        {status}
      </p>
    </section>
  );
}
