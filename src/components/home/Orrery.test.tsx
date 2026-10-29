import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_STRINGS } from "@/components/home/home.strings";
import { Orrery } from "@/components/home/Orrery";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";

/** Chargement de la page le 29 octobre 2026 à midi UTC : le même jour dans tous les fuseaux d'Europe et d'Amérique. */
const LOAD_TIME = Date.UTC(2026, 9, 29, 12);

function inLocale(locale: Locale) {
  return (
    <LocaleProvider locale={locale}>
      <Orrery />
    </LocaleProvider>
  );
}

/** Rendu serveur posé dans un conteneur du document, comme le reçoit le navigateur. */
function serverRendered(locale: Locale): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = renderToString(inLocale(locale));
  document.body.append(container);
  return container;
}

/** Textes des entrées de la légende, dans l'ordre. */
function legendEntries(container: HTMLElement): string[] {
  const legend = container.querySelector("ul");
  return legend ? within(legend).getAllByRole("listitem").map((item) => item.textContent ?? "") : [];
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
  it("devrait dessiner les huit orbites et le Soleil, sans aucune planète, et dater d'un tiret", () => {
    const container = serverRendered("fr");
    expect(container.querySelectorAll("[data-orbit]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-planet]")).toHaveLength(0);
    expect(container.querySelector("[data-date]")?.textContent).toBe("Positions réelles du –");
  });

  it("devrait déjà nommer les huit planètes dans la légende, la Terre comme « vous êtes ici »", () => {
    const container = serverRendered("fr");
    expect(legendEntries(container)).toEqual([
      "Mercure",
      "Vénus",
      "Terre (vous êtes ici)",
      "Mars",
      "Jupiter",
      "Saturne",
      "Uranus",
      "Neptune",
    ]);
  });

  it("devrait réserver la place de la date la plus longue de la langue, pour que la ligne ne bouge pas", () => {
    const container = serverRendered("es");
    expect(container.querySelector("[data-reserve]")).toHaveAttribute("data-reserve", HOME_STRINGS.es.dateReserve);
  });
});

describe("Orrery, à l'hydratation", () => {
  it("devrait reprendre le rendu serveur sans écart, puis poser les huit planètes", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable: unknown[] = [];
    const container = serverRendered("fr");
    const root = await act(async () =>
      hydrateRoot(container, inLocale("fr"), { onRecoverableError: (error) => recoverable.push(error) }),
    );
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelectorAll("[data-planet]")).toHaveLength(8);
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
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(60);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(16);
    render(inLocale("fr"));
    await waitFor(() => expect(screen.getByText("Vous êtes ici")).toHaveAttribute("data-placed"));
    expect(screen.getByText("Vous êtes ici").closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
  });
});
