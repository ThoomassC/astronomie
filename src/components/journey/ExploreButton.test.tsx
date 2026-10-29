import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ExploreButton } from "@/components/journey/ExploreButton";
import type { StopKey } from "@/lib/journey/camera";
import { exploreStore } from "@/lib/journey/explore";
import { journeyStore } from "@/lib/journey/store";

/** Escale affichée par le voyage, que le bouton suit. */
const showStop = (key: StopKey) => act(() => journeyStore.update(key, key, 0));

afterEach(() => {
  act(() => exploreStore.exit());
  cleanup();
  act(() => journeyStore.update("hero", "hero", 0));
});

describe("ExploreButton", () => {
  it("devrait nommer ce qu'on va explorer, en commençant par le texte visible, et porter l'identifiant du retour de focus", () => {
    showStop("saturn");
    render(<ExploreButton />);
    expect(screen.getByRole("button", { name: "Tourner autour de Saturne" })).toHaveAttribute("id", "tourner-autour");
  });

  it.each([
    ["uranus", "Tourner autour d'Uranus"],
    ["hero", "Tourner autour du système solaire"],
    ["galaxy", "Tourner autour de la Voie lactée"],
  ] as const)("devrait suivre l'escale affichée (%s : « %s »)", (stop, name) => {
    showStop(stop);
    render(<ExploreButton />);
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("devrait suivre l'escale qui change pendant que le bouton est affiché", () => {
    showStop("saturn");
    render(<ExploreButton />);
    showStop("uranus");
    expect(screen.getByRole("button", { name: "Tourner autour d'Uranus" })).toBeInTheDocument();
  });

  describe("à la ceinture d'astéroïdes, où l'on ne tourne pas", () => {
    it("ne devrait proposer aucun bouton aux technologies d'assistance", () => {
      showStop("belt");
      render(<ExploreButton />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("devrait garder sa place dans la barre, masqué et hors de l'ordre de tabulation", () => {
      showStop("belt");
      const { container } = render(<ExploreButton />);
      const button = container.querySelector("#tourner-autour");
      expect(button).toHaveAttribute("aria-hidden", "true");
      expect(button).toHaveAttribute("tabindex", "-1");
    });
  });

  it("devrait entrer dans l'exploration de l'escale affichée au clic", async () => {
    const user = userEvent.setup();
    showStop("saturn");
    render(<ExploreButton />);
    await user.click(screen.getByRole("button", { name: "Tourner autour de Saturne" }));
    expect(exploreStore.get().stop).toBe("saturn");
  });
});
