import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { LocaleProvider, useLocale } from "@/i18n/LocaleProvider";

afterEach(() => {
  cleanup();
});

/** Affiche la langue lue, pour le rendu serveur. */
function LocaleProbe() {
  return <span>{useLocale()}</span>;
}

describe("useLocale", () => {
  it("devrait valoir le français quand aucun fournisseur n'entoure le composant", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe("fr");
  });

  it("devrait lire la langue du fournisseur quand il en pose une", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }: { children: ReactNode }) => <LocaleProvider locale="en">{children}</LocaleProvider>,
    });
    expect(result.current).toBe("en");
  });

  it("devrait lire le fournisseur le plus proche quand deux sont imbriqués", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LocaleProvider locale="en">
          <LocaleProvider locale="es">{children}</LocaleProvider>
        </LocaleProvider>
      ),
    });
    expect(result.current).toBe("es");
  });

  it("devrait poser la langue dès le rendu serveur, sans rien ajouter autour des enfants", () => {
    expect(
      renderToStaticMarkup(
        <LocaleProvider locale="en">
          <LocaleProbe />
        </LocaleProvider>,
      ),
    ).toBe("<span>en</span>");
  });
});
