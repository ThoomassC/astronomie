import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { SolarStops } from "@/components/journey/SolarStops";
import { BEYOND, HERO, PLATE_MORE } from "@/content/site";
import { STOPS, type BodyStop, type InterludeStop } from "@/content/stops";
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

/** Section d'une escale, par son ancre. */
function section(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Section #${id} absente`);
  return found;
}

/** Texte exact d'un élément de la section (sans normalisation des espaces). */
const textOf = (root: ParentNode, selector: string) => root.querySelector(selector)?.textContent;

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

/*
 * Garde de migration : en français, les escales disent mot pour mot ce que disaient les anciens contenus, gelés
 * jusqu'à la clôture (`src/content/site.ts`, `src/content/stops.ts`), qui supprime ces cas avec eux.
 */
describe("SolarStops en français, identique aux anciens contenus", () => {
  const BODY_STOPS = STOPS.filter((stop): stop is BodyStop => stop.kind === "body");
  const BELT = STOPS.find((stop): stop is InterludeStop => stop.kind === "interlude");

  it("devrait garder l'accueil : titre, promesse, description de la scène, date de départ, départ vers le Soleil", () => {
    renderStops("fr");
    const hero = section("accueil");
    expect(textOf(hero, "h1")).toBe(HERO.title);
    expect(textOf(hero, "h1 + p")).toBe(HERO.text);
    expect(textOf(hero, "p.sr")).toBe(
      "En arrière-plan, une vue 3D du système solaire aux positions du jour ; la caméra suit le défilement.",
    );
    // Avant hydratation, la date est un tiret : le rendu serveur ne connaît pas l'heure du chargement.
    expect(textOf(hero, ".stamp span")).toBe(`${HERO.stampPrefix} –`);
    expect(within(hero).getByRole("link", { name: HERO.start })).toHaveAttribute("href", "#soleil");
  });

  it.each(BODY_STOPS)("devrait garder l'escale « $key » : rang, nom, accroche, fiche, ligne du jour, module", (stop) => {
    renderStops("fr");
    const plate = section(stop.id);
    expect(plate).toHaveAttribute("data-stop", stop.key);
    expect(plate.querySelector(".plate")?.getAttribute("style")).toContain(`--c:${stop.color}`);
    const { ordinal, label } = stop.rank;
    expect(textOf(plate, ".rank")).toBe(ordinal === undefined ? label : `${ordinal}${ordinal === 1 ? "re" : "e"} ${label}`);
    expect(textOf(plate, ".rank sup")).toBe(ordinal === undefined ? undefined : ordinal === 1 ? "re" : "e");
    expect(textOf(plate, "h2")).toBe(stop.name);
    expect(textOf(plate, ".hook")).toBe(stop.hook);
    expect(textOf(plate, ".lede")).toBe(stop.lede);
    // Couples terme / définition, puis la ligne « ce jour », réservée avant hydratation (tiret, espace insécable).
    const rows = Array.from(plate.querySelectorAll(".facts > div"), (row) => [textOf(row, "dt"), textOf(row, "dd")]);
    expect(rows).toEqual([
      ...stop.facts.map(({ label: term, value, note }) => [term, `${value}${note ?? ""}`]),
      [stop.live.label, "–\u00a0"],
    ]);
    expect(within(plate).getByRole("button", { name: `${PLATE_MORE.story}, ${stop.name}` })).toBeInTheDocument();
    expect(within(plate).getByRole("button", { name: stop.module.button })).toBeInTheDocument();
    expect(textOf(plate, ".module > h3")).toBe(stop.module.title);
    expect(textOf(plate, ".module > p")).toBe(stop.module.intro);
  });

  it("devrait garder l'interlude de la ceinture : titre pour les lecteurs d'écran, citation et sa source", () => {
    renderStops("fr");
    const belt = section(BELT?.id ?? "");
    expect(belt).toHaveAttribute("data-stop", "belt");
    expect(textOf(belt, "h2.sr")).toBe("La ceinture d'astéroïdes");
    expect(textOf(belt, "blockquote p")).toBe(BELT?.text);
    expect(textOf(belt, "blockquote cite")).toBe(BELT?.cite);
  });

  it("devrait garder l'au-delà : textes, échelle en heures-lumière et sa lecture, retour au Soleil", () => {
    renderStops("fr");
    const beyond = section(BEYOND.id);
    expect(textOf(beyond, ".rank")).toBe(BEYOND.rank);
    expect(textOf(beyond, "h2")).toBe(BEYOND.name);
    expect(textOf(beyond, ".hook")).toBe(BEYOND.hook);
    expect(textOf(beyond, ".lede")).toBe(BEYOND.lede);
    expect(textOf(beyond, ".lightscale-title")).toBe(BEYOND.scaleTitle);
    expect(Array.from(beyond.querySelectorAll(".lightscale span"), (mark) => mark.textContent)).toEqual(
      BEYOND.marks.map(({ label, value }) => `${label} ${value}`),
    );
    expect(Array.from(beyond.querySelectorAll(".axis-l span"), (tick) => tick.textContent)).toEqual([
      "Soleil, 0 h",
      "12 h",
      "24 h",
    ]);
    expect(textOf(beyond, "p.sr")).toBe(
      "Neptune : 4 heures 10 ; Pluton : 5 heures 28 ; Kuiper : environ 7 heures ; Voyager 2 : environ 20 heures ; Voyager 1 : environ 24 heures.",
    );
    expect(within(beyond).getByRole("button", { name: PLATE_MORE.beyond })).toBeInTheDocument();
    expect(within(beyond).getByRole("link", { name: BEYOND.back })).toHaveAttribute("href", "#soleil");
  });
});
