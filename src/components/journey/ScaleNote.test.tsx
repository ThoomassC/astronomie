import { act, cleanup, fireEvent, getDefaultNormalizer, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOCK_SCALE_TOGGLE_ID } from "@/components/journey/ids";
import { ScaleNote } from "@/components/journey/ScaleNote";
import { setRealScale } from "@/components/journey/realScale";
import { SCALE_STRINGS } from "@/components/journey/scale.strings";
import { renderIn } from "@/components/modules/testUtils";
import { journeyStore } from "@/lib/journey/store";

/** Texte de la note, en français (hors fournisseur de langue). */
const NOTE = SCALE_STRINGS.fr.note;

/** Recherche du texte exact : par défaut, l'espace insécable de « réelles : » deviendrait une espace ordinaire. */
const EXACT = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

beforeEach(() => {
  // La note publie sa hauteur pour les marges de défilement (jsdom n'a pas de ResizeObserver).
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  act(() => setRealScale(false));
  cleanup();
  vi.unstubAllGlobals();
});

/** La note et la bascule « distances réelles » du dock, qui reçoit le focus quand la note se ferme. */
function renderWithDock() {
  return render(
    <>
      <ScaleNote />
      <button type="button" id={DOCK_SCALE_TOGGLE_ID}>
        Distances réelles
      </button>
    </>,
  );
}

