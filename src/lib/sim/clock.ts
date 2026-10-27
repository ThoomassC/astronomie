import { useSyncExternalStore } from "react";
import { DAY_MS } from "@/lib/astro/constants";

export interface Speed {
  days: number;
  label: string;
  short: string;
}

/** Vitesses de la machine à remonter le temps, en jours simulés par seconde. */
export const SPEEDS: readonly Speed[] = [
  { days: 1, label: "1 jour/s", short: "1 j/s" },
  { days: 7, label: "1 semaine/s", short: "1 sem/s" },
  { days: 30.44, label: "1 mois/s", short: "1 mois/s" },
  { days: 365.25, label: "1 an/s", short: "1 an/s" },
];

export interface ClockSnapshot {
  /** Instant simulé, en ms Unix. */
  ms: number;
  /** Numéro du jour simulé (floor(ms / 86 400 000)). */
  day: number;
  speedDays: number;
  playing: boolean;
  /** Distances à l'échelle réelle demandées. */
  realScale: boolean;
}

export interface SimClock {
  /** Instant simulé courant, lu à chaque image sans passer par React. */
  now(): number;
  /** Instantané stable entre deux notifications (pour useSyncExternalStore). */
  snapshot(): ClockSnapshot;
  advance(dtSeconds: number): void;
  setPlaying(playing: boolean): void;
  setSpeed(days: number): void;
  setRealScale(on: boolean): void;
  reset(ms: number): void;
  subscribe(listener: () => void): () => void;
}

/** Délai minimal entre deux notifications dues au seul écoulement du temps, en secondes. */
const NOTIFY_EVERY_S = 0.1;

/**
 * Horloge de simulation. Prévient ses abonnés à chaque réglage, et quand le jour simulé
 * change, au plus toutes les 0,1 s de temps réel pour ne pas re-rendre React à chaque image.
 */
export function createClock(init: { ms: number; playing: boolean; speedDays?: number; realScale?: boolean }): SimClock {
  let ms = init.ms;
  let speedDays = init.speedDays ?? 7;
  let playing = init.playing;
  let realScale = init.realScale ?? false;
  let sinceNotify = 0;
  const listeners = new Set<() => void>();
  const build = (): ClockSnapshot => ({ ms, day: Math.floor(ms / DAY_MS), speedDays, playing, realScale });
  let snap = build();
  const notify = () => {
    snap = build();
    sinceNotify = 0;
    listeners.forEach((l) => l());
  };
  return {
    now: () => ms,
    snapshot: () => snap,
    advance(dt) {
      sinceNotify += dt;
      if (playing && dt > 0) ms += dt * speedDays * DAY_MS;
      if (Math.floor(ms / DAY_MS) !== snap.day && sinceNotify >= NOTIFY_EVERY_S) notify();
    },
    setPlaying(on) {
      playing = on;
      notify();
    },
    setSpeed(days) {
      speedDays = days;
      playing = true;
      notify();
    },
    setRealScale(on) {
      realScale = on;
      notify();
    },
    reset(value) {
      ms = value;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let clock: SimClock | null = null;

/** Horloge de la page, créée à la première utilisation côté navigateur (jamais pendant le rendu serveur). */
export function getClock(): SimClock {
  if (!clock) {
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    clock = createClock({ ms: Date.now(), playing: !reduced });
  }
  return clock;
}

const subscribe = (l: () => void) => getClock().subscribe(l);
const getSnapshot = () => getClock().snapshot();
const getServerSnapshot = (): ClockSnapshot | null => null;

/** Instantané de l'horloge ; `null` au rendu serveur et à l'hydratation (afficher un état neutre). */
export function useClock(): ClockSnapshot | null {
  return useSyncExternalStore<ClockSnapshot | null>(subscribe, getSnapshot, getServerSnapshot);
}
