import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CurrentStar } from "@/components/sizes/CurrentStar";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { sizesStore } from "@/lib/sizes/store";

afterEach(() => {
  cleanup();
  act(() => sizesStore.reset());
});

describe("CurrentStar", () => {
  it("devrait nommer l'étoile que montre la scène : la plus petite dès l'introduction", () => {
    render(<CurrentStar />);
    expect(screen.getByText("Étoile")).toBeInTheDocument();
    expect(screen.getByText("Proxima du Centaure")).toBeInTheDocument();
  });

  it("devrait suivre l'étoile affichée, dans la langue de la page (en)", () => {
    render(
      <LocaleProvider locale="en">
        <CurrentStar />
      </LocaleProvider>,
    );
    act(() => sizesStore.update("antares-a", "betelgeuse", 0.6));
    expect(screen.getByText("Star")).toBeInTheDocument();
    expect(screen.getByText("Betelgeuse")).toBeInTheDocument();
  });
});
