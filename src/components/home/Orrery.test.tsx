import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_STRINGS } from "@/components/home/home.strings";
import { Orrery } from "@/components/home/Orrery";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { julianDate } from "@/lib/astro/ephemeris";
import type { PlanetKey } from "@/lib/astro/planets";
import { clockHour, glideLongitude, orreryPlanets } from "@/lib/home/orrery";

/** Chargement de la page le 29 octobre 2026 à midi UTC : le même jour dans tous les fuseaux d'Europe et d'Amérique. */
const LOAD_TIME = Date.UTC(2026, 9, 29, 12);

/** Génération de la page quatre semaines plus tôt, le 1er octobre 2026 à midi UTC. */
const GENERATED_AT = Date.UTC(2026, 9, 1, 12);

function inLocale(locale: Locale, generatedAt = GENERATED_AT) {
  return (
    <LocaleProvider locale={locale}>
      <Orrery generatedAt={generatedAt} />
    </LocaleProvider>
  );
}

/** Rendu serveur posé dans un conteneur du document, comme le reçoit le navigateur. */
function serverRendered(locale: Locale, generatedAt = GENERATED_AT): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = renderToString(inLocale(locale, generatedAt));
  document.body.append(container);
  return container;
}

/** Textes des entrées de la légende, dans l'ordre. */
function legendEntries(container: HTMLElement): string[] {
  const legend = container.querySelector("ul");
  return legend ? within(legend).getAllByRole("listitem").map((item) => item.textContent ?? "") : [];
}

/** Rotation autour du Soleil (°) d'une planète dessinée : la première de son `transform`, l'opposé de sa longitude. */
function rotationOf(container: ParentNode, key: PlanetKey): number {
  const style = container.querySelector(`[data-planet="${key}"]`)?.getAttribute("style") ?? "";
  const match = /rotate\((-?[\d.]+)deg\)/.exec(style);
  if (!match) throw new Error(`Aucune rotation pour ${key} : « ${style} »`);
  return Number(match[1]);
}

/** Longitudes (°) des huit planètes à un instant. */
function longitudesAt(ms: number): Map<PlanetKey, number> {
  return new Map(orreryPlanets(julianDate(ms)).map((planet) => [planet.key, planet.longitudeDeg]));
}

beforeEach(() => {
  vi.spyOn(performance, "timeOrigin", "get").mockReturnValue(LOAD_TIME);
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Orrery, rendu serveur", () => {
  it("devrait dessiner les huit planètes dès le serveur, aux positions du jour de la génération, daté de ce jour", () => {
    const container = serverRendered("fr");
    expect(container.querySelectorAll("[data-orbit]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-planet]")).toHaveLength(8);
    longitudesAt(GENERATED_AT).forEach((longitude, key) => {
      expect(rotationOf(container, key)).toBeCloseTo(-longitude, 2);
    });
    expect(container.querySelector("[data-date]")?.textContent).toBe("Positions réelles du 1 octobre 2026");
    expect(container.querySelector("time")).toHaveAttribute("dateTime", "2026-10-01");
  });

  it("devrait déjà nommer les huit planètes et dire où est chacune, la Terre comme « vous êtes ici »", () => {
    const container = serverRendered("fr");
    const t = HOME_STRINGS.fr;
    const names = ["Mercure", "Vénus", "Terre (vous êtes ici)", "Mars", "Jupiter", "Saturne", "Uranus", "Neptune"];
    const hours = [...longitudesAt(GENERATED_AT).values()].map(clockHour);
    expect(legendEntries(container)).toEqual(names.map((name, index) => `${name}, ${t.clock(hours[index])}`));
    expect(container.querySelector("ul")).toHaveAttribute("aria-label", t.legendWithPositions);
  });

  it("ne devrait poser aucune étiquette avant le script : elles se mesurent dans la page", () => {
    const container = serverRendered("fr");
    expect(container.querySelectorAll("[data-placed], [data-leader]")).toHaveLength(0);
    expect(container.textContent).not.toContain("Vous êtes ici");
  });

  it("devrait réserver la place de la date la plus longue de la langue, pour que la ligne ne bouge pas", () => {
    const container = serverRendered("es");
    expect(container.querySelector("[data-reserve]")).toHaveAttribute("data-reserve", HOME_STRINGS.es.dateReserve);
  });
});

