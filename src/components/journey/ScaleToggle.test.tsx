import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { setRealScale } from "@/components/journey/realScale";
import { ScaleToggle } from "@/components/journey/ScaleToggle";
import { renderIn } from "@/components/modules/testUtils";
import { getClock } from "@/lib/sim/clock";

afterEach(() => {
  act(() => setRealScale(false));
  cleanup();
});

describe("ScaleToggle", () => {
  it("devrait dire « Voir les distances réelles » en français, état porté par aria-pressed", async () => {
    const user = userEvent.setup();
    render(<ScaleToggle className="btn" />);
    const toggle = screen.getByRole("button", { name: "Voir les distances réelles" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(getClock().snapshot().realScale).toBe(true);
  });

  it.each([
    ["en", "Show real distances"],
    ["es", "Ver las distancias reales"],
  ] as const)("devrait garder un libellé fixe dans la langue de la page (%s : « %s »)", async (locale, name) => {
    const user = userEvent.setup();
    renderIn(locale, <ScaleToggle className="btn" />);
    await user.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
  });
});
