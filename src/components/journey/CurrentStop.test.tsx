import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CurrentStop } from "@/components/journey/CurrentStop";
import { renderIn } from "@/components/modules/testUtils";
import { journeyStore } from "@/lib/journey/store";

beforeEach(() => {
  act(() => journeyStore.update("saturn", "saturn", 0));
});

afterEach(() => {
  cleanup();
  act(() => journeyStore.update("hero", "hero", 0));
});

describe("CurrentStop", () => {
  it("devrait dire « Escale » et le nom de l'escale affichée en français, hors fournisseur de langue", () => {
    render(<CurrentStop />);
    expect(screen.getByText("Escale")).toBeInTheDocument();
    expect(screen.getByText("Saturne")).toBeInTheDocument();
  });

  it.each([
    { locale: "en", label: "Stop", saturn: "Saturn", hero: "Overview" },
    { locale: "es", label: "Escala", saturn: "Saturno", hero: "Vista general" },
  ] as const)(
    "devrait suivre l'escale affichée dans la langue de la page ($locale)",
    ({ locale, label, saturn, hero }) => {
      renderIn(locale, <CurrentStop />);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(saturn)).toBeInTheDocument();
      act(() => journeyStore.update("hero", "hero", 0));
      expect(screen.getByText(hero)).toBeInTheDocument();
    },
  );
});