describe("ScaleNote", () => {
  it("devrait apparaître avec les distances réelles", () => {
    render(<ScaleNote />);
    expect(screen.queryByRole("button", { name: "Masquer la note" })).not.toBeInTheDocument();
    act(() => setRealScale(true));
    expect(screen.getByRole("button", { name: "Masquer la note" })).toBeInTheDocument();
  });

  it("devrait se masquer avec Échap, où que soit le focus", async () => {
    const user = userEvent.setup();
    render(<ScaleNote />);
    act(() => setRealScale(true));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Masquer la note" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("devrait rendre le focus à la bascule du dock après « Masquer la note », même sans focus préalable", () => {
    renderWithDock();
    act(() => setRealScale(true));
    // Au toucher (Safari, VoiceOver), le bouton ne reçoit pas toujours le focus avant le clic.
    fireEvent.click(screen.getByRole("button", { name: "Masquer la note" }));
    expect(screen.getByRole("button", { name: "Distances réelles" })).toHaveFocus();
  });

  it("devrait laisser la note quand Échap a déjà fermé autre chose (infobulle de la règle)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ScaleNote />
        <button type="button" onKeyDown={(event) => event.key === "Escape" && event.preventDefault()}>
          Lien de la règle
        </button>
      </>,
    );
    act(() => setRealScale(true));
    await user.click(screen.getByRole("button", { name: "Lien de la règle" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Masquer la note" })).toBeInTheDocument();
  });

  it("devrait proposer de lire toute la note, qui reste entière pour les lecteurs d'écran", async () => {
    const user = userEvent.setup();
    renderWithDock();
    act(() => setRealScale(true));
    // Sur téléphone, la note tient sur une ligne : ce bouton l'affiche en entier.
    const more = screen.getByRole("button", { name: "Lire toute la note" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("status")).toHaveTextContent(/plus petite qu'un pixel/);
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
  });

  it("devrait revenir repliée après avoir été masquée", async () => {
    const user = userEvent.setup();
    renderWithDock();
    act(() => setRealScale(true));
    await user.click(screen.getByRole("button", { name: "Lire toute la note" }));
    await user.click(screen.getByRole("button", { name: "Masquer la note" }));
    act(() => setRealScale(false));
    act(() => setRealScale(true));
    expect(screen.getByRole("button", { name: "Lire toute la note" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ScaleNote en anglais et en espagnol", () => {
  it.each([
    {
      locale: "en",
      note: "Real distances: each planet would be smaller than a pixel, so a circle shows where it is. Earth is 1 AU from the Sun and Neptune is 30.",
      more: "Read the whole note",
      hide: "Hide note",
    },
    {
      locale: "es",
      note: "Distancias reales: cada planeta sería más pequeño que un píxel, así que un círculo indica dónde está. La Tierra está a 1 UA del Sol; Neptuno, a 30.",
      more: "Leer toda la nota",
      hide: "Ocultar la nota",
    },
  ] as const)("devrait écrire la note, ses boutons et son annonce dans la langue de la page ($locale)", (t) => {
    const { container } = renderIn(t.locale, <ScaleNote />);
    act(() => setRealScale(true));
    expect(container.querySelector(".scale-note > p")).toHaveTextContent(t.note);
    expect(screen.getByRole("status")).toHaveTextContent(t.note);
    expect(screen.getByRole("button", { name: t.more })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: t.hide })).toBeInTheDocument();
  });
});

describe("ScaleNote aux escales cosmiques", () => {
  afterEach(() => {
    act(() => journeyStore.update("hero", "hero", 0));
  });

  it("devrait se taire à la Voie lactée, où les distances sont déjà réelles, puis revenir à l'au-delà", () => {
    render(<ScaleNote />);
    act(() => journeyStore.update("galaxy", "galaxy", 0));
    act(() => setRealScale(true));
    expect(screen.queryByRole("button", { name: "Masquer la note" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    act(() => journeyStore.update("beyond", "beyond", 0));
    expect(screen.getByRole("button", { name: "Masquer la note" })).toBeInTheDocument();
  });
});

describe("ScaleNote au fil du voyage", () => {
  beforeEach(() => {
    act(() => journeyStore.update("beyond", "beyond", 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => journeyStore.update("hero", "hero", 0));
  });

  const note = (container: HTMLElement) => container.querySelector(".scale-note");

  it("devrait rendre le focus à la bascule du dock quand elle se tait aux étoiles voisines alors qu'il y était", () => {
    renderWithDock();
    act(() => setRealScale(true));
    screen.getByRole("button", { name: "Lire toute la note" }).focus();
    act(() => journeyStore.update("beyond", "stars", 0.6));
    expect(screen.queryByRole("button", { name: "Lire toute la note" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Distances réelles" })).toHaveFocus();
  });

  it("ne devrait pas déplacer le focus quand il est ailleurs que dans la note", () => {
    render(
      <>
        <ScaleNote />
        <button type="button" id={DOCK_SCALE_TOGGLE_ID}>
          Distances réelles
        </button>
        <button type="button">Plaque</button>
      </>,
    );
    act(() => setRealScale(true));
    screen.getByRole("button", { name: "Plaque" }).focus();
    act(() => journeyStore.update("beyond", "stars", 0.6));
    expect(screen.getByRole("button", { name: "Plaque" })).toHaveFocus();
  });

  it("ne devrait pas ré-annoncer la note quand elle revient d'elle-même à l'au-delà", () => {
    render(<ScaleNote />);
    act(() => setRealScale(true));
    act(() => journeyStore.update("beyond", "stars", 0.6));
    act(() => journeyStore.update("stars", "beyond", 0.6));
    // Le texte est bien de retour à l'écran, mais la région d'annonce reste muette.
    expect(screen.getByText(NOTE, EXACT)).toBeVisible();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("devrait retirer l'annonce après quelques secondes, pour ne pas doubler le texte visible en lecture linéaire", () => {
    vi.useFakeTimers();
    render(<ScaleNote />);
    act(() => setRealScale(true));
    expect(screen.getByRole("status").textContent).toBe(NOTE);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByText(NOTE, EXACT)).toBeVisible();
  });

  it("devrait se dire suspendue aux escales cosmiques tant que les distances réelles restent actives", () => {
    const { container } = render(<ScaleNote />);
    act(() => setRealScale(true));
    expect(note(container)).not.toHaveAttribute("data-suspended");
    act(() => journeyStore.update("beyond", "stars", 0.6));
    expect(note(container)).toHaveAttribute("data-visible", "false");
    expect(note(container)).toHaveAttribute("data-suspended");
    act(() => setRealScale(false));
    expect(note(container)).not.toHaveAttribute("data-suspended");
  });

  it("ne devrait pas se dire suspendue une fois masquée par la personne", async () => {
    const user = userEvent.setup();
    const { container } = renderWithDock();
    act(() => setRealScale(true));
    await user.click(screen.getByRole("button", { name: "Masquer la note" }));
    act(() => journeyStore.update("beyond", "stars", 0.6));
    expect(note(container)).not.toHaveAttribute("data-suspended");
  });

  it("ne devrait pas se re-rendre quand l'escale change sans quitter le système solaire", () => {
    const onRender = vi.fn();
    render(
      <Profiler id="note" onRender={onRender}>
        <ScaleNote />
      </Profiler>,
    );
    act(() => setRealScale(true));
    onRender.mockClear();
    act(() => journeyStore.update("beyond", "neptune", 0.6));
    act(() => journeyStore.update("neptune", "uranus", 0.6));
    expect(onRender).not.toHaveBeenCalled();
  });
});
