import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Flag } from "@/components/site/flags";
import { LOCALES, type Locale } from "@/i18n/locales";

afterEach(() => {
  cleanup();
});

/** Le drapeau d'une langue, rendu seul. */
function drawFlag(locale: Locale): SVGSVGElement {
  const { container } = render(<Flag locale={locale} />);
  const svg = container.querySelector("svg");
  if (!svg) throw new Error(`Drapeau absent en ${locale}`);
  return svg;
}

/** Couleurs que peint un drapeau (remplissages et traits), en majuscules, sans doublon, triées. */
function paints(svg: SVGSVGElement): string[] {
  const colors = Array.from(svg.querySelectorAll("[fill], [stroke]"), (shape) => [
    shape.getAttribute("fill"),
    shape.getAttribute("stroke"),
  ]).flat();
  const painted = colors.filter((color): color is string => color !== null && color !== "none");
  return [...new Set(painted.map((color) => color.toUpperCase()))].sort();
}

describe("Flag", () => {
  it.each(LOCALES)("devrait être décoratif : caché de l'arbre d'accessibilité, jamais focalisable (%s)", (locale) => {
    const flag = drawFlag(locale);
    expect(flag).toHaveAttribute("aria-hidden", "true");
    expect(flag).toHaveAttribute("focusable", "false");
  });

  it.each(LOCALES)("ne devrait rien dire : ni titre ni texte, le nom de la langue à côté suffit (%s)", (locale) => {
    const flag = drawFlag(locale);
    expect(flag.querySelector("title, desc, text")).toBeNull();
    expect(flag.textContent).toBe("");
  });

  it.each(LOCALES)("devrait mesurer 21 × 14 px, au rapport 3:2 de son dessin (%s)", (locale) => {
    const flag = drawFlag(locale);
    expect(flag).toHaveAttribute("width", "21");
    expect(flag).toHaveAttribute("height", "14");
    const [, , width, height] = (flag.getAttribute("viewBox") ?? "").split(" ").map(Number);
    expect(width / height).toBeCloseTo(1.5);
  });

  it.each([
    ["fr", "France", ["#0055A4", "#EF4135", "#FFFFFF"]],
    ["en", "Royaume-Uni (anglais britannique)", ["#012169", "#C8102E", "#FFFFFF"]],
    ["es", "Espagne (drapeau civil)", ["#AA151B", "#F1BF00"]],
  ] as const)("devrait peindre pour « %s » le drapeau %s, de ses seules couleurs officielles", (locale, _country, colors) => {
    expect(paints(drawFlag(locale))).toEqual(colors);
  });
});
