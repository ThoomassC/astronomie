import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SizesScene from "@/components/sizes/SizesScene";
import { LocaleProvider } from "@/i18n/LocaleProvider";

/*
 * Scène de la page « Tailles » dans jsdom, sans WebGL : c'est le navigateur sans WebGL ou en rendu logiciel. La page
 * passe au repli sans scène (`no3d` sur <body>), et le retire en quittant la page.
 */

beforeEach(() => {
  // jsdom signale sur la console que le canevas n'a pas de contexte WebGL : bruit attendu ici.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SizesScene sans WebGL", () => {
  it("devrait passer au repli sans scène, puis le retirer au démontage", () => {
    const { unmount } = render(<SizesScene />);
    expect(document.body).toHaveClass("no3d");
    unmount();
    expect(document.body).not.toHaveClass("no3d");
  });

  it("devrait cacher aux lecteurs d'écran le canevas, les étiquettes et l'échelle graphique : les plaques portent les nombres", () => {
    const { container } = render(<SizesScene />);
    const children = Array.from(container.children);
    expect(children.length).toBeGreaterThan(0);
    expect(children.every((child) => child.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("devrait nommer chaque astre dans la langue de la page, taille comprise (es : « Sirio A · 1,711 R☉ »)", () => {
    const { container } = render(
      <LocaleProvider locale="es">
        <SizesScene />
      </LocaleProvider>,
    );
    const texts = Array.from(container.querySelectorAll("[data-ring] > span"), (label) => label.textContent);
    expect(texts).toHaveLength(14);
    expect(texts).toContain("Sirio A · 1,711 R☉");
    expect(texts).toContain("Próxima Centauri · 0,154 R☉");
    expect(texts).toContain("Sagitario A* · 47,4 R☉");
    expect(texts).toContain("Cygnus X-1 · 163 km");
  });

  it("devrait donner à chaque astre une étiquette de limbe, quatorze (fr)", () => {
    const { container } = render(<SizesScene />);
    expect(container.querySelectorAll("[data-limb]")).toHaveLength(14);
    expect(container.querySelector('[data-limb="m87-star"] > span')).toHaveTextContent("M87* · 72\u202f000 R☉", {
      normalizeWhitespace: false,
    });
  });

  it("devrait écrire la taille de l'étiquette de limbe à part (`.dist`), que la forme courte masque (en : « Rigel · 74 R☉ »)", () => {
    const { container } = render(
      <LocaleProvider locale="en">
        <SizesScene />
      </LocaleProvider>,
    );
    const limb = container.querySelector('[data-limb="rigel"] > span');
    expect(limb).toHaveTextContent("Rigel · 74 R☉");
    expect(limb?.querySelector(".dist")).toHaveTextContent("· 74 R☉");
  });

  it("devrait donner au Soleil devenu un point l'anneau « ici », avec son nom et son rayon (fr : « Soleil · 1 R☉ »)", () => {
    const { container } = render(<SizesScene />);
    expect(container.querySelector("[data-sun-here]")).toHaveTextContent("Soleil · 1 R☉");
  });
});
