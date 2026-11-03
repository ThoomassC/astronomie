import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { EXPLORE_STRINGS } from "@/components/journey/explore.strings";
import { ExploreButton } from "@/components/journey/ExploreButton";
import { renderIn } from "@/components/modules/testUtils";
import { LOCALES } from "@/i18n/locales";
import { STOP_ORDER, type StopKey } from "@/lib/journey/camera";
import { exploreStore } from "@/lib/journey/explore";
import { isExploreStop } from "@/lib/journey/orbit";
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

describe("ExploreButton en anglais et en espagnol", () => {
  it.each([
    ["en", "saturn", "Orbit Saturn"],
    ["en", "earth", "Orbit Earth"],
    ["en", "sun", "Orbit the Sun"],
    ["en", "hero", "Orbit the Solar System"],
    ["en", "stars", "Orbit the nearby stars"],
    ["en", "galaxy", "Orbit the Milky Way"],
    ["es", "saturn", "Girar alrededor de Saturno"],
    ["es", "earth", "Girar alrededor de la Tierra"],
    ["es", "sun", "Girar alrededor del Sol"],
    ["es", "beyond", "Girar alrededor del sistema solar"],
    ["es", "stars", "Girar alrededor de las estrellas vecinas"],
    ["es", "galaxy", "Girar alrededor de la Vía Láctea"],
  ] as const)(
    "devrait nommer ce qu'on va explorer dans la langue de la page (%s, %s : « %s »)",
    (locale, stop, name) => {
      showStop(stop);
      renderIn(locale, <ExploreButton />);
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    },
  );

  it.each(["en", "es"] as const)("devrait garder sa place, masqué, à la ceinture d'astéroïdes (%s)", (locale) => {
    showStop("belt");
    renderIn(locale, <ExploreButton />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(LOCALES)("devrait avoir un complément pour chaque escale où l'on tourne (%s)", (locale) => {
    const targets = STOP_ORDER.filter(isExploreStop).map((stop) => EXPLORE_STRINGS[locale].targets[stop]);
    expect(targets.every((target) => target.trim() !== "")).toBe(true);
  });
});
