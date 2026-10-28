"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { SPEEDS, type Speed } from "@/lib/sim/clock";

/** « 1 jour/s » → « 1 jour par seconde » : le nom accessible commence par le texte visible. */
const spokenSpeed = (speed: Speed) => speed.label.replace("/s", " par seconde");

const speedIndex = (days: number) => Math.max(0, SPEEDS.findIndex((speed) => speed.days === days));

/**
 * Écrit la position de la bulle sous `button`, en distances aux bords intérieurs de la piste.
 * Piste masquée (mobile) : rien à mesurer, rien n'est écrit, et la fonction renvoie `false`.
 */
function placeBubble(track: HTMLElement, button: HTMLElement | null | undefined): boolean {
  if (!button || track.clientWidth === 0) return false;
  const left = button.offsetLeft;
  track.style.setProperty("--bubble-left", `${left}px`);
  track.style.setProperty("--bubble-right", `${track.clientWidth - left - button.offsetWidth}px`);
  return true;
}

interface SpeedSelectorProps {
  /** Vitesse active, en jours simulés par seconde. */
  value: number;
  onChange(days: number): void;
}

/**
 * Choix de la vitesse du temps. Une bulle glisse sous le bouton actif : son bord avant part le
 * premier et l'arrière suit (`data-dir`), elle s'étire en chemin puis se resserre. Une copie
 * sombre des libellés, découpée à sa forme, inverse le texte exactement là où elle passe.
 * La position passe par des variables CSS posées hors du rendu : rien ne se re-rend en chemin.
 */
export function SpeedSelector({ value, onChange }: SpeedSelectorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const previousIndex = useRef<number | null>(null);
  const currentIndex = useRef(0);
  const index = speedIndex(value);

  // Avant la peinture : la bulle est déjà sous le bon bouton à la première image.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const previous = previousIndex.current;
    if (previous !== null && previous !== index) track.dataset.dir = index > previous ? "next" : "prev";
    previousIndex.current = index;
    currentIndex.current = index;
    if (placeBubble(track, buttonsRef.current[index])) track.dataset.ready = "true";
  }, [index]);

  // Police chargée, fenêtre redimensionnée, piste qui réapparaît (mobile → bureau) : la bulle
  // rejoint son bouton sans glisser, sinon elle partirait d'une position périmée.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      track.dataset.instant = "true";
      if (placeBubble(track, buttonsRef.current[currentIndex.current])) track.dataset.ready = "true";
      // Styles recalculés tant que les transitions sont coupées ; ensuite, plus rien ne change à animer.
      track.getBoundingClientRect();
      delete track.dataset.instant;
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="seg speed" id="speedSeg" role="group" aria-label="Vitesse du temps" ref={trackRef}>
      <span className="seg-bubble" aria-hidden="true" />
      <span className="seg-ink" aria-hidden="true">
        {SPEEDS.map((speed) => (
          <span key={speed.days}>{speed.label}</span>
        ))}
      </span>
      {SPEEDS.map((speed, i) => (
        <button
          key={speed.days}
          ref={(element) => {
            buttonsRef.current[i] = element;
          }}
          type="button"
          aria-pressed={speed.days === value}
          aria-label={spokenSpeed(speed)}
          data-label={speed.label}
          onClick={() => onChange(speed.days)}
        >
          <span>{speed.label}</span>
        </button>
      ))}
    </div>
  );
}
