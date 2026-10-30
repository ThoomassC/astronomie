import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimDate } from "@/components/journey/SimDate";
import { renderIn } from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";
import { DAY_MS } from "@/lib/astro/constants";
import { getClock } from "@/lib/sim/clock";

/** Midi UTC le 29 octobre 2026 : le même jour dans tous les fuseaux d'Europe et d'Amérique. */
const NOW = Date.UTC(2026, 9, 29, 12);

/** Requêtes du dock qui répondent vrai ; les autres, faux (grand écran par défaut). */
let matching: readonly string[] = [];

beforeEach(() => {
  matching = [];
  // Frontière navigateur : jsdom n'a pas de matchMedia ; l'heure réelle est figée, pas les minuteurs.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  act(() => getClock().reset(NOW));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Date simulée et écart avec aujourd'hui, tels qu'affichés. */
function shown(container: HTMLElement): { date: string; relative: string } {
  const date = container.querySelector(".date > span")?.textContent ?? "";
  const relative = container.querySelector(".date > small")?.textContent ?? "";
  return { date, relative };
}

const renderDate = (locale: Locale) => renderIn(locale, <SimDate />);

describe("SimDate", () => {
  it("devrait écrire la date en toutes lettres et « aujourd'hui » en français, hors fournisseur de langue", () => {
    const { container } = render(<SimDate />);
    expect(shown(container)).toEqual({ date: "29 octobre 2026", relative: "aujourd'hui" });
  });

  it.each([
    { locale: "en", date: "29 October 2026", relative: "today" },
    { locale: "es", date: "29 de octubre de 2026", relative: "hoy" },
  ] as const)("devrait écrire la date et l'écart dans la langue de la page ($locale)", ({ locale, date, relative }) => {
    const { container } = renderDate(locale);
    expect(shown(container)).toEqual({ date, relative });
  });

  it.each([
    { locale: "en", relative: "3 months ago" },
    { locale: "es", relative: "hace 3 meses" },
  ] as const)("devrait suivre l'horloge, écart compris ($locale : « $relative »)", ({ locale, relative }) => {
    const { container } = renderDate(locale);
    act(() => getClock().reset(NOW - 90 * DAY_MS));
    expect(shown(container).relative).toBe(relative);
  });

  describe("selon la largeur de l'écran", () => {
    it.each([
      { locale: "fr", date: "29 oct. 2026" },
      { locale: "en", date: "29 Oct 2026" },
      { locale: "es", date: "29 oct 2026" },
    ] as const)("devrait abréger le mois dans le dock compact ($locale : « $date »)", ({ locale, date }) => {
      matching = ["(max-width: 47.5rem)", "(max-width: 56.25rem)"];
      const { container } = renderDate(locale);
      expect(shown(container).date).toBe(date);
    });

    it.each(["fr", "en", "es"] as const)("devrait passer en chiffres sous 360 px (%s)", (locale) => {
      matching = ["(max-width: 359px)", "(max-width: 47.5rem)", "(max-width: 56.25rem)"];
      const { container } = renderDate(locale);
      expect(shown(container).date).toBe("29/10/26");
    });

    /*
     * De 761 à 900 px, les boutons du dock perdent leur libellé mais la date reste longue : « 30 de septiembre de
     * 2026 » n'y tient pas, l'espagnol passe déjà à la date courte.
     */
    it.each([
      { locale: "fr", date: "29 octobre 2026" },
      { locale: "en", date: "29 October 2026" },
      { locale: "es", date: "29 oct 2026" },
    ] as const)(
      "devrait garder la date longue de 761 à 900 px, sauf en espagnol ($locale : « $date »)",
      ({ locale, date }) => {
        matching = ["(max-width: 56.25rem)"];
        const { container } = renderDate(locale);
        expect(shown(container).date).toBe(date);
      },
    );
  });
});
