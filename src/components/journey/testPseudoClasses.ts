import { vi } from "vitest";

/**
 * Frontière navigateur, pour les tests : jsdom ne suit ni le survol (`:hover` n'y vaut jamais) ni, de façon fiable, le
 * focus clavier visible (`:focus-visible`). Ici, `:hover` ne vaut que pour `hover` et `:focus-visible` que pour
 * `focusVisible` ; tout autre sélecteur garde son sens. À défaire par `vi.restoreAllMocks()`.
 */
export function stubPseudoClasses({ hover, focusVisible }: { hover?: Element; focusVisible?: Element }): void {
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
    if (selector === ":hover") return this === hover;
    if (selector === ":focus-visible") return this === focusVisible;
    return matches.call(this, selector);
  });
}
