import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CurrentObject } from "@/components/sizes/CurrentObject";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { sizesStore } from "@/lib/sizes/store";

afterEach(() => {
  cleanup();
  act(() => sizesStore.reset());
});

describe("CurrentObject", () => {
  it("devrait nommer l'astre que montre la scène : le plus petit, un trou noir, dès l'introduction", () => {
    render(<CurrentObject />);
    expect(screen.getByText("Trou noir")).toBeInTheDocument();
    expect(screen.getByText("Cygnus X-1")).toBeInTheDocument();
  });

  it("devrait suivre l'astre affiché, dans la langue de la page, et dire sa sorte (en)", () => {
    render(
      <LocaleProvider locale="en">
        <CurrentObject />
      </LocaleProvider>,
    );
    act(() => sizesStore.update("antares-a", "betelgeuse", 0.6));
    expect(screen.getByText("Star")).toBeInTheDocument();
    expect(screen.getByText("Betelgeuse")).toBeInTheDocument();
    act(() => sizesStore.update("vy-canis-majoris", "m87-star", 0.6));
    expect(screen.getByText("Black hole")).toBeInTheDocument();
    expect(screen.getByText("M87*")).toBeInTheDocument();
  });

  it("devrait donner après « Trou noir » le nom court du Fer à cheval cosmique, sans redire « trou noir »", () => {
    render(<CurrentObject />);
    act(() => sizesStore.update("cosmic-horseshoe", "cosmic-horseshoe", 0));
    expect(screen.getByText("Trou noir")).toBeInTheDocument();
    expect(screen.getByText("Fer à cheval cosmique")).toBeInTheDocument();
  });
});
