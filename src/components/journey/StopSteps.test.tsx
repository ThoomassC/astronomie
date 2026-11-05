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
