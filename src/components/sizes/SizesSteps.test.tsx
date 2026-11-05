import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SizesSteps } from "@/components/sizes/SizesSteps";
import { LOCALES } from "@/i18n/locales";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { sizeStopAnchor } from "@/lib/sizes/stops";

afterEach(() => {
  cleanup();
});

/** Liens des astres voisins, dans l'ordre du DOM : nom accessible, texte affiché, ancre. */
function steps(container: HTMLElement): [string, string | null, string | null][] {
  return within(container)
    .queryAllByRole("link")
    .map((link) => [link.getAttribute("aria-label") ?? "", link.textContent, link.getAttribute("href")]);
}

describe("SizesSteps", () => {
  it("devrait mener du Soleil à Proxima du Centaure et à Sirius A", () => {
    const { container } = render(<SizesSteps object="sun" locale="fr" />);
    expect(steps(container)).toEqual([
      ["Astre précédent\u00a0: Proxima du Centaure", "Proxima du Centaure", sizeStopAnchor("proxima-centauri")],
      ["Astre suivant\u00a0: Sirius A", "Sirius A", sizeStopAnchor("sirius-a")],
    ]);
  });

  it("devrait afficher le nom court d'un astre au nom long, et le dire en entier", () => {
    const { container } = render(<SizesSteps object="m87-star" locale="fr" />);
    expect(steps(container)[1]).toEqual([
      "Astre suivant\u00a0: Trou noir du Fer à cheval cosmique",
      "Fer à cheval cosmique",
      sizeStopAnchor("cosmic-horseshoe"),
    ]);
  });

  it("ne devrait proposer que le suivant au plus petit astre : l'introduction n'est pas une escale", () => {
    const { container } = render(<SizesSteps object="cygnus-x-1" locale="en" />);
    expect(steps(container)).toEqual([["Next object: Proxima Centauri", "Proxima Centauri", sizeStopAnchor("proxima-centauri")]]);
  });

  it("ne devrait proposer que le précédent au plus grand, sans doubler « Revenir au plus petit »", () => {
    const { container } = render(<SizesSteps object="cosmic-horseshoe" locale="es" />);
    expect(steps(container)).toEqual([["Astro anterior: M87*", "M87*", sizeStopAnchor("m87-star")]]);
  });

  /* Critère 2.5.3 : le nom accessible contient le texte affiché, pour qui commande à la voix. */
  it.each(LOCALES)("devrait garder dans chaque nom accessible le nom affiché, pour chaque astre (%s)", (locale) => {
    for (const { key } of COMPARED_OBJECTS) {
      const { container, unmount } = render(<SizesSteps object={key} locale={locale} />);
      for (const [label, text] of steps(container)) expect(label, `${key} : ${text}`).toContain(text);
      unmount();
    }
  });
});
