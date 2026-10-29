import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkipToContent } from "@/components/site/SkipToContent";

afterEach(() => {
  cleanup();
});

describe("SkipToContent", () => {
  it.each([
    { locale: "fr", name: "Aller au contenu" },
    { locale: "en", name: "Skip to content" },
    { locale: "es", name: "Ir al contenido" },
  ] as const)("devrait mener au contenu de la page (#contenu), nommé en $locale", ({ locale, name }) => {
    render(<SkipToContent locale={locale} />);
    expect(screen.getByRole("link", { name })).toHaveAttribute("href", "#contenu");
  });
});
