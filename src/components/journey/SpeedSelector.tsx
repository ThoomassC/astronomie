"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { SPEEDS } from "@/lib/sim/clock";
import { DOCK_STRINGS } from "./dock.strings";

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
 * Libellés dans la langue de la page ; le nom accessible de chaque bouton commence par son texte visible.
 */
export function SpeedSelector({ value, onChange }: SpeedSelectorProps) {
  const t = DOCK_STRINGS[useLocale()];
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
    <div className="seg speed" id="speedSeg" role="group" aria-label={t.speedGroup} ref={trackRef}>
      <span className="seg-bubble" aria-hidden="true" />
      <span className="seg-ink" aria-hidden="true">
        {SPEEDS.map((speed) => (
          <span key={speed.id}>{t.speeds[speed.id].label}</span>
        ))}
      </span>
      {SPEEDS.map((speed, i) => (
        <button
          key={speed.id}
          ref={(element) => {
            buttonsRef.current[i] = element;
          }}
          type="button"
          aria-pressed={speed.days === value}
          aria-label={t.speeds[speed.id].spoken}
          data-label={t.speeds[speed.id].label}
          onClick={() => onChange(speed.days)}
        >
          <span>{t.speeds[speed.id].label}</span>
        </button>
      ))}
    </div>
  );
}
