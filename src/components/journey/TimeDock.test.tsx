import { act, cleanup, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRealScale } from "@/components/journey/realScale";
import { TimeDock } from "@/components/journey/TimeDock";
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
