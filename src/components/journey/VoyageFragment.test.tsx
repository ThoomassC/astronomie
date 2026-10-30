import { act, cleanup, render } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { VoyageFragment } from "@/components/journey/VoyageFragment";
import type { StopKey } from "@/lib/journey/camera";
import { journeyStore } from "@/lib/journey/store";
import { currentFragment } from "@/lib/site/fragment";

/** Escale affichée par le voyage, au repos. */
const showStop = (key: StopKey) => act(() => journeyStore.update(key, key, 0));

/** Le voyage à l'écran, ou masqué comme Next masque une page quittée (`<Activity>`, état et DOM gardés). */
const voyage = (mode: "visible" | "hidden") => (
  <Activity mode={mode}>
    <VoyageFragment />
  </Activity>
);

afterEach(() => {
  cleanup();
  act(() => journeyStore.reset());
});

describe("VoyageFragment", () => {
  it("ne devrait rien rendre", () => {
    const { container } = render(<VoyageFragment />);
    expect(container).toBeEmptyDOMElement();
  });

  it("devrait donner au changement de langue l'ancre de l'escale affichée", () => {
    showStop("saturn");
    render(<VoyageFragment />);
    expect(currentFragment()).toBe("#saturne");
  });

  it("devrait lire l'escale au moment de la demande, sans attendre de nouveau rendu", () => {
    showStop("saturn");
    render(<VoyageFragment />);
    showStop("uranus");
    expect(currentFragment()).toBe("#uranus");
  });

  it("devrait donner l'ancre de la vue d'ensemble en haut du voyage", () => {
    render(<VoyageFragment />);
    expect(currentFragment()).toBe("#accueil");
  });

  it("devrait retirer sa source au démontage : hors du voyage, plus de position à garder", () => {
    showStop("saturn");
    const { unmount } = render(<VoyageFragment />);
    unmount();
    expect(currentFragment()).toBeNull();
  });

  it("devrait retirer sa source quand Next masque le voyage quitté, et la reprendre au retour", () => {
    showStop("saturn");
    const { rerender } = render(voyage("visible"));
    rerender(voyage("hidden"));
    expect(currentFragment()).toBeNull();
    rerender(voyage("visible"));
    expect(currentFragment()).toBe("#saturne");
  });
});
