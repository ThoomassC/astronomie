import { cleanup, render } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";

/** Scène qui lève une erreur au rendu : module qui ne se charge pas, exception au montage. */
function BrokenScene(): never {
  throw new Error("Scène en panne");
}

beforeEach(() => {
  // React et la frontière signalent l'erreur sur la console : bruit attendu ici.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SceneErrorBoundary", () => {
  it("devrait passer la page au repli sans scène quand la scène lève une erreur, puis le retirer au démontage", () => {
    const { container, unmount } = render(
      <SceneErrorBoundary>
        <BrokenScene />
      </SceneErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(document.body).toHaveClass("no3d");
    unmount();
    expect(document.body).not.toHaveClass("no3d");
  });

  /*
   * Next 16, avec `cacheComponents`, garde la page quittée dans le DOM, masquée sous <Activity> : ses effets sont
   * nettoyés (componentWillUnmount), puis relancés au retour (componentDidMount), son état est gardé.
   */
  describe("page masquée puis affichée de nouveau (Activity)", () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <SceneErrorBoundary>
          <BrokenScene />
        </SceneErrorBoundary>
      </Activity>
    );

    it("devrait retirer le repli quand la page en panne est masquée : la page affichée a peut-être sa scène", () => {
      const { rerender } = render(page("visible"));
      rerender(page("hidden"));
      expect(document.body).not.toHaveClass("no3d");
    });

    it("devrait remettre le repli au retour sur la page, sans quoi le canevas figé resterait à l'écran", () => {
      const { rerender } = render(page("visible"));
      rerender(page("hidden"));
      rerender(page("visible"));
      expect(document.body).toHaveClass("no3d");
    });
  });

  it("ne devrait rien changer quand la scène se rend sans erreur, ni au masquage ni au retour", () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <SceneErrorBoundary>
          <canvas />
        </SceneErrorBoundary>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    expect(document.body).not.toHaveClass("no3d");
    rerender(page("hidden"));
    rerender(page("visible"));
    expect(document.body).not.toHaveClass("no3d");
  });
});
