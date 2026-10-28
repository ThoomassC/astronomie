import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOCK_SCALE_TOGGLE_ID } from "@/components/journey/ids";
import { ScaleNote } from "@/components/journey/ScaleNote";
import { setRealScale } from "@/components/journey/realScale";

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
