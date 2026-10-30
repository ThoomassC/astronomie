import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/journey/Hero";
import { HeroStamp } from "@/components/journey/HeroStamp";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";

beforeEach(() => {
  // Chargement de la page le 29 octobre 2026 à midi (UTC) : la même date dans tous les fuseaux habités.
  vi.spyOn(performance, "timeOrigin", "get").mockReturnValue(Date.UTC(2026, 9, 29, 12));
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/** Rendu serveur de l'accueil, comme au build, sous le fournisseur de langue du layout `[lang]`. */
function renderHero(locale: Locale): HTMLElement {
  document.body.innerHTML = renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <Hero locale={locale} sunHref="#soleil" />
    </LocaleProvider>,
  );
  const hero = document.getElementById("accueil");
  if (!hero) throw new Error("Section #accueil absente");
  return hero;
}

describe("Hero", () => {
  it("devrait titrer le voyage en espagnol et mener au Soleil", () => {
    const hero = renderHero("es");
    expect(hero).toHaveAttribute("data-stop", "hero");
    expect(screen.getByRole("region", { name: "Ocho planetas, una estrella y mucho vacío." })).toBe(hero);
    expect(within(hero).getByRole("link", { name: "Partir del Sol" })).toHaveAttribute("href", "#soleil");
  });

  it.each([
    ["en", "In the background, a 3D view of the Solar System with the planets where they are today; the camera follows as you scroll."],
    ["es", "Al fondo, una vista en 3D del sistema solar con las posiciones del día; la cámara sigue el desplazamiento."],
  ] as const)("devrait dire aux lecteurs d'écran ce que montre la scène, décorative (%s)", (locale, description) => {
    const hero = renderHero(locale);
    expect(hero.querySelector("p.sr")?.textContent).toBe(description);
  });

  it.each([
    ["en", "Real positions at departure: –"],
    ["es", "Posiciones reales a la salida: –"],
  ] as const)("devrait réserver la date de départ avant hydratation (%s)", (locale, stamp) => {
    const hero = renderHero(locale);
    expect(hero.querySelector(".stamp span")?.textContent).toBe(stamp);
  });
});

describe("HeroStamp", () => {
  it.each([
    ["fr", "Positions réelles au départ :", "Positions réelles au départ : 29 octobre 2026"],
    ["en", "Real positions at departure:", "Real positions at departure: 29 October 2026"],
    ["es", "Posiciones reales a la salida:", "Posiciones reales a la salida: 29 de octubre de 2026"],
  ] as const)("devrait dater le départ dans la langue de la page (%s)", (locale, prefix, stamp) => {
    const { container } = render(
      <LocaleProvider locale={locale}>
        <HeroStamp prefix={prefix} />
      </LocaleProvider>,
    );
    expect(container.textContent).toBe(stamp);
  });
});
