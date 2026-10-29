import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SizesIntro } from "@/components/sizes/SizesIntro";
import { getSizesContent } from "@/content/sizes/content";

afterEach(() => {
  cleanup();
});

describe("SizesIntro", () => {
  it.each([
    ["fr", "Dix étoiles, de la naine à l'hypergéante"],
    ["en", "Ten stars, from dwarf to hypergiant"],
    ["es", "Diez estrellas, de la enana a la hipergigante"],
  ] as const)("devrait titrer la page (h1) et poser l'introduction à l'ancre #tailles, escale « intro » (%s)", (locale, title) => {
    render(<SizesIntro locale={locale} />);
    const section = screen.getByRole("region", { name: title });
    expect(section).toHaveAttribute("id", "tailles");
    expect(section).toHaveAttribute("data-stop", "intro");
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it.each([
    ["fr", "Commencer par Proxima du Centaure"],
    ["en", "Start with Proxima Centauri"],
    ["es", "Empezar por Próxima Centauri"],
  ] as const)("devrait conduire à la plus petite étoile, à l'ancre #proxima-du-centaure (%s)", (locale, start) => {
    render(<SizesIntro locale={locale} />);
    expect(screen.getByRole("link", { name: start })).toHaveAttribute("href", "#proxima-du-centaure");
  });

  it("devrait dire aux lecteurs d'écran ce que montre la scène 3D décorative", () => {
    render(<SizesIntro locale="en" />);
    expect(screen.getByText(getSizesContent("en").intro.sceneDescription)).toHaveClass("sr");
  });
});