describe("Orrery, à l'hydratation", () => {
  /** Hydrate le rendu serveur et rend le conteneur, une fois les planètes menées au chargement. */
  async function hydrated(generatedAt = GENERATED_AT) {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable: unknown[] = [];
    const container = serverRendered("fr", generatedAt);
    const root = await act(async () =>
      hydrateRoot(container, inLocale("fr", generatedAt), { onRecoverableError: (error) => recoverable.push(error) }),
    );
    return { container, root, errors, recoverable };
  }

  it("devrait reprendre le rendu serveur sans écart", async () => {
    const { root, errors, recoverable } = await hydrated();
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it("devrait faire glisser chaque planète de la génération au chargement, en avant sur son orbite", async () => {
    const { container, root } = await hydrated();
    const from = longitudesAt(GENERATED_AT);
    longitudesAt(LOAD_TIME).forEach((longitude, key) => {
      const start = from.get(key) ?? 0;
      expect(rotationOf(container, key)).toBeCloseTo(-glideLongitude(start, longitude, true), 2);
      // Quatre semaines : Mercure fait un tiers de tour, toutes avancent, aucune ne fait un tour complet.
      expect(-rotationOf(container, key) - start).toBeGreaterThan(0);
      expect(-rotationOf(container, key) - start).toBeLessThan(360);
    });
    expect(container.querySelector("[data-glide]")).not.toBeNull();
    expect(container.querySelector("[data-date]")?.textContent).toBe("Positions réelles du 29 octobre 2026");
    expect(container.querySelector("time")).toHaveAttribute("dateTime", "2026-10-29");
    act(() => root.unmount());
  });

  it("ne devrait rien faire glisser quand la page est chargée à l'heure de sa génération", async () => {
    const { container, root } = await hydrated(LOAD_TIME);
    expect(container.querySelector("[data-glide]")).toBeNull();
    act(() => root.unmount());
  });
});

describe("Orrery, après le montage", () => {
  it("devrait dater la ligne et nommer le dessin dans la langue de la page (en)", () => {
    render(inLocale("en"));
    expect(document.querySelectorAll("[data-planet]")).toHaveLength(8);
    expect(document.querySelector("[data-date]")?.textContent).toBe("Real positions on 29 October 2026");
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "The eight planets around the Sun, seen from above Real positions on 29 October 2026",
    );
    expect(screen.getByText("29 October 2026").closest("time")).toHaveAttribute("dateTime", "2026-10-29");
  });

  it("devrait partir des positions du chargement, sans glisser, quand il se monte dans le navigateur", () => {
    const { container } = render(inLocale("fr"));
    longitudesAt(LOAD_TIME).forEach((longitude, key) => {
      expect(rotationOf(container, key)).toBeCloseTo(-longitude, 2);
    });
    expect(container.querySelector("[data-glide]")).toBeNull();
  });

  it("devrait dire où est chaque planète autour du Soleil, comme l'heure d'un cadran (es)", () => {
    render(inLocale("es"));
    expect(screen.getByRole("list", { name: HOME_STRINGS.es.legendWithPositions })).toBeInTheDocument();
    expect(legendEntries(document.body)).toEqual([
      "Mercurio, a las 3",
      "Venus, a las 2",
      "Tierra (estás aquí), a las 2",
      "Marte, a las 12",
      "Júpiter, a las 11",
      "Saturno, a las 3",
      "Urano, a la 1",
      "Neptuno, a las 3",
    ]);
  });

  it("devrait distinguer Saturne et la Terre par leurs anneaux, pas par la couleur seule", () => {
    render(inLocale("fr"));
    expect(document.querySelector('[data-planet="saturn"] [data-ring]')).not.toBeNull();
    expect(document.querySelector('[data-planet="earth"] [data-here]')).not.toBeNull();
    expect(document.querySelectorAll("[data-ring]")).toHaveLength(2); // dessin et légende
    expect(document.querySelectorAll("[data-here]")).toHaveLength(2);
  });

  it("devrait poser les étiquettes du dessin une fois mesurées, cachées aux lecteurs d'écran", async () => {
    measureLabels();
    render(inLocale("fr"));
    await waitFor(() => expect(screen.getByText("Vous êtes ici")).toHaveAttribute("data-placed"));
    expect(screen.getByText("Vous êtes ici").closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
  });

  it("devrait nommer chaque planète, et relier par un filet de laiton celles du groupe intérieur", async () => {
    measureLabels();
    render(inLocale("fr"));
    await waitFor(() => expect(document.querySelectorAll("[data-placed]")).toHaveLength(8));
    // Mercure et Vénus, serrées contre le Soleil, ont toujours leur étiquette reportée au-delà de l'orbite de Mars.
    expect(document.querySelector('[data-leader="mercury"]')).not.toBeNull();
    expect(document.querySelector('[data-leader="venus"]')).not.toBeNull();
    expect(document.querySelector("svg [data-leader]")?.closest("svg")).toBe(screen.getByRole("img"));
  });

  it("ne devrait pas montrer la légende quand chaque planète a son étiquette : elle la répéterait", async () => {
    measureLabels();
    const { container } = render(inLocale("fr"));
    await waitFor(() => expect(document.querySelectorAll("[data-placed]")).toHaveLength(8));
    expect(container.firstElementChild).not.toHaveAttribute("data-legend");
  });

  it("devrait montrer la légende quand une étiquette ne trouve pas de place (texte très agrandi)", async () => {
    measureLabels(400);
    const { container } = render(inLocale("fr"));
    await waitFor(() => expect(container.firstElementChild).toHaveAttribute("data-legend"));
    expect(legendEntries(container)).toHaveLength(8);
  });
});

/** Boîte du dessin de 544 px et étiquettes de `width` × 16 px, observées dès le montage. */
function measureLabels(width = 60) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {}
      observe() {
        this.callback();
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(544);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(16);
}
