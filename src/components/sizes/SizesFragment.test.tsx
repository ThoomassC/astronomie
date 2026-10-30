import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SizesFragment } from "@/components/sizes/SizesFragment";
import { currentFragment } from "@/lib/site/fragment";
import { sizesStore } from "@/lib/sizes/store";

afterEach(() => {
  cleanup();
  act(() => sizesStore.reset());
});

describe("SizesFragment", () => {
  it("devrait donner au changement de langue l'ancre de l'étoile affichée, lue au moment du clic", () => {
    render(<SizesFragment />);
    expect(currentFragment()).toBe("#tailles");
    act(() => sizesStore.update("betelgeuse", "betelgeuse", 0));
    expect(currentFragment()).toBe("#betelgeuse");
  });

  it("ne devrait plus rien donner une fois la page quittée", () => {
    const { unmount } = render(<SizesFragment />);
    unmount();
    expect(currentFragment()).toBeNull();
  });
});
