import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LiveDistance } from "@/components/journey/LiveDistance";
import { renderIn } from "@/components/modules/testUtils";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { getClock } from "@/lib/sim/clock";

/*
 * Instant simulé : le 29 octobre 2026 à midi UTC. La Terre est à 0,99333 UA du Soleil (148,600 millions de km),
 * à 8,528 UA de Saturne et à 29,048 UA de Neptune : 8 min 15 s, 1 h 10 min et 4 h 01 min de lumière.
 */
const NOW = Date.UTC(2026, 9, 29, 12);

type Target = "sun" | "earth" | "neptune";

/** La ligne « ce jour » de la fiche, dans sa liste de faits. */
const fact = (target: Target) => (
  <dl>
    <dt>…</dt>
    <LiveDistance target={target} />
  </dl>
);

/** Distance, puis seconde ligne, telles qu'affichées. */
function shown(container: HTMLElement): [string, string] {
  const dd = container.querySelector("dd");
  return [dd?.firstChild?.textContent ?? "", dd?.querySelector("small")?.textContent ?? ""];
}

beforeEach(() => {
  act(() => getClock().reset(NOW));
});

afterEach(() => {
  cleanup();
});

describe("LiveDistance", () => {
  it.each([
    ["sun", "0,99 UA", "soit 8 min 15 s à la vitesse de la lumière"],
    ["earth", "0,9933 UA", "148,6 millions de km"],
    ["neptune", "29,0 UA", "soit 4 h 01 min à la vitesse de la lumière"],
  ] as const)(
    "devrait écrire la distance du jour en français, hors fournisseur de langue (%s)",
    (target, value, note) => {
      const { container } = render(fact(target));
      expect(shown(container)).toEqual([value, note]);
    },
  );

  it.each([
    ["en", "sun", "0.99 AU", "i.e. 8 min 15 s at the speed of light"],
    ["en", "earth", "0.9933 AU", "148.6 million km"],
    ["en", "neptune", "29.0 AU", "i.e. 4 h 01 min at the speed of light"],
    ["es", "sun", "0,99 UA", "es decir, 8 min 15 s a la velocidad de la luz"],
    ["es", "earth", "0,9933 UA", "148,6 millones de km"],
    ["es", "neptune", "29,0 UA", "es decir, 4 h 01 min a la velocidad de la luz"],
  ] as const)(
    "devrait écrire la distance du jour dans la langue de la page (%s, %s)",
    (locale, target, value, note) => {
      const { container } = renderIn(locale, fact(target));
      expect(shown(container)).toEqual([value, note]);
    },
  );

  it.each(["fr", "en", "es"] as const)(
    "devrait réserver la ligne avant l'horloge, au rendu serveur, sans texte dans la langue (%s)",
    (locale: Locale) => {
      const html = renderToString(<LocaleProvider locale={locale}>{fact("sun")}</LocaleProvider>);
      expect(html).toContain("<dd>–<small>\u00a0</small></dd>");
    },
  );
});
