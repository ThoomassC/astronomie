import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PLATE_ICONS, PlateIcon } from "@/components/journey/PlateIcon";

afterEach(cleanup);

/*
 * Pictogrammes des titres-boutons de la plaque compacte : un par type de section, au trait fin (couleur du texte du
 * bouton, laiton au repos), décoratifs : le libellé du bouton reste son nom accessible.
 */
describe("PlateIcon", () => {
  it.each(PLATE_ICONS)("devrait dessiner « %s » au trait, décoratif, hors de l'ordre de tabulation", (name) => {
    const { container } = render(<PlateIcon name={name} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-icon", name);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg?.children.length).toBeGreaterThan(0);
  });

  it("devrait donner à chaque type de section un dessin qui lui est propre", () => {
    const drawings = PLATE_ICONS.map((name) => {
      const { container, unmount } = render(<PlateIcon name={name} />);
      const drawing = container.querySelector("svg")?.innerHTML;
      unmount();
      return drawing;
    });
    expect(new Set(drawings).size).toBe(PLATE_ICONS.length);
  });
});
