import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SizesRail } from "@/components/sizes/SizesRail";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type * as FrameLoopModule from "@/lib/sim/frameLoop";
import { sizesStore } from "@/lib/sizes/store";

/** La règle suit le vol image par image ; ici la boucle d'images ne tourne pas. */
vi.mock("@/lib/sim/frameLoop", async (importOriginal) => ({
  ...(await importOriginal<typeof FrameLoopModule>()),
  useFrame: () => undefined,
}));

beforeEach(() => {
  // Frontière navigateur : jsdom n'a pas de ResizeObserver ; sans mesure, les repères restent à leur position vraie.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  act(() => sizesStore.reset());
  vi.unstubAllGlobals();
});

const renderIn = (locale: "fr" | "en" | "es") =>
  render(
    <LocaleProvider locale={locale}>
      <SizesRail />
    </LocaleProvider>,
  );

describe("SizesRail", () => {
  it("devrait nommer la règle et lister les dix étoiles, de la plus petite à la plus grande, avec leur ancre (es)", () => {
    renderIn("es");
    const rail = screen.getByRole("navigation", { name: "Escala de tamaños, de la estrella más pequeña a la más grande" });
    expect(rail).toHaveAttribute("id", "rail");
    const links = within(rail).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#proxima-du-centaure", "#soleil", "#sirius-a", "#pollux", "#arcturus", "#aldebaran", "#rigel", "#antares-a",
      "#betelgeuse", "#vy-canis-majoris",
    ]);
  });

  it("devrait nommer chaque repère par l'étoile et son rayon, dans la langue (es : « Sirio A, 1,711 R☉ »)", () => {
    renderIn("es");
    expect(screen.getByRole("link", { name: "Sirio A, 1,711 R☉" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VY Canis Majoris, 1420 R☉" })).toBeInTheDocument();
  });

  it("devrait marquer l'étoile affichée, et suivre le parcours de la page", () => {
    renderIn("es");
    expect(screen.queryByRole("link", { current: "step" })).toBeNull();
    act(() => sizesStore.update("betelgeuse", "betelgeuse", 0));
    expect(screen.getByRole("link", { name: "Betelgeuse, 764 R☉" })).toHaveAttribute("aria-current", "step");
    act(() => sizesStore.update("betelgeuse", "vy-canis-majoris", 0.7));
    expect(screen.getByRole("link", { name: "VY Canis Majoris, 1420 R☉" })).toHaveAttribute("aria-current", "step");
  });

  it("devrait rappeler sous la règle que chaque graduation multiplie le rayon par 10, sans le faire lire", () => {
    renderIn("en");
    expect(screen.getByText("× 10 per mark")).toHaveAttribute("aria-hidden", "true");
  });

  it("devrait graduer la règle à chaque puissance de dix, de 0,1 à 1 000 R☉", () => {
    const { container } = renderIn("fr");
    expect(container.querySelectorAll(".tick")).toHaveLength(5);
    expect(container.querySelectorAll(".tick.maj")).toHaveLength(1);
  });
});
