import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JourneySteps } from "@/components/journey/StopSteps";
import { LOCALES } from "@/i18n/locales";
import { RAIL_STOPS } from "@/lib/journey/camera";
import { stopAnchor } from "@/lib/journey/stopIds";

/** Défilement piloté vers l'escale (navigation.ts) : le lien le demande, l'ancre native reste le repli. */
const navigation = vi.hoisted(() => ({ goTo: vi.fn<(key: string) => boolean>(() => true) }));
vi.mock("@/components/journey/navigation", () => navigation);

afterEach(() => {
  cleanup();
  navigation.goTo.mockClear();
});

/** Liens des escales voisines, dans l'ordre du DOM : nom accessible, texte affiché, ancre. */
function steps(container: HTMLElement): [string, string | null, string | null][] {
  return within(container)
    .queryAllByRole("link")
    .map((link) => [link.getAttribute("aria-label") ?? "", link.textContent, link.getAttribute("href")]);
}

describe("JourneySteps", () => {
  it("devrait mener de Mars à la Terre et à la ceinture d'astéroïdes, la flèche et le nom court affichés", () => {
    const { container } = render(<JourneySteps stop="mars" locale="fr" />);
    expect(steps(container)).toEqual([
      ["Escale précédente\u00a0: Terre", "Terre", stopAnchor("earth")],
      ["Escale suivante\u00a0: Astéroïdes", "Astéroïdes", stopAnchor("belt")],
    ]);
  });

  it("ne devrait proposer que la suivante au Soleil : la vue d'ensemble n'est pas une escale", () => {
    const { container } = render(<JourneySteps stop="sun" locale="en" />);
    expect(steps(container)).toEqual([["Next stop: Mercury", "Mercury", stopAnchor("mercury")]]);
  });

  it("ne devrait proposer que la précédente au multivers, sans doubler « Revenir au Soleil »", () => {
    const { container } = render(<JourneySteps stop="multiverse" locale="es" />);
    expect(steps(container)).toEqual([
      ["Escala anterior: Universo observable", "Universo observable", stopAnchor("universe")],
    ]);
  });

  it("devrait laisser la flèche aux yeux seulement", () => {
    const { container } = render(<JourneySteps stop="earth" locale="fr" />);
    for (const arrow of container.querySelectorAll("svg")) expect(arrow).toHaveAttribute("aria-hidden", "true");
  });

  /* Critère 2.5.3 : le nom accessible contient le texte affiché, pour qui commande à la voix. */
  it.each(LOCALES)("devrait garder dans chaque nom accessible le nom affiché, à chaque escale (%s)", (locale) => {
    for (const { key } of RAIL_STOPS) {
      const { container, unmount } = render(<JourneySteps stop={key} locale={locale} />);
      for (const [label, text] of steps(container)) expect(label, `${key} : ${text}`).toContain(text);
      unmount();
    }
  });

  it("devrait faire défiler jusqu'à l'escale visée par le défilement piloté, sans suivre l'ancre", () => {
    render(<JourneySteps stop="mars" locale="fr" />);
    const next = screen.getByRole("link", { name: "Escale suivante\u00a0: Astéroïdes" });
    expect(fireEvent.click(next)).toBe(false);
    expect(navigation.goTo).toHaveBeenCalledWith("belt");
  });
});

/*
 * Où paraissent les escales voisines (globals.css, lue telle quelle) : partout où la règle cède la place au menu des
 * escales (téléphone en portrait et en paysage, fenêtres de 860 px et moins), et, sans JavaScript, en mise en page
 * compacte. Dans la plaque compacte, deux flèches au bout de la rangée des titres-boutons, hors du flux : aucune rangée
 * de plus, qui rognerait la bande libre de la scène (screen.test.ts, téléphone court).
 */
describe("feuille de style des escales voisines", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  const COMPACT_SCRIPTED = "(max-width: 640px) and (scripting: enabled), (max-width: 1100px) and (orientation: portrait) and (scripting: enabled)";

  /** Conditions de la requête du bloc média qui contient `marker`. */
  function conditionsAround(marker: string): string[] {
    const at = css.indexOf(marker);
    expect(at, marker).toBeGreaterThan(0);
    const start = css.lastIndexOf("@media", at);
    return css
      .slice(start + "@media".length, css.indexOf("{", start))
      .split(",")
      .map((condition) => condition.replace(/\s+/g, " ").trim());
  }

  /** Déclarations de la règle `selector` (indentation de 2) du bloc média de requête `query`. */
  function ruleIn(query: string, selector: string): string {
    const at = css.indexOf(`@media ${query} {`);
    expect(at, query).toBeGreaterThan(0);
    const block = css.slice(at, css.indexOf("\n}", at));
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = new RegExp(`\\n {2}${escaped} \\{([^}]*)\\}`).exec(block)?.[1];
    expect(rule, selector).toBeDefined();
    return rule ?? "";
  }

  it("devrait les afficher là où la règle cède la place au menu, en paysage bas compris, et en compact sans script", () => {
    expect(conditionsAround(".stop-steps {\n    display: flex;")).toEqual([
      "(max-width: 640px)",
      "(max-width: 1100px) and (orientation: portrait)",
      "(max-width: 860px) and (scripting: enabled)",
      "(max-height: 34.125rem) and (scripting: enabled)",
    ]);
  });

  it("devrait poser les flèches de la plaque compacte hors du flux, au bout de la rangée des titres-boutons", () => {
    const steps = ruleIn(COMPACT_SCRIPTED, ".plate-sections > .stop-steps");
    expect(steps).toMatch(/position: absolute;/);
    expect(steps).toMatch(/top: 0;/);
    expect(steps).toMatch(/right: 0;/);
    expect(ruleIn(COMPACT_SCRIPTED, ".plate-sections")).toMatch(/position: relative;/);
  });

  it("devrait leur réserver la place au bout du premier titre-bouton, seul sur sa rangée : deux flèches, ou une", () => {
    const first = ruleIn(COMPACT_SCRIPTED, ".plate-sections > .more-heading:first-child");
    expect(first).toMatch(/flex-basis: 100%;/);
    expect(first).toMatch(/margin-right: calc\(2 \* 44px \+ 2 \* 0\.5rem\);/);
    expect(
      ruleIn(COMPACT_SCRIPTED, ".plate-sections:has(> .stop-steps > :only-child) > .more-heading:first-child"),
    ).toMatch(/margin-right: calc\(44px \+ 0\.5rem\);/);
  });

  it("devrait réduire chaque lien de la plaque compacte à sa flèche, 44 × 44, le nom gardé pour les lecteurs d'écran", () => {
    const link = ruleIn(COMPACT_SCRIPTED, ".plate-sections > .stop-steps .stop-step");
    expect(link).toMatch(/width: 44px;/);
    expect(link).toMatch(/min-height: 44px;/);
    expect(ruleIn(COMPACT_SCRIPTED, ".plate-sections > .stop-steps .stop-step > span")).toMatch(/clip: rect\(0 0 0 0\);/);
  });
});

