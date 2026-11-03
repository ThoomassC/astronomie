import { act, cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";
import { Activity, useEffect, useRef, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAIN_ID } from "@/components/journey/ids";
import { FocusOnNavigation } from "@/components/site/FocusOnNavigation";

/** Adresse que le routeur de Next donne aux composants client : chaque test la change pour « naviguer ». */
const route = vi.hoisted(() => ({ pathname: "/fr/voyage" }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => route.pathname,
}));

afterEach(() => {
  cleanup();
  route.pathname = "/fr/voyage";
});

type PageKey = "voyage" | "tailles";

/** Bouton qu'une page focalise d'elle-même chaque fois qu'elle s'affiche. */
function SelfFocusingButton() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <button ref={ref} type="button">
      Bouton de la page
    </button>
  );
}

/**
 * Deux pages comme Next les garde avec `cacheComponents` : la page quittée reste dans le DOM, masquée sous <Activity>,
 * avec son onglet (`Link`, l'élément choisi) et son `main#contenu`, avant la page affichée dans l'ordre du document.
 */
function Site({ shown, selfFocusing = false }: { shown: PageKey; selfFocusing?: boolean }) {
  return (
    <>
      <Activity mode={shown === "voyage" ? "visible" : "hidden"}>
        <Link href="/fr/tailles">Tailles</Link>
        <main id={MAIN_ID} tabIndex={-1} aria-label="Voyage" />
      </Activity>
      <Activity mode={shown === "tailles" ? "visible" : "hidden"}>
        <Link href="/fr/voyage">Voyage</Link>
        <main id={MAIN_ID} tabIndex={-1} aria-label="Tailles">
          {selfFocusing ? <SelfFocusingButton /> : null}
        </main>
      </Activity>
      <FocusOnNavigation />
    </>
  );
}

/** Navigation côté client : l'adresse change et la page affichée avec elle. */
function navigate(rerender: (ui: ReactElement) => void, to: PageKey, options: { selfFocusing?: boolean } = {}) {
  route.pathname = `/fr/${to}`;
  rerender(<Site shown={to} {...options} />);
}

describe("FocusOnNavigation", () => {
  it("ne devrait pas toucher au focus au premier chargement", () => {
    render(<Site shown="voyage" />);
    expect(document.body).toHaveFocus();
  });

  it("devrait placer le focus sur le contenu de la page affichée après une navigation par onglet", () => {
    const { rerender } = render(<Site shown="voyage" />);
    act(() => screen.getByRole("link", { name: "Tailles" }).focus());
    navigate(rerender, "tailles");
    // Le `main#contenu` du voyage, masqué, vient avant dans le document : c'est celui de la page affichée qui l'a.
    expect(screen.getByRole("main", { name: "Tailles" })).toHaveFocus();
  });

  it("devrait aussi le placer quand le focus était déjà perdu (retour arrière du navigateur, <body>)", () => {
    const { rerender } = render(<Site shown="voyage" />);
    navigate(rerender, "tailles");
    expect(screen.getByRole("main", { name: "Tailles" })).toHaveFocus();
  });

  it("devrait le replacer à chaque navigation, retour sur une page gardée compris", () => {
    const { rerender } = render(<Site shown="voyage" />);
    navigate(rerender, "tailles");
    act(() => screen.getByRole("link", { name: "Voyage" }).focus());
    navigate(rerender, "voyage");
    expect(screen.getByRole("main", { name: "Voyage" })).toHaveFocus();
  });

  it("ne devrait rien faire quand la page se rend de nouveau sans changer d'adresse", () => {
    const { rerender } = render(<Site shown="voyage" />);
    const tab = screen.getByRole("link", { name: "Tailles" });
    act(() => tab.focus());
    rerender(<Site shown="voyage" />);
    expect(tab).toHaveFocus();
  });

  it("devrait laisser le focus qu'une page a posé elle-même sur l'un de ses éléments", () => {
    const { rerender } = render(<Site shown="voyage" />);
    act(() => screen.getByRole("link", { name: "Tailles" }).focus());
    navigate(rerender, "tailles", { selfFocusing: true });
    expect(screen.getByRole("button", { name: "Bouton de la page" })).toHaveFocus();
  });
});
