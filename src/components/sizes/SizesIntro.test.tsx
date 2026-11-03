import { cleanup, getDefaultNormalizer, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SizesIntro } from "@/components/sizes/SizesIntro";
import { getSizesContent } from "@/content/sizes/content";

afterEach(() => {
  cleanup();
});

describe("SizesIntro", () => {
  it.each([
    ["fr", "Étoiles et trous noirs, côte à côte."],
    ["en", "Stars and black holes, side by side."],
    ["es", "Estrellas y agujeros negros, en fila."],
  ] as const)("devrait titrer la page (h1) et poser l'introduction à l'ancre #tailles, escale « intro » (%s)", (locale, title) => {
    render(<SizesIntro locale={locale} />);
    const section = screen.getByRole("region", { name: title });
    expect(section).toHaveAttribute("id", "tailles");
    expect(section).toHaveAttribute("data-stop", "intro");
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it.each([
    ["fr", "Commencer par le plus petit"],
    ["en", "Start with the smallest"],
    ["es", "Empezar por el más pequeño"],
  ] as const)("devrait conduire au plus petit astre, à l'ancre #proxima-du-centaure (%s)", (locale, start) => {
    render(<SizesIntro locale={locale} />);
    expect(screen.getByRole("link", { name: start })).toHaveAttribute("href", "#proxima-du-centaure");
  });

  it("devrait dire ce qui est à l'échelle, et ce qui ne l'est pas (ligne discrète)", () => {
    render(<SizesIntro locale="fr" />);
    // Texte exact : la recherche par défaut ramènerait l'espace fine insécable (« échelle ; ») à une espace ordinaire.
    const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
    expect(screen.getByText(getSizesContent("fr").intro.note, exact)).toBeInTheDocument();
  });

  it("devrait dire aux lecteurs d'écran ce que montre la scène 3D décorative", () => {
    render(<SizesIntro locale="en" />);
    expect(screen.getByText(getSizesContent("en").intro.sceneDescription)).toHaveClass("sr");
  });
});
