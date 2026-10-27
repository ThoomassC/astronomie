import { describe, expect, it, vi } from "vitest";
import { DAY_MS } from "@/lib/astro/constants";
import { createClock, type SimClock } from "@/lib/sim/clock";

/** 2026-01-01T00:00Z : début pile d'un jour simulé. */
const START = Date.UTC(2026, 0, 1);
/** Numéro de ce jour depuis 1970 (floor(START / DAY_MS)). */
const START_DAY = 20_454;

/** Horloge démarrée à START avec un abonné espion. */
function watchedClock(init: Partial<Parameters<typeof createClock>[0]> = {}): {
  clock: SimClock;
  listener: ReturnType<typeof vi.fn>;
} {
  const clock = createClock({ ms: START, playing: true, ...init });
  const listener = vi.fn();
  clock.subscribe(listener);
  return { clock, listener };
}

describe("createClock", () => {
  describe("état initial", () => {
    it("devrait exposer l'instant de départ et les réglages par défaut (7 j/s, échelle compressée)", () => {
      const clock = createClock({ ms: START + DAY_MS / 2, playing: false });
      expect(clock.now()).toBe(START + DAY_MS / 2);
      expect(clock.snapshot()).toEqual({
        ms: START + DAY_MS / 2,
        day: START_DAY,
        speedDays: 7,
        playing: false,
        realScale: false,
      });
    });

    it("devrait reprendre la vitesse et l'échelle fournies", () => {
      const clock = createClock({ ms: START, playing: true, speedDays: 365.25, realScale: true });
      expect(clock.snapshot()).toMatchObject({ speedDays: 365.25, playing: true, realScale: true });
    });
  });

  describe("écoulement du temps", () => {
    it("devrait avancer de dt × vitesse jours quand l'horloge tourne", () => {
      const clock = createClock({ ms: START, playing: true, speedDays: 2 });
      clock.advance(0.25);
      expect(clock.now()).toBe(START + DAY_MS / 2);
    });

    it("devrait figer le temps quand l'horloge est en pause", () => {
      const clock = createClock({ ms: START, playing: false });
      clock.advance(1);
      expect(clock.now()).toBe(START);
    });

    it.each([[0], [-0.5]])("devrait ignorer un pas de temps nul ou négatif (dt = %f)", (dt) => {
      const clock = createClock({ ms: START, playing: true });
      clock.advance(dt);
      expect(clock.now()).toBe(START);
    });
  });

  describe("politique de notification", () => {
    it.each([
      ["setPlaying", (c: SimClock) => c.setPlaying(false)],
      ["setSpeed", (c: SimClock) => c.setSpeed(30.44)],
      ["setRealScale", (c: SimClock) => c.setRealScale(true)],
      ["reset", (c: SimClock) => c.reset(START + 10 * DAY_MS)],
    ] as const)("devrait prévenir les abonnés une fois quand on appelle %s", (_name, change) => {
      const { clock, listener } = watchedClock();
      change(clock);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("ne devrait pas prévenir quand le temps avance sans changer de jour simulé", () => {
      const { clock, listener } = watchedClock({ speedDays: 1 });
      clock.advance(0.5); // +0,5 jour, 0,5 s réelle
      expect(listener).not.toHaveBeenCalled();
    });

    it("devrait prévenir quand le jour simulé change et que 0,1 s réelle s'est écoulée", () => {
      const { clock, listener } = watchedClock({ ms: START + 0.95 * DAY_MS, speedDays: 1 });
      clock.advance(0.15); // franchit minuit
      expect(listener).toHaveBeenCalledTimes(1);
      expect(clock.snapshot().day).toBe(START_DAY + 1);
    });

    it("devrait attendre 0,1 s réelle avant de signaler un changement de jour", () => {
      const { clock, listener } = watchedClock({ speedDays: 365.25 }); // ≈ 14,6 jours par image de 0,04 s
      clock.advance(0.04);
      clock.advance(0.04);
      expect(listener).not.toHaveBeenCalled();
      clock.advance(0.04); // 0,12 s cumulées
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("devrait relancer le délai de 0,1 s après chaque notification due au temps", () => {
      const { clock, listener } = watchedClock({ speedDays: 365.25 });
      clock.advance(0.12); // notification n° 1
      clock.advance(0.04);
      clock.advance(0.04);
      expect(listener).toHaveBeenCalledTimes(1);
      clock.advance(0.04); // 0,12 s depuis la précédente
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("devrait prévenir tous les abonnés", () => {
      const { clock, listener } = watchedClock();
      const other = vi.fn();
      clock.subscribe(other);
      clock.setRealScale(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(other).toHaveBeenCalledTimes(1);
    });

    it("ne devrait plus prévenir un abonné qui s'est désinscrit", () => {
      const clock = createClock({ ms: START, playing: true });
      const listener = vi.fn();
      const unsubscribe = clock.subscribe(listener);
      unsubscribe();
      clock.setPlaying(false);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("instantané", () => {
    it("devrait renvoyer le même objet entre deux notifications même si le temps avance", () => {
      const clock = createClock({ ms: START, playing: true, speedDays: 1 });
      const before = clock.snapshot();
      clock.advance(0.05);
      expect(clock.snapshot()).toBe(before);
      expect(clock.now()).toBeGreaterThan(before.ms);
    });

    it("devrait renvoyer un nouvel instantané à jour après une notification, sans modifier l'ancien", () => {
      const clock = createClock({ ms: START, playing: true });
      const before = clock.snapshot();
      clock.setRealScale(true);
      const after = clock.snapshot();
      expect(after).not.toBe(before);
      expect(after.realScale).toBe(true);
      expect(before.realScale).toBe(false);
    });

    it("devrait refléter l'instant atteint quand le temps a déclenché la notification", () => {
      const clock = createClock({ ms: START, playing: true, speedDays: 10 });
      clock.advance(0.2); // +2 jours
      expect(clock.snapshot()).toMatchObject({ ms: START + 2 * DAY_MS, day: START_DAY + 2 });
    });
  });

  describe("pause et vitesse", () => {
    it("devrait signaler la pause dans l'instantané et figer le temps", () => {
      const clock = createClock({ ms: START, playing: true });
      clock.setPlaying(false);
      clock.advance(1);
      expect(clock.snapshot().playing).toBe(false);
      expect(clock.now()).toBe(START);
    });

    it("devrait relancer la lecture quand on choisit une vitesse pendant la pause", () => {
      const clock = createClock({ ms: START, playing: false });
      clock.setSpeed(30.44);
      expect(clock.snapshot()).toMatchObject({ playing: true, speedDays: 30.44 });
      clock.advance(1);
      expect(clock.now()).toBe(START + 30.44 * DAY_MS);
    });
  });

  describe("reset", () => {
    it("devrait repositionner l'instant simulé et le jour de l'instantané", () => {
      const clock = createClock({ ms: START, playing: true });
      clock.reset(START + 3.5 * DAY_MS);
      expect(clock.now()).toBe(START + 3.5 * DAY_MS);
      expect(clock.snapshot()).toMatchObject({ ms: START + 3.5 * DAY_MS, day: START_DAY + 3 });
    });
  });
});
