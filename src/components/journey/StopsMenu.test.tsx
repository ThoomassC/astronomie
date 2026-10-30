import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RailStop } from "@/components/journey/DistanceRail";
import { setRealScale } from "@/components/journey/realScale";
import { ScaleNote } from "@/components/journey/ScaleNote";
import { StopsMenu } from "@/components/journey/StopsMenu";
import { renderIn } from "@/components/modules/testUtils";
import { journeyStore } from "@/lib/journey/store";

const STOPS: readonly RailStop[] = [
  { key: "sun", au: 0, href: "#soleil" },
  { key: "mars", au: 1.524, href: "#mars" },
  { key: "beyond", au: 45, href: "#au-dela" },
];

beforeEach(() => {
  act(() => journeyStore.update("mars", "mars", 0));
});

afterEach(() => {
  act(() => setRealScale(false));
  cleanup();
  act(() => journeyStore.update("hero", "hero", 0));
  vi.unstubAllGlobals();
});

const toggle = () => screen.getByRole("button", { name: "Mars, changer d'escale" });

describe("StopsMenu", () => {
  it("devrait nommer l'escale en cours sur son bouton, liste fermée", () => {
    render(<StopsMenu stops={STOPS} />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("devrait ouvrir la liste des escales, avec leur ancre, et marquer celle où l'on est", async () => {
    const user = userEvent.setup();
    render(<StopsMenu stops={STOPS} />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Soleil/ })).toHaveAttribute("href", "#soleil");
    expect(screen.getByRole("link", { name: /Mars/ })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: /Soleil/ })).not.toHaveAttribute("aria-current");
  });

  it("devrait se refermer avec Échap, rendre le focus au bouton et ne fermer que lui", async () => {
    const user = userEvent.setup();
    render(<StopsMenu stops={STOPS} />);
    await user.click(toggle());
    // fireEvent renvoie false quand l'événement a été annulé : la note d'échelle ne se ferme pas avec lui.
    expect(fireEvent.keyDown(screen.getByRole("link", { name: /Soleil/ }), { key: "Escape" })).toBe(false);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait se refermer quand on choisit une escale", async () => {
    const user = userEvent.setup();
    render(<StopsMenu stops={STOPS} />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: /Soleil/ }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait se refermer quand on touche ailleurs dans la page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <StopsMenu stops={STOPS} />
        <p>Ailleurs</p>
      </>,
    );
    await user.click(toggle());
    fireEvent.pointerDown(screen.getByText("Ailleurs"));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait proposer « Escales » à l'accueil, qui n'est pas une escale de la liste", () => {
    act(() => journeyStore.update("hero", "hero", 0));
    render(<StopsMenu stops={STOPS} />);
    expect(screen.getByRole("button", { name: "Escales, choisir une escale" })).toBeInTheDocument();
  });

  it("devrait se refermer quand le focus quitte la liste (Tab après le dernier lien)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <StopsMenu stops={STOPS} />
        <button type="button">Partir du Soleil</button>
      </>,
    );
    await user.click(toggle());
    screen.getByRole("link", { name: /Au-delà/ }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Partir du Soleil" })).toHaveFocus();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("ne devrait pas masquer la note d'échelle avec l'Échap qui ferme la liste", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const user = userEvent.setup();
    render(
      <>
        <ScaleNote />
        <StopsMenu stops={STOPS} />
      </>,
    );
    // La note apparaît avant l'ouverture de la liste : son écouteur d'Échap est inscrit le premier.
    act(() => setRealScale(true));
    await user.click(toggle());
    await user.keyboard("{Escape}");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Masquer la note" })).toBeInTheDocument();
  });
});

describe("StopsMenu en anglais et en espagnol", () => {
  it.each([
    { locale: "en", home: "Stops, choose a stop" },
    { locale: "es", home: "Escalas, elegir una escala" },
  ] as const)("devrait proposer les escales à l'accueil, dans la langue de la page ($locale)", ({ locale, home }) => {
    act(() => journeyStore.update("hero", "hero", 0));
    renderIn(locale, <StopsMenu stops={STOPS} />);
    expect(screen.getByRole("button", { name: home })).toBeInTheDocument();
  });

  it.each([
    {
      locale: "en",
      nav: "Stops",
      toggle: "Mars, change stop",
      sun: "Sun",
      sunSub: "the centre",
      marsSub: "1.52 AU",
      beyond: "over 30 AU",
    },
    {
      locale: "es",
      nav: "Escalas",
      toggle: "Marte, cambiar de escala",
      sun: "Sol",
      sunSub: "el centro",
      marsSub: "1,52 UA",
      beyond: "más de 30 UA",
    },
  ] as const)("devrait nommer les escales et leur distance au Soleil dans la langue ($locale)", async (t) => {
    const user = userEvent.setup();
    renderIn(t.locale, <StopsMenu stops={STOPS} />);
    const menu = screen.getByRole("navigation", { name: t.nav });
    await user.click(within(menu).getByRole("button", { name: t.toggle }));
    const sun = within(menu).getByRole("link", { name: new RegExp(`^${t.sun}`) });
    expect(sun).toHaveAttribute("href", "#soleil");
    expect(within(sun).getByText(t.sunSub)).toBeInTheDocument();
    expect(within(menu).getByText(t.marsSub)).toBeInTheDocument();
    expect(within(menu).getByText(t.beyond)).toBeInTheDocument();
  });
});
