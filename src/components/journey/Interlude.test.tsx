import { screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Interlude } from "@/components/journey/Interlude";
import type { Locale } from "@/i18n/locales";

afterEach(() => {
  document.body.replaceChildren();
});

/** Rendu serveur de l'interlude de la ceinture d'astéroïdes, comme au build. */
function renderInterlude(locale: Locale): void {
  document.body.innerHTML = renderToStaticMarkup(<Interlude locale={locale} stop={{ kind: "interlude", key: "belt" }} />);
}

describe("Interlude", () => {
  it.each([
    [
      "en",
      "The asteroid belt",
      "Between Mars and Jupiter, more than a million known asteroids. Put together, they would weigh barely 3% as much as the Moon.",
      "The main belt, between 2.1 and 3.3 AU from the Sun",
    ],
    [
      "es",
      "El cinturón de asteroides",
      "Entre Marte y Júpiter, más de un millón de asteroides conocidos. Juntos, pesarían apenas el 3 % de lo que pesa la Luna.",
      "El cinturón principal, entre 2,1 y 3,3 UA del Sol",
    ],
  ] as const)(
    "devrait nommer la section pour les lecteurs d'écran et citer la ceinture dans la langue (%s)",
    (locale, title, text, cite) => {
      renderInterlude(locale);
      const section = screen.getByRole("region", { name: title });
      expect(section).toHaveAttribute("id", "ceinture");
      expect(section).toHaveAttribute("data-stop", "belt");
      expect(section.querySelector("h2")).toHaveClass("sr");
      expect(section.querySelector("blockquote p")?.textContent).toBe(text);
      expect(section.querySelector("blockquote cite")?.textContent).toBe(cite);
    },
  );
});
