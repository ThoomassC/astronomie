import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { StopPlate } from "@/components/journey/StopPlate";
import { getVoyageContent } from "@/content/voyage/content";
import { SOLAR_STOP_STRUCTURE, type BodyStopKey, type BodyStopStructure } from "@/content/voyage/structure";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { STOP_IDS } from "@/lib/journey/stopIds";

afterEach(() => {
  document.body.replaceChildren();
});

const BODY_STOPS = SOLAR_STOP_STRUCTURE.filter((stop): stop is BodyStopStructure => stop.kind === "body");

/** Structure de l'escale d'un astre. */
function bodyStop(key: BodyStopKey): BodyStopStructure {
  const found = BODY_STOPS.find((stop) => stop.key === key);
  if (!found) throw new Error(`Escale « ${key} » absente`);
  return found;
}

/** Rendu serveur de la plaque, comme au build, sous le fournisseur de langue du layout `[lang]`. */
function renderPlate(locale: Locale, key: BodyStopKey): HTMLElement {
  document.body.innerHTML = renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <StopPlate locale={locale} stop={bodyStop(key)} />
    </LocaleProvider>,
  );
  return screen.getByRole("region", { name: bodyName(key, locale) });
}

/** Texte exact d'un élément de la plaque (sans normalisation des espaces). */
const textOf = (root: ParentNode, selector: string) => root.querySelector(selector)?.textContent;

describe("StopPlate", () => {
  it("devrait poser l'escale de Saturne en anglais, à son ancre commune, nommée par son titre", () => {
    const plate = renderPlate("en", "saturn");
    expect(plate).toHaveAttribute("id", "saturne");
    expect(plate).toHaveAttribute("data-stop", "saturn");
    expect(within(plate).getByRole("heading", { level: 2 }).textContent).toBe("Saturn");
    expect(textOf(plate, ".rank")).toBe("6th planet from the Sun");
    expect(textOf(plate, ".rank sup")).toBe("th");
  });

  it("devrait distinguer à l'oreille le bouton de la fiche par le nom de l'astre, en anglais", () => {
    const plate = renderPlate("en", "saturn");
    expect(within(plate).getByRole("button", { name: "Read the fact sheet, Saturn" })).toHaveAttribute(
      "aria-controls",
      "saturne-fiche",
    );
    expect(within(plate).getByRole("button", { name: "The rings from Earth" })).toHaveAttribute(
      "aria-controls",
      "saturne-module",
    );
    expect(textOf(plate, ".module > h3")).toBe("The rings as seen from Earth");
  });

  it("devrait présenter la fiche de Saturne en anglais, ligne du jour comprise", () => {
    const plate = renderPlate("en", "saturn");
    expect(Array.from(plate.querySelectorAll(".facts dt"), (term) => term.textContent)).toEqual([
      "Distance from the Sun",
      "Diameter",
      "One year",
      "One day",
      "Cloud tops",
      "Gravity",
      "Moons",
      "Density",
      "On this date, from Earth",
    ]);
    expect(textOf(plate, ".facts > div:first-child dd")).toBe("9.54 AU1.43 billion km");
  });

  it.each([
    ["earth", "3.er planeta desde el Sol", "er"],
    ["venus", "2.º planeta desde el Sol", undefined],
    ["mercury", "1.er planeta desde el Sol", "er"],
  ] as const)("devrait accorder le rang de « %s » à « planeta » en espagnol : %s", (key, rank, suffix) => {
    const plate = renderPlate("es", key);
    expect(textOf(plate, ".rank")).toBe(rank);
    expect(textOf(plate, ".rank sup")).toBe(suffix);
  });

  /*
   * Sur téléphone, d'escale en escale sans ouvrir le menu : les liens sont au bout de la rangée des titres-boutons,
   * après la fiche et le module, sans rangée de plus sous la plaque.
   */
  it("devrait mener, au bas de la plaque de Saturne, à Jupiter et à Uranus", () => {
    const plate = renderPlate("en", "saturn");
    const steps = plate.querySelector(".plate-sections > .stop-steps");
    expect(steps).not.toBeNull();
    expect(steps).toBe(plate.querySelector(".plate-sections")?.lastElementChild);
    expect(within(plate).getByRole("link", { name: "Previous stop: Jupiter" })).toHaveAttribute("href", "#jupiter");
    expect(within(plate).getByRole("link", { name: "Next stop: Uranus" })).toHaveAttribute("href", "#uranus");
  });

  it("ne devrait proposer au Soleil que l'escale suivante", () => {
    const plate = renderPlate("fr", "sun");
    expect(within(plate).getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Escale suivante\u00a0: Mercure",
    ]);
  });

  it.each(LOCALES)("ne devrait pas donner de rang chiffré au Soleil (%s)", (locale) => {
    const plate = renderPlate(locale, "sun");
    expect(textOf(plate, ".rank")).toBe(getVoyageContent(locale).bodies.sun.rank);
    expect(plate.querySelector(".rank sup")).toBeNull();
  });

  it.each(LOCALES.flatMap((locale) => BODY_STOPS.map(({ key }) => ({ locale, key }))))(
    "devrait écrire l'escale « $key » dans la langue de la page ($locale)",
    ({ locale, key }) => {
      const texts = getVoyageContent(locale).bodies[key];
      const plate = renderPlate(locale, key);
      expect(plate).toHaveAttribute("id", STOP_IDS[key]);
      expect(textOf(plate, ".hook")).toBe(texts.hook);
      expect(textOf(plate, ".lede")).toBe(texts.lede);
      expect(plate.querySelectorAll(".facts dt")).toHaveLength(texts.facts.length + 1);
      expect(within(plate).getByRole("button", { name: texts.module.button })).toBeInTheDocument();
      expect(textOf(plate, ".module > p")).toBe(texts.module.intro);
    },
  );
});
