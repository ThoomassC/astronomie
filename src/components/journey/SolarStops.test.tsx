import { screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { SolarStops } from "@/components/journey/SolarStops";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/i18n/locales";
import { STOP_ORDER } from "@/lib/journey/camera";
import { STOP_IDS } from "@/lib/journey/stopIds";

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Rendu serveur des escales, comme au build (aucun effet ne s'exécute), sous le fournisseur de langue que pose le
 * layout `[lang]`, inséré dans le document pour l'interroger par rôles.
 */
function renderStops(locale: Locale): void {
  document.body.innerHTML = renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <SolarStops locale={locale} sunHref="#soleil" />
    </LocaleProvider>,
  );
}

describe("SolarStops", () => {
  it.each(LOCALES)("devrait poser une section par escale, de l'accueil à l'au-delà, aux ancres communes (%s)", (locale) => {
    renderStops(locale);
    const keys = STOP_ORDER.slice(0, STOP_ORDER.indexOf("beyond") + 1);
    expect(Array.from(document.body.children, (child) => [child.tagName, child.id, child.getAttribute("data-stop")])).toEqual(
      keys.map((key) => ["SECTION", STOP_IDS[key], key]),
    );
  });

  it.each([
    [
      "fr",
      "Huit planètes, une étoile, et beaucoup de vide.",
      ["Soleil", "Mercure", "Vénus", "Terre", "Mars", "La ceinture d'astéroïdes", "Jupiter", "Saturne", "Uranus", "Neptune", "Le grand vide"],
    ],
    [
      "en",
      "Eight planets, one star, and a lot of empty space.",
      ["Sun", "Mercury", "Venus", "Earth", "Mars", "The asteroid belt", "Jupiter", "Saturn", "Uranus", "Neptune", "The great void"],
    ],
    [
      "es",
      "Ocho planetas, una estrella y mucho vacío.",
      ["Sol", "Mercurio", "Venus", "Tierra", "Marte", "El cinturón de asteroides", "Júpiter", "Saturno", "Urano", "Neptuno", "El gran vacío"],
    ],
  ] as const)("devrait titrer le voyage et chaque escale dans la langue de la page (%s)", (locale, title, names) => {
    renderStops(locale);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(title);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(names);
  });
});
