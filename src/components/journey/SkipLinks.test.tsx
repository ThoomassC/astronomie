import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkipLinks } from "@/components/journey/SkipLinks";

afterEach(() => {
  cleanup();
});

describe("SkipLinks", () => {
  it.each([
    { locale: "fr", content: "Aller au contenu", dock: "Aller à la machine à remonter le temps" },
    { locale: "en", content: "Skip to content", dock: "Skip to the time machine" },
    { locale: "es", content: "Ir al contenido", dock: "Ir a la máquina del tiempo" },
  ] as const)("devrait mener au contenu puis au dock du temps, nommés en $locale", ({ locale, content, dock }) => {
    const { container } = render(<SkipLinks locale={locale} />);
    expect(screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      [content, "#contenu"],
      [dock, "#machine"],
    ]);
    // Inertes pendant l'exploration, comme le reste de la page.
    expect(container.firstElementChild).toHaveAttribute("data-hide-on-explore");
  });
});
