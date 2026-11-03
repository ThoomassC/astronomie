import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScreenFades } from "@/components/journey/ScreenFades";

afterEach(() => {
  cleanup();
});

describe("ScreenFades", () => {
  it("devrait poser sous la barre et sous le dock deux fondus décoratifs, effacés pendant l'exploration", () => {
    const { container } = render(<ScreenFades />);
    const fades = Array.from(container.children);
    expect(fades.map((fade) => fade.className)).toEqual(["bar-fade", "dock-fade"]);
    for (const fade of fades) {
      expect(fade).toHaveAttribute("aria-hidden", "true");
      expect(fade).toHaveAttribute("data-hide-on-explore");
      expect(fade).toBeEmptyDOMElement();
    }
  });

  it("devrait déclarer les fondus sur <html> tant que la page est affichée, pour les marges de défilement", () => {
    const { unmount } = render(<ScreenFades />);
    expect(document.documentElement).toHaveAttribute("data-fades");
    // Page quittée (démontée, ou masquée sous <Activity>, qui nettoie ses effets) : la marque part avec elle.
    unmount();
    expect(document.documentElement).not.toHaveAttribute("data-fades");
  });
});
