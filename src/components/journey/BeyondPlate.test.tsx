import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { BeyondPlate } from "@/components/journey/BeyondPlate";
import { getVoyageContent } from "@/content/voyage/content";
import { BEYOND_MARKS } from "@/content/voyage/structure";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";

afterEach(() => {
  document.body.replaceChildren();
});

/** Rendu serveur de la plaque, comme au build, sous le fournisseur de langue du layout `[lang]`. */
function renderBeyond(locale: Locale): HTMLElement {
  document.body.innerHTML = renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <BeyondPlate locale={locale} sunHref="#soleil" />
    </LocaleProvider>,
  );
  return screen.getByRole("region", { name: getVoyageContent(locale).beyond.name });
}

/** Textes exacts des éléments de la plaque désignés par `selector`. */
const textsOf = (root: ParentNode, selector: string) =>
  Array.from(root.querySelectorAll(selector), (element) => element.textContent);

describe("BeyondPlate", () => {
  it("devrait mener, au bas de la plaque, à Neptune et aux étoiles voisines", () => {
    const plate = renderBeyond("en");
    expect(within(plate).getByRole("link", { name: "Previous stop: Neptune" })).toHaveAttribute("href", "#neptune");
    expect(within(plate).getByRole("link", { name: "Next stop: Nearby stars" })).toHaveAttribute("href", "#etoiles-voisines");
  });

  it.each([
    [
      "fr",
      "Neptune\u00a0: 4 heures 10\u202f; Pluton\u00a0: 5 heures 28\u202f; Kuiper\u00a0: environ 7 heures\u202f; Voyager 2\u00a0: environ 20 heures\u202f; Voyager 1\u00a0: environ 24 heures.",
    ],
    [
      "en",
      "Neptune: 4 hours 10 minutes; Pluto: 5 hours 28 minutes; Kuiper: about 7 hours; Voyager 2: about 20 hours; Voyager 1: about 24 hours.",
    ],
    [
      "es",
      "Neptuno: 4 horas y 10 minutos; Plutón: 5 horas y 28 minutos; Kuiper: unas 7 horas; Voyager 2: unas 20 horas; Voyager 1: unas 24 horas.",
    ],
  ] as const)("devrait dire toute l'échelle, masquée à l'œil, d'une phrase complète (%s)", (locale, sentence) => {
    const plate = renderBeyond(locale);
    expect(plate.querySelector(".lightscale")).toHaveAttribute("aria-hidden", "true");
    expect(plate.querySelector("p.sr")?.textContent).toBe(sentence);
  });

  it("devrait poser l'au-delà en anglais, à son ancre commune : rang, titre, échelle et ses repères", () => {
    const plate = renderBeyond("en");
    expect(plate).toHaveAttribute("id", "au-dela");
    expect(plate).toHaveAttribute("data-stop", "beyond");
    expect(plate.querySelector(".rank")?.textContent).toBe("Beyond Neptune");
    expect(plate.querySelector(".lightscale-title")?.textContent).toBe("Distances in light travel time from the Sun");
    expect(textsOf(plate, ".lightscale span")).toEqual([
      "Neptune 4 h 10 min",
      "Pluto 5 h 28 min",
      "Kuiper ≈ 7 h",
      "Voyager 2 ≈ 20 h",
      "Voyager 1 ≈ 24 h",
    ]);
    expect(textsOf(plate, ".axis-l span")).toEqual(["Sun, 0 h", "12 h", "24 h"]);
  });

  it.each([
    ["en", "Read more", "Back to the Sun"],
    ["es", "Leer más", "Volver al Sol"],
  ] as const)("devrait déplier la suite et ramener au Soleil, nommés dans la langue (%s)", (locale, more, back) => {
    const plate = renderBeyond(locale);
    expect(within(plate).getByRole("button", { name: more })).toHaveAttribute("aria-controls", "au-dela-suite");
    expect(within(plate).getByRole("link", { name: back })).toHaveAttribute("href", "#soleil");
  });

  it("devrait placer les repères sur l'échelle de 24 heures, les plus lointains alignés à droite", () => {
    const plate = renderBeyond("es");
    const marks = Array.from(plate.querySelectorAll<HTMLElement>(".lightscale span"));
    expect(marks.map((mark) => mark.style.left)).toEqual(BEYOND_MARKS.map(({ hours }) => `${(hours / 24) * 100}%`));
    expect(marks.map((mark) => mark.style.getPropertyValue("--lc"))).toEqual(BEYOND_MARKS.map(({ color }) => color));
    expect(marks.map((mark) => mark.classList.contains("r"))).toEqual([false, false, false, true, true]);
    expect(textsOf(plate, ".lightscale b")).toEqual(["Neptuno", "Plutón", "Kuiper", "Voyager 2", "Voyager 1"]);
  });
});
