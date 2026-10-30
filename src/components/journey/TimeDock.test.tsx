import { act, cleanup, render, screen, within } from "@testing-library/react";
import { Profiler } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRealScale } from "@/components/journey/realScale";
import { TimeDock } from "@/components/journey/TimeDock";
import { renderIn } from "@/components/modules/testUtils";
import { journeyStore } from "@/lib/journey/store";
import { getClock } from "@/lib/sim/clock";

const LOCKED_HINT = "Ici, les distances sont déjà réelles.";

beforeEach(() => {
  // Frontière navigateur : jsdom n'a ni ResizeObserver (sélecteur de vitesse) ni matchMedia (date du dock).
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(() => {
  act(() => setRealScale(false));
  cleanup();
  act(() => journeyStore.update("hero", "hero", 0));
  vi.unstubAllGlobals();
});

const scaleToggle = () => screen.getByRole("button", { name: "Distances réelles" });

describe("TimeDock, bascule « Distances réelles »", () => {
  describe.each(["stars", "galaxy"] as const)("à l'escale cosmique %s, où tout est déjà à l'échelle", (stop) => {
    beforeEach(() => {
      act(() => journeyStore.update(stop, stop, 0));
    });

    it("devrait se dire indisponible", () => {
      render(<TimeDock />);
      expect(scaleToggle()).toHaveAttribute("aria-disabled", "true");
    });

    it("devrait expliquer pourquoi : « Ici, les distances sont déjà réelles. »", () => {
      render(<TimeDock />);
      expect(scaleToggle()).toHaveAccessibleDescription(LOCKED_HINT);
    });

    it("devrait laisser les distances compressées quand on clique dessus", async () => {
      const user = userEvent.setup();
      render(<TimeDock />);
      await user.click(scaleToggle());
      expect(getClock().snapshot().realScale).toBe(false);
    });
  });

  describe("à une escale du système solaire (mars)", () => {
    beforeEach(() => {
      act(() => journeyStore.update("mars", "mars", 0));
    });

    it("devrait rester disponible, sans explication", () => {
      render(<TimeDock />);
      expect(scaleToggle()).not.toHaveAttribute("aria-disabled");
      expect(scaleToggle()).not.toHaveAccessibleDescription(LOCKED_HINT);
    });

    it("devrait passer aux distances réelles quand on clique dessus", async () => {
      const user = userEvent.setup();
      render(<TimeDock />);
      await user.click(scaleToggle());
      expect(getClock().snapshot().realScale).toBe(true);
      expect(scaleToggle()).toHaveAttribute("aria-pressed", "true");
    });
  });
});

describe("TimeDock en anglais et en espagnol", () => {
  /** Midi UTC le 29 octobre 2026 : le même jour dans tous les fuseaux d'Europe et d'Amérique. */
  const NOW = Date.UTC(2026, 9, 29, 12);

  const LOCALIZED = [
    {
      locale: "en",
      dock: "Time machine",
      pause: "Pause time",
      resume: "Resume time",
      speeds: "Speed of time",
      cycle: "1 wk/s",
      cycleHint: "Change the speed of time",
      backToToday: "Back to today",
      today: "Today",
      real: "Real distances",
      status: "Back to 29 October 2026",
      locked: "Distances here are already real.",
    },
    {
      locale: "es",
      dock: "Máquina del tiempo",
      pause: "Pausar el tiempo",
      resume: "Reanudar el tiempo",
      speeds: "Velocidad del tiempo",
      cycle: "1 sem/s",
      cycleHint: "Cambiar la velocidad del tiempo",
      backToToday: "Volver al día de hoy",
      today: "Hoy",
      real: "Distancias reales",
      status: "De vuelta al 29 de octubre de 2026",
      locked: "Aquí las distancias ya son reales.",
    },
  ] as const;

  beforeEach(() => {
    // L'heure réelle seule est figée : les minuteurs restent ceux du navigateur (user-event).
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    act(() => getClock().setSpeed(7));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(LOCALIZED)("devrait nommer le dock et ses commandes dans la langue de la page ($locale)", (t) => {
    renderIn(t.locale, <TimeDock />);
    const dock = screen.getByRole("region", { name: t.dock });
    expect(within(dock).getByRole("button", { name: t.pause })).toBeInTheDocument();
    expect(within(dock).getByRole("group", { name: t.speeds })).toBeInTheDocument();
    expect(within(dock).getByRole("button", { name: t.cycle })).toHaveAccessibleDescription(t.cycleHint);
    expect(within(dock).getByRole("button", { name: t.backToToday })).toHaveTextContent(t.today);
    expect(within(dock).getByRole("button", { name: t.real })).toHaveTextContent(t.real);
  });

  it.each(LOCALIZED)("devrait proposer de relancer le temps une fois en pause ($locale)", async (t) => {
    const user = userEvent.setup();
    renderIn(t.locale, <TimeDock />);
    await user.click(screen.getByRole("button", { name: t.pause }));
    expect(screen.getByRole("button", { name: t.resume })).toBeInTheDocument();
  });

  it.each(LOCALIZED)("devrait annoncer le retour à aujourd'hui, date écrite dans la langue ($locale)", async (t) => {
    const user = userEvent.setup();
    renderIn(t.locale, <TimeDock />);
    await user.click(screen.getByRole("button", { name: t.backToToday }));
    expect(screen.getByRole("status")).toHaveTextContent(t.status);
  });

  it.each(LOCALIZED)("devrait dire dans la langue pourquoi la bascule est indisponible aux étoiles ($locale)", (t) => {
    act(() => journeyStore.update("stars", "stars", 0));
    renderIn(t.locale, <TimeDock />);
    const toggle = screen.getByRole("button", { name: t.real });
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(toggle).toHaveAccessibleDescription(t.locked);
  });
});

describe("TimeDock et le voyage", () => {
  it("ne devrait pas se re-rendre quand l'escale change sans quitter le système solaire", () => {
    act(() => journeyStore.update("mars", "mars", 0));
    const onRender = vi.fn();
    render(
      <Profiler id="dock" onRender={onRender}>
        <TimeDock />
      </Profiler>,
    );
    onRender.mockClear();
    act(() => journeyStore.update("mars", "jupiter", 0.6));
    act(() => journeyStore.update("jupiter", "saturn", 0.6));
    expect(onRender).not.toHaveBeenCalled();
  });
});
