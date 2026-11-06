import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardTrack } from "@/components/journey/CardTrack";
import { setSectionRanges, trackAims } from "@/components/journey/navigation";
import { Plate, type PlateSection } from "@/components/journey/Plate";
import { FIXED_CARD_QUERY } from "@/lib/journey/card";
import { createStopStore } from "@/lib/journey/store";
import { renderIn } from "@/components/modules/testUtils";

const SECTIONS: readonly PlateSection[] = [
  { key: "fiche", label: "Lire la fiche", icon: "story", content: <p>Texte de la fiche</p> },
  { key: "module", label: "Votre poids sur chaque astre", icon: "weight", content: <button type="button">Peser</button> },
];

/** Mise en page compacte avec JavaScript : la requête des blocs de globals.css où la plaque se réduit à ses pictogrammes. */
const COMPACT_SCRIPTED =
  "(max-width: 640px) and (scripting: enabled), (max-width: 1100px) and (orientation: portrait) and (scripting: enabled)";

/** Hauteur de la vue. L'escale commence à 2000 px dans le document. */
const VH = 800;
const SECTION_TOP = 2000;

/** Frontière navigateur : défilement demandé à la fenêtre (jsdom ne défile pas). */
const scrollTo = vi.fn<(options: ScrollToOptions) => void>();

beforeEach(() => {
  scrollTo.mockReset();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("innerHeight", VH);
  vi.stubGlobal("scrollY", 0);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** L'escale de Mars, entre l'accueil et Jupiter (ou dernière du voyage si `last`). */
function renderPlate({ last = false }: { last?: boolean } = {}) {
  return render(
    <>
      {/* Première section du voyage : sa plage de repos commence à 0, celle de l'escale suit la règle commune. */}
      <section data-stop="hero" />
      <section data-stop="mars">
        <Plate
          id="mars"
          name="Mars"
          color="#DA6A43"
          titleId="mars-titre"
          sections={SECTIONS}
          footer={<p>Pied de plaque</p>}
        />
      </section>
      {last ? null : <section data-stop="jupiter" />}
    </>,
  );
}

/** Zone pilotée par le bouton (aria-controls). */
function zoneOf(button: HTMLElement): HTMLElement {
  const id = button.getAttribute("aria-controls");
  const zone = id ? document.getElementById(id) : null;
  if (!zone) throw new Error("Bouton sans zone pilotée");
  return zone;
}

/**
 * Géométrie (jsdom ne calcule aucune mise en page) : défilement, hauteur de l'escale avant le clic
 * (`before`, lue au clic) et après le rendu (`sectionHeight`), position du bouton à l'écran.
 * Avec une escale de 1400 px, la caméra est posée de 1904 à 2600 px de défilement ; 1340 px : 1904 à 2540.
 */
function layout(options: {
  scrollY: number;
  sectionHeight: number;
  before?: number;
  button?: HTMLElement;
  buttonTop?: number;
}) {
  vi.stubGlobal("scrollY", options.scrollY);
  const section = document.querySelector<HTMLElement>('[data-stop="mars"]');
  if (!section) throw new Error("Escale absente");
  const box = (height: number) => ({ top: SECTION_TOP - options.scrollY, height }) as DOMRect;
  const spy = vi.spyOn(section, "getBoundingClientRect");
  if (options.before !== undefined) spy.mockReturnValueOnce(box(options.before));
  spy.mockReturnValue(box(options.sectionHeight));
  if (options.button) {
    vi.spyOn(options.button, "getBoundingClientRect").mockReturnValue({ top: options.buttonTop ?? 0 } as DOMRect);
  }
}

/** Ouvre la fiche, caméra posée en haut de la plage de repos. */
function openFiche(): HTMLElement {
  const fiche = screen.getByRole("button", { name: "Lire la fiche" });
  layout({ scrollY: 1906, sectionHeight: 1400, button: fiche, buttonTop: 400 });
  fireEvent.click(fiche);
  scrollTo.mockReset();
  vi.restoreAllMocks();
  return fiche;
}

describe("Plate", () => {
  it("devrait proposer un titre-bouton replié par section, suivi de la zone qu'il pilote (motif accordéon)", () => {
    renderPlate();
    const fiche = screen.getByRole("button", { name: "Lire la fiche" });
    const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });
    expect(fiche).toHaveAttribute("aria-expanded", "false");
    expect(zoneOf(fiche)).toHaveTextContent("Texte de la fiche");
    expect(zoneOf(fiche)).not.toHaveAttribute("data-open");
    // Titre de niveau 3 sous le nom de l'astre : le libellé vu et le titre entendu sont les mêmes.
    expect(screen.getByRole("heading", { level: 3, name: "Votre poids sur chaque astre" })).toContainElement(scales);
    // Chaque zone s'ouvre juste sous son titre.
    expect(fiche.parentElement?.nextElementSibling).toBe(zoneOf(fiche));
    expect(scales.parentElement?.nextElementSibling).toBe(zoneOf(scales));
    expect(zoneOf(fiche).nextElementSibling).toBe(scales.parentElement);
  });

  it("devrait rendre la plaque repliée dès le serveur, pour une hauteur stable à l'hydratation", () => {
    const html = renderToString(
      <Plate id="mars" name="Mars" color="#DA6A43" titleId="mars-titre" sections={SECTIONS} />,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("data-open");
    expect(html).not.toContain("data-expanded");
    // Le contenu replié reste dans la page : grand écran, recherche, lecture sans JavaScript.
    expect(html).toContain("Texte de la fiche");
  });

  it("devrait déplier puis replier une zone sans toucher à l'autre", async () => {
    const user = userEvent.setup();
    renderPlate();
    const article = screen.getByRole("article");
    const fiche = screen.getByRole("button", { name: "Lire la fiche" });
    const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });

    await user.click(fiche);
    expect(fiche).toHaveAttribute("aria-expanded", "true");
    expect(zoneOf(fiche)).toHaveAttribute("data-open");
    expect(scales).toHaveAttribute("aria-expanded", "false");
    expect(zoneOf(scales)).not.toHaveAttribute("data-open");
    expect(article).toHaveAttribute("data-expanded");

    await user.click(fiche);
    expect(fiche).toHaveAttribute("aria-expanded", "false");
    expect(zoneOf(fiche)).not.toHaveAttribute("data-open");
    expect(article).not.toHaveAttribute("data-expanded");
  });

  it("devrait ouvrir la zone qui reçoit le focus (passage du grand écran au téléphone)", () => {
    renderPlate();
    act(() => screen.getByRole("button", { name: "Peser" }).focus());
    const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });
    expect(scales).toHaveAttribute("aria-expanded", "true");
    expect(zoneOf(scales)).toHaveAttribute("data-open");
  });

  describe("défilement au dépliage", () => {
    it("devrait amener en douceur le bouton touché sous le haut de l'écran, caméra posée", () => {
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      layout({ scrollY: 1906, sectionHeight: 1400, button: fiche, buttonTop: 400 });
      fireEvent.click(fiche);
      // Bouton à 2306 px dans le document, 12 px d'air au-dessus.
      expect(scrollTo).toHaveBeenCalledWith({ top: 2294, behavior: "smooth" });
    });

    it("devrait s'arrêter au départ de l'escale plutôt que de lancer le vol vers la suivante", () => {
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      layout({ scrollY: 1906, sectionHeight: 1400, button: fiche, buttonTop: 1300 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2600, behavior: "smooth" });
    });

    it("devrait sauter sans douceur quand les animations sont réduites", () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      layout({ scrollY: 1906, sectionHeight: 1400, button: fiche, buttonTop: 400 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2294, behavior: "instant" });
    });
  });

  /*
   * Plaque compacte : la zone ouverte passe sous la rangée des pictogrammes (globals.css). Deux zones ouvertes
   * s'empileraient dans l'ordre des boutons, loin de celui qu'on vient de toucher, et la tabulation traverserait toute
   * la première avant le bouton voisin : les sections s'y excluent, comme des onglets, et le défilement vise la zone
   * ouverte. Ailleurs (paysage bas), chaque zone suit son bouton : elles restent indépendantes.
   */
  describe("plaque compacte : une section à la fois", () => {
    /** Frontière navigateur : la mise en page compacte, lue par la même requête que la feuille de style. */
    function stubCompact(compact: boolean) {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: compact && query === COMPACT_SCRIPTED, media: query }));
    }

    it("devrait refermer la section ouverte quand une autre s'ouvre", async () => {
      stubCompact(true);
      const user = userEvent.setup();
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });

      await user.click(fiche);
      await user.click(scales);

      expect(fiche).toHaveAttribute("aria-expanded", "false");
      expect(zoneOf(fiche)).not.toHaveAttribute("data-open");
      expect(scales).toHaveAttribute("aria-expanded", "true");
      expect(zoneOf(scales)).toHaveAttribute("data-open");
      expect(document.querySelectorAll(".more-zone[data-open]")).toHaveLength(1);
      // Le DOM ne change pas : chaque zone suit son bouton, qui la pilote.
      expect(scales.parentElement?.nextElementSibling).toBe(zoneOf(scales));
    });

    it("devrait amener sous le haut de l'écran la zone ouverte, pas la rangée des boutons", () => {
      stubCompact(true);
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      layout({ scrollY: 1906, sectionHeight: 1400, button: fiche, buttonTop: 400 });
      vi.spyOn(zoneOf(fiche), "getBoundingClientRect").mockReturnValue({ top: 460 } as DOMRect);
      fireEvent.click(fiche);
      // Zone à 2366 px dans le document, 12 px d'air au-dessus.
      expect(scrollTo).toHaveBeenCalledWith({ top: 2354, behavior: "smooth" });
    });

    it("devrait n'ouvrir que la zone qui reçoit le focus", async () => {
      stubCompact(true);
      const user = userEvent.setup();
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      await user.click(fiche);
      act(() => screen.getByRole("button", { name: "Peser" }).focus());
      expect(fiche).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByRole("button", { name: "Votre poids sur chaque astre" })).toHaveAttribute("aria-expanded", "true");
    });

    it("hors de la plaque compacte, devrait laisser les sections ouvertes ensemble", async () => {
      stubCompact(false);
      const user = userEvent.setup();
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });
      layout({ scrollY: 1906, sectionHeight: 1400, button: fiche, buttonTop: 400 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2294, behavior: "smooth" });
      vi.restoreAllMocks();

      await user.click(scales);
      expect(fiche).toHaveAttribute("aria-expanded", "true");
      expect(scales).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("repli", () => {
    it("au repos, devrait rester dans la plage de repos quand l'escale a raccourci", () => {
      renderPlate();
      const fiche = openFiche();
      // Dépliée, l'escale mesurait 1400 px ; repliée, 1340 : la caméra repartirait au-delà de 2540 px.
      layout({ scrollY: 2580, before: 1400, sectionHeight: 1340 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2540, behavior: "instant" });
    });

    it("au repos, devrait garder la position et interrompre un défilement doux encore en cours", async () => {
      const { takeSkipSmoothing } = await import("@/components/journey/navigation");
      renderPlate();
      const fiche = openFiche();
      takeSkipSmoothing();
      layout({ scrollY: 2294, before: 1400, sectionHeight: 1340 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2294, behavior: "instant" });
      expect(takeSkipSmoothing()).toBe(false);
    });

    it("en vol vers l'escale suivante, devrait garder l'avancement du vol et le contenu à l'écran", () => {
      renderPlate();
      const fiche = openFiche();
      // Départ déplié à 2800 px : à 2900 px, le vol a commencé. L'escale raccourcit de 260 px.
      layout({ scrollY: 2900, before: 1600, sectionHeight: 1340 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2640, behavior: "instant" });
    });

    it("en approche (avant l'arrivée), ne devrait pas rejoindre l'escale d'un coup", () => {
      renderPlate();
      const fiche = openFiche();
      layout({ scrollY: 1600, before: 1600, sectionHeight: 1340 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 1600, behavior: "instant" });
    });

    it("à la dernière escale, ne devrait jamais remonter la page (la caméra y reste posée)", () => {
      renderPlate({ last: true });
      const fiche = openFiche();
      layout({ scrollY: 2560, before: 1400, sectionHeight: 1340 });
      fireEvent.click(fiche);
      expect(scrollTo).toHaveBeenCalledWith({ top: 2560, behavior: "instant" });
    });

    it("devrait tout replier avec « Replier » et rendre le focus au premier bouton", async () => {
      const user = userEvent.setup();
      renderPlate();
      const fiche = screen.getByRole("button", { name: "Lire la fiche" });
      const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });
      expect(screen.queryByRole("button", { name: /^Replier/ })).not.toBeInTheDocument();

      await user.click(fiche);
      await user.click(scales);
      // Le nom de l'astre, lu après « Replier », distingue les dix boutons de la page.
      await user.click(screen.getByRole("button", { name: "Replier, Mars" }));

      expect(fiche).toHaveAttribute("aria-expanded", "false");
      expect(scales).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByRole("article")).not.toHaveAttribute("data-expanded");
      expect(screen.queryByRole("button", { name: /^Replier/ })).not.toBeInTheDocument();
      expect(fiche).toHaveFocus();
    });
  });

  /*
   * Escales voisines (téléphone) : dans la plaque compacte, de part et d'autre du nom (« ‹ Mars › »), lues après lui ;
   * ailleurs (paysage bas, sans JavaScript), en pilules au bout de la rangée des titres-boutons, avant le pied. La
   * feuille de style n'affiche que l'une des deux (StopSteps.test.tsx).
   */
  it("devrait encadrer le nom des escales voisines, lues après lui, et en garder les pilules avant le pied", () => {
    render(
      <Plate
        id="mars"
        name="Mars"
        color="#DA6A43"
        header={<p className="rank">4e planète</p>}
        titleId="mars-titre"
        hook="La planète rouge."
        sections={SECTIONS}
        steps={
          <div className="stop-steps">
            <a data-step="previous" href="#terre">
              Terre
            </a>
            <a data-step="next" href="#jupiter">
              Jupiter
            </a>
          </div>
        }
        footer={<p>Pied de plaque</p>}
      />,
    );
    const title = document.querySelector<HTMLElement>(".plate-title");
    if (!title) throw new Error("Rangée du nom absente");
    // Rang, puis la rangée du nom : le nom, l'accroche lue juste après lui (masquée à l'œil en plaque compacte), puis
    // les escales voisines.
    expect(title.previousElementSibling).toHaveTextContent("4e planète");
    expect(title.nextElementSibling).toBe(document.querySelector(".plate-sections"));
    expect(title.firstElementChild).toBe(screen.getByRole("heading", { level: 2, name: "Mars" }));
    expect(title.children[1]).toHaveClass("hook");
    expect(title.children[1]).toHaveTextContent("La planète rouge.");
    expect(title.lastElementChild).toHaveClass("stop-steps");
    expect(within(title).getAllByRole("link").map((link) => link.textContent)).toEqual(["Terre", "Jupiter"]);
    const row = document.querySelector(".plate-sections");
    expect(row?.lastElementChild).toHaveClass("stop-steps");
    expect(within(row as HTMLElement).getAllByRole("link").map((link) => link.textContent)).toEqual(["Terre", "Jupiter"]);
    // Le pied, dans son conteneur (que pilote le nom en carte fixe).
    expect(row?.nextElementSibling).toBe(screen.getByText("Pied de plaque").parentElement);
  });

  it("ne devrait rien poser autour du nom sans escales voisines", () => {
    renderPlate();
    const title = document.querySelector(".plate-title");
    expect(title?.children).toHaveLength(1);
    expect(document.querySelector(".plate-sections > .stop-steps")).toBeNull();
  });

  /*
   * Plaque compacte : chaque titre-bouton se réduit à son pictogramme (globals.css) ; son libellé entier reste son nom
   * accessible, l'astre lu après lui, et paraît en infobulle au survol.
   */
  it("devrait poser sur chaque titre-bouton son pictogramme décoratif, le libellé entier en nom et en infobulle", () => {
    render(
      <Plate
        id="mars"
        name="Mars"
        color="#DA6A43"
        titleId="mars-titre"
        sections={[{ ...SECTIONS[0], context: "Mars" }, SECTIONS[1]]}
      />,
    );
    const fiche = screen.getByRole("button", { name: "Lire la fiche, Mars" });
    expect(fiche).toHaveAttribute("title", "Lire la fiche, Mars");
    expect(fiche).toHaveAttribute("aria-controls", "mars-fiche");
    expect(fiche.querySelector('svg[data-icon="story"]')).toHaveAttribute("aria-hidden", "true");
    const scales = screen.getByRole("button", { name: "Votre poids sur chaque astre" });
    expect(scales).toHaveAttribute("title", "Votre poids sur chaque astre");
    expect(scales.querySelector('svg[data-icon="weight"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("devrait réduire « Replier » à son pictogramme, son nom entier en infobulle", async () => {
    renderPlate();
    await userEvent.click(screen.getByRole("button", { name: "Lire la fiche" }));
    const fold = screen.getByRole("button", { name: "Replier, Mars" });
    expect(fold).toHaveAttribute("title", "Replier, Mars");
    expect(fold.querySelector('svg[data-icon="fold"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("devrait garder le pied de plaque visible après les sections", () => {
    renderPlate();
    expect(screen.getByText("Pied de plaque")).toBeInTheDocument();
  });

  it("devrait donner des identifiants de zone uniques par plaque", () => {
    render(
      <>
        <Plate id="terre" name="Terre" color="#5B9BE6" titleId="terre-titre" sections={SECTIONS} />
        <Plate id="mars" name="Mars" color="#DA6A43" titleId="mars-titre" sections={SECTIONS} />
      </>,
    );
    const ids = screen.getAllByRole("button", { expanded: false }).map((button) => button.getAttribute("aria-controls"));
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/*
 * Carte fixe du téléphone (ADR 0007) : repliée, la carte ne montre que le rang et « ‹ Nom › ». Le nom est le bouton qui
 * la déplie (motif accordéon : `h2 > button[aria-expanded][aria-controls]`) ; dépliée, la rangée des pictogrammes
 * paraît, la première section ouverte, et son contenu défile dans la carte, sans faire défiler la page. « Replier » ou
 * un second toucher sur le nom replient tout ; la carte d'une escale qu'on quitte se replie.
 */
describe("carte fixe : le nom déplie la carte", () => {
  /** Frontière navigateur : carte fixe (et plaque compacte), lues par les requêtes de la feuille de style. */
  function stubFixedCard(fixed = true) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: fixed && (query === FIXED_CARD_QUERY || query === COMPACT_SCRIPTED),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }

  type Key = "earth" | "mars";

  /** La plaque de Mars, dans le parcours de la Terre à Mars, au repos sur Mars. */
  function renderCard({ footer }: { footer?: ReactNode } = {}) {
    const store = createStopStore<Key>("earth");
    store.update("mars", "mars", 0);
    render(
      <CardTrack store={store} cards={["earth", "mars"]}>
        <section data-stop="mars" aria-labelledby="mars-titre" tabIndex={-1}>
          <Plate
            id="mars"
            stop="mars"
            name="Mars"
            color="#DA6A43"
            titleId="mars-titre"
            sections={SECTIONS}
            footer={footer}
          />
        </section>
        <button type="button">Hors de la carte</button>
      </CardTrack>,
    );
    return { store, article: screen.getByRole("article") };
  }

  /** Le nom, bouton de la carte. */
  const nameButton = () => screen.getByRole("button", { name: "Mars" });

  it("devrait faire du nom le bouton de la carte, replié, qui pilote ses sections", () => {
    stubFixedCard();
    const { article } = renderCard();
    const name = nameButton();
    const heading = screen.getByRole("heading", { level: 2, name: "Mars" });
    expect(heading).toHaveAttribute("id", "mars-titre");
    expect(name.parentElement).toBe(heading);
    expect(name).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(name.getAttribute("aria-controls") ?? "")).toBe(
      article.querySelector(".plate-sections"),
    );
    expect(name.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(article).not.toHaveAttribute("data-unfolded");
    // La section nommée par son titre l'est une fois, pas deux.
    expect(screen.getByRole("region", { name: "Mars" })).toBeInTheDocument();
  });

  it("devrait déplier la carte au toucher du nom, première section ouverte, sans faire défiler la page", async () => {
    stubFixedCard();
    const user = userEvent.setup();
    const { article } = renderCard();
    const name = nameButton();
    await user.click(name);
    expect(name).toHaveAttribute("aria-expanded", "true");
    expect(article).toHaveAttribute("data-unfolded");
    const fiche = screen.getByRole("button", { name: "Lire la fiche" });
    expect(fiche).toHaveAttribute("aria-expanded", "true");
    expect(zoneOf(fiche)).toHaveAttribute("data-open");
    await user.click(screen.getByRole("button", { name: "Votre poids sur chaque astre" }));
    expect(fiche).toHaveAttribute("aria-expanded", "false");
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("devrait tout replier d'un second toucher sur le nom", async () => {
    stubFixedCard();
    const user = userEvent.setup();
    const { article } = renderCard();
    const name = nameButton();
    await user.click(name);
    await user.click(name);
    expect(name).toHaveAttribute("aria-expanded", "false");
    expect(article).not.toHaveAttribute("data-unfolded");
    expect(article.querySelectorAll(".more-zone[data-open]")).toHaveLength(0);
    expect(name).toHaveFocus();
  });

  it("devrait tout replier avec « Replier » et rendre le focus au nom", async () => {
    stubFixedCard();
    const user = userEvent.setup();
    const { article } = renderCard();
    const name = nameButton();
    await user.click(name);
    await user.click(screen.getByRole("button", { name: "Replier, Mars" }));
    expect(name).toHaveAttribute("aria-expanded", "false");
    expect(article).not.toHaveAttribute("data-unfolded");
    expect(name).toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("devrait replier la carte d'une escale qu'on quitte : on y revient carte repliée", async () => {
    stubFixedCard();
    const user = userEvent.setup();
    const { store, article } = renderCard();
    const name = nameButton();
    await user.click(name);
    act(() => store.update("earth", "earth", 0));
    expect(article).not.toHaveAttribute("data-current");
    expect(article).not.toHaveAttribute("data-unfolded");
    expect(article.querySelectorAll(".more-zone[data-open]")).toHaveLength(0);
    act(() => store.update("mars", "mars", 0));
    expect(article).toHaveAttribute("data-current");
    expect(screen.getByRole("button", { name: "Mars" })).toHaveAttribute("aria-expanded", "false");
  });

  /** Frontière navigateur : carte fixe qui bascule (rotation, fenêtre redimensionnée) ; `turn` prévient les abonnés. */
  function stubTurningCard(initial: boolean) {
    let fixed = initial;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return fixed && (query === FIXED_CARD_QUERY || query === COMPACT_SCRIPTED);
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }));
    return (next: boolean) => {
      fixed = next;
      act(() => listeners.forEach((listener) => listener()));
    };
  }

  it("devrait garder « Replier » efficace quand la carte dépliée passe en paysage", async () => {
    const turn = stubTurningCard(true);
    const user = userEvent.setup();
    const { article } = renderCard();
    await user.click(nameButton());
    turn(false);
    expect(article).not.toHaveAttribute("data-unfolded");
    expect(article).toHaveAttribute("data-expanded");
    await user.click(screen.getByRole("button", { name: "Replier, Mars" }));
    expect(article).not.toHaveAttribute("data-expanded");
    expect(screen.queryByRole("button", { name: "Replier, Mars" })).not.toBeInTheDocument();
  });

  it("devrait déplier la carte courante qui arrive en portrait avec une section ouverte", async () => {
    const turn = stubTurningCard(false);
    const user = userEvent.setup();
    const { article } = renderCard();
    await user.click(screen.getByRole("button", { name: "Lire la fiche" }));
    turn(true);
    expect(article).toHaveAttribute("data-unfolded");
    expect(nameButton()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Lire la fiche" })).toHaveAttribute("aria-expanded", "true");
  });

  it("devrait replier la plaque non courante qui arrive en portrait avec une section ouverte", async () => {
    const turn = stubTurningCard(false);
    const user = userEvent.setup();
    const { store, article } = renderCard();
    await user.click(screen.getByRole("button", { name: "Lire la fiche" }));
    act(() => store.update("earth", "earth", 0));
    turn(true);
    expect(article).not.toHaveAttribute("data-unfolded");
    expect(article).not.toHaveAttribute("data-expanded");
  });

  it("devrait piloter aussi le pied de la carte, que le dépliage affiche", () => {
    stubFixedCard();
    const { article } = renderCard({ footer: <p>Pied de plaque</p> });
    const ids = nameButton().getAttribute("aria-controls")?.split(" ") ?? [];
    expect(ids.map((id) => document.getElementById(id))).toEqual([
      article.querySelector(".plate-sections"),
      screen.getByText("Pied de plaque").parentElement,
    ]);
  });

  /*
   * La carte cesse d'être courante (défilement au clavier depuis son nom) : masquée, elle garderait le focus hors de
   * vue. Il passe à la section de l'escale, sans faire défiler.
   */
  it("devrait rendre le focus à la section quand la carte qui l'a cesse d'être courante", () => {
    stubFixedCard();
    const { store } = renderCard();
    nameButton().focus();
    act(() => store.update("mars", "jupiter" as Key, 0.3));
    expect(screen.getByRole("region", { name: "Mars" })).toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("devrait se replier quand le focus la quitte pour un autre élément, sans le reprendre", async () => {
    stubFixedCard();
    const user = userEvent.setup();
    const { article } = renderCard();
    await user.click(nameButton());
    // Focus perdu sans destination (toucher hors de toute commande) : la carte reste dépliée.
    act(() => nameButton().blur());
    expect(article).toHaveAttribute("data-unfolded");
    nameButton().focus();
    const outside = screen.getByRole("button", { name: "Hors de la carte" });
    act(() => outside.focus());
    expect(article).not.toHaveAttribute("data-unfolded");
    expect(article.querySelectorAll(".more-zone[data-open]")).toHaveLength(0);
    expect(outside).toHaveFocus();
  });

  it("devrait donner à la page la hauteur de la carte courante repliée, où le focus s'arrête", () => {
    stubFixedCard();
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(84);
    renderCard();
    expect(document.documentElement.style.getPropertyValue("--card-h")).toBe("84px");
    document.documentElement.style.removeProperty("--card-h");
  });

  /*
   * Lecture linéaire et liste des titres : les cartes non courantes restent lues, masquées à l'œil seulement. Le focus
   * qui entre dans l'une (Tab, lecteur d'écran) rend son escale courante d'un saut, sans animation.
   */
  it("devrait rendre courante, d'un saut, la carte où entre le focus", () => {
    stubFixedCard();
    const store = createStopStore<Key>("earth");
    store.update("earth", "earth", 0);
    const untrack = trackAims((key) => store.aim(key === "earth" || key === "mars" ? key : null));
    setSectionRanges([
      { key: "earth", arrive: 0, depart: 600 },
      { key: "mars", arrive: 1400, depart: 2100 },
    ]);
    render(
      <CardTrack store={store} cards={["earth", "mars"]}>
        <section data-stop="earth">
          <Plate id="terre" stop="earth" name="Terre" color="#5B9BE6" titleId="terre-titre" sections={SECTIONS} />
        </section>
        <section data-stop="mars">
          <Plate id="mars" stop="mars" name="Mars" color="#DA6A43" titleId="mars-titre" sections={SECTIONS} />
        </section>
      </CardTrack>,
    );
    const mars = screen.getByRole("heading", { level: 2, name: "Mars" }).closest("article");
    expect(mars).not.toHaveAttribute("data-current");
    act(() => nameButton().focus());
    expect(mars).toHaveAttribute("data-current");
    expect(nameButton()).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledWith({ top: 1402, behavior: "instant" });
    untrack();
    setSectionRanges([]);
  });

  it("hors de la carte fixe (grand écran, paysage bas, sans JavaScript), devrait garder le nom en simple titre", () => {
    stubFixedCard(false);
    renderCard();
    expect(screen.getByRole("heading", { level: 2, name: "Mars" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mars" })).not.toBeInTheDocument();
  });

  it("devrait rendre le nom en simple titre dès le serveur", () => {
    const html = renderToString(
      <Plate id="mars" name="Mars" color="#DA6A43" titleId="mars-titre" sections={SECTIONS} />,
    );
    expect(html).toContain('<h2 id="mars-titre">Mars</h2>');
  });
});

describe("Plate en anglais et en espagnol", () => {
  it.each([
    { locale: "en", name: "Mars", fold: "Collapse, Mars" },
    { locale: "es", name: "Marte", fold: "Plegar, Marte" },
  ] as const)("devrait tout replier avec le bouton de la langue, nom de l'astre lu après lui ($locale)", async (t) => {
    const user = userEvent.setup();
    renderIn(
      t.locale,
      <section data-stop="mars">
        <Plate id="mars" name={t.name} color="#DA6A43" titleId="mars-titre" sections={SECTIONS} />
      </section>,
    );
    const fiche = screen.getByRole("button", { name: "Lire la fiche" });
    await user.click(fiche);
    await user.click(screen.getByRole("button", { name: t.fold }));
    expect(fiche).toHaveAttribute("aria-expanded", "false");
    expect(fiche).toHaveFocus();
  });
});

/*
 * Plaque compacte, avec JavaScript (globals.css, lue telle quelle) : rang, nom encadré des escales voisines, puis la
 * rangée des titres-boutons. L'accroche y cède sa ligne à l'astre ; elle reste entière sur grand écran et sans
 * JavaScript, et lue une fois aux lecteurs d'écran.
 */
describe("feuille de style de la plaque compacte", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  /** Déclarations de la règle `selector` (indentation de 2), cherchée dans chaque bloc média de requête `query`. */
  function ruleIn(query: string, selector: string): string {
    const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Une requête longue passe à la ligne après ses virgules.
    const media = escaped(query).replace(/, /g, ",\\s+");
    const blocks = css.matchAll(new RegExp(`@media ${media} \\{([\\s\\S]*?)\\n\\}`, "g"));
    for (const [, block] of blocks) {
      const rule = new RegExp(`\\n {2}${escaped(selector)} \\{([^}]*)\\}`).exec(block)?.[1];
      if (rule !== undefined) return rule;
    }
    throw new Error(`Règle absente : ${selector}`);
  }

  it("devrait retirer l'accroche à l'œil, la laisser lue une fois aux lecteurs d'écran", () => {
    const hook = ruleIn(COMPACT_SCRIPTED, ".plate .hook");
    expect(hook).toMatch(/position: absolute;/);
    expect(hook).toMatch(/width: 1px;/);
    expect(hook).toMatch(/height: 1px;/);
    expect(hook).toMatch(/clip: rect\(0 0 0 0\);/);
    expect(hook).toMatch(/clip-path: inset\(50%\);/);
    expect(hook).not.toMatch(/display: none|visibility: hidden/);
  });

  it("devrait réduire chaque titre-bouton à un rond de 44 px, son pictogramme seul, le libellé gardé aux lecteurs d'écran", () => {
    const button = ruleIn(COMPACT_SCRIPTED, ".more-btn");
    expect(button).toMatch(/width: 44px;/);
    expect(button).toMatch(/height: 44px;/);
    expect(button).toMatch(/padding: 0;/);
    expect(button).toMatch(/border-radius: 50%;/);
    expect(ruleIn(COMPACT_SCRIPTED, ".more-btn .more-label")).toMatch(/clip: rect\(0 0 0 0\);/);
    expect(ruleIn(COMPACT_SCRIPTED, ".more-btn .more-chevron")).toMatch(/display: none;/);
  });

  it("devrait ranger les boutons sur une rangée centrée sous le nom, la section ouverte dessous, « Replier » sous elle", () => {
    expect(ruleIn(COMPACT_SCRIPTED, ".plate-sections")).toMatch(/justify-content: center;/);
    expect(ruleIn(COMPACT_SCRIPTED, ".more-heading")).toMatch(/flex: none;/);
    expect(ruleIn(COMPACT_SCRIPTED, ".more-zone")).toMatch(/order: 1;/);
    const fold = ruleIn(COMPACT_SCRIPTED, ".more-fold");
    expect(fold).toMatch(/flex-basis: auto;/);
    expect(fold).toMatch(/order: 2;/);
  });

  it("devrait marquer le bouton ouvert d'un fond et d'un anneau --soleil, pas d'une teinte seule", () => {
    const open = ruleIn(COMPACT_SCRIPTED, '.more-btn[aria-expanded="true"]');
    expect(open).toMatch(/background: var\(--soleil\);/);
    expect(open).toMatch(/color: var\(--encre\);/);
    expect(open).toMatch(/box-shadow: 0 0 0 2px var\(--plaque\), 0 0 0 3px var\(--soleil\);/);
  });

  it("devrait détacher le contour de focus d'un bouton ouvert de son anneau --soleil", () => {
    // L'anneau s'étend à 3 px du bouton ; le contour, posé à 5 px, ne le touche pas.
    expect(ruleIn(COMPACT_SCRIPTED, '.more-btn[aria-expanded="true"]:focus-visible')).toMatch(/outline-offset: 5px;/);
  });

  it("devrait garder l'état ouvert visible en couleurs forcées", () => {
    const open = ruleIn("(forced-colors: active)", '.more-btn[aria-expanded="true"]');
    expect(open).toMatch(/background: Highlight;/);
    expect(open).toMatch(/color: HighlightText;/);
    expect(open).toMatch(/forced-color-adjust: none;/);
    // Le contour de focus ne prend pas la couleur du fond de sélection qu'il entoure.
    expect(open).toMatch(/outline-color: CanvasText;/);
  });

  it("devrait ne retourner que le chevron des grands boutons, jamais le pictogramme", () => {
    expect(css).not.toMatch(/\.more-btn\[aria-expanded="true"\] svg/);
    expect(css).toMatch(/\.more-btn\[aria-expanded="true"\] \.more-chevron,/);
  });

  /*
   * Carte fixe : les plaques des autres escales restent dans la mise en page (la scène mesure leur forme repliée), et
   * lues dans l'ordre du document (lecture linéaire, liste des titres) : masquées à l'œil seulement, par découpe.
   * Repliée, la carte ne garde que le rang et le nom ; le nom est une cible de 44 px.
   */
  it("devrait masquer à l'œil seulement, sans les retirer de la mise en page, les plaques qui ne sont pas courantes", () => {
    const hidden = ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card] .plate:not([data-current])");
    expect(hidden).toMatch(/clip-path: inset\(50%\);/);
    expect(hidden).not.toMatch(/display: none|visibility: hidden/);
  });

  it("devrait arrêter le focus sous la carte repliée, de sa hauteur mesurée", () => {
    expect(ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card]")).toMatch(
      /scroll-padding-top: calc\(var\(--card-top\) \+ var\(--card-h, 5rem\) \+ 0\.75rem\);/,
    );
  });

  it("devrait réduire la carte repliée au rang et au nom, le nom en cible de 44 px", () => {
    expect(ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card] .plate:not([data-unfolded]) > .plate-sections ~ *")).toMatch(/display: none;/);
    expect(ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card] .plate-name")).toMatch(/min-height: 44px;/);
    expect(ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card] .plate-title .stop-step")).toMatch(/width: 44px;/);
    const sections = ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card] .plate-sections");
    expect(sections).toMatch(/overflow-y: auto;/);
    expect(sections).toMatch(/overscroll-behavior: contain;/);
  });

  it("devrait faire balayer le squelette, et l'arrêter en mouvement réduit (règle globale)", () => {
    expect(ruleIn(FIXED_CARD_QUERY, "html[data-fixed-card] .plate-skeleton::after")).toMatch(/animation: skeleton-sweep/);
    expect(ruleIn("(prefers-reduced-motion: reduce)", "*::after")).toMatch(/animation: none !important;/);
  });

  /*
   * Avant l'hydratation (réseau lent, script en échec), la plaque reste entière et lue : chaque règle de la carte fixe
   * attend le client prêt (`html[data-fixed-card]`, posé par CardTrack). Seules les variables n'attendent pas.
   */
  it("devrait n'activer la carte fixe qu'une fois le client prêt", () => {
    const media = FIXED_CARD_QUERY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/, /g, ",\\s+");
    const blocks = [...css.matchAll(new RegExp(`@media ${media} \\{([\\s\\S]*?)\\n\\}`, "g"))];
    expect(blocks.length).toBeGreaterThan(0);
    for (const [, block] of blocks) {
      // Une règle par sélecteur de liste, un par ligne ; commentaires ôtés.
      const rules = block.replace(/\/\*[\s\S]*?\*\//g, "");
      const selectors = [...rules.matchAll(/\n {2,4}([^\s@}][^;{}]*?)\s*\{/g)].flatMap(([, list]) =>
        list.split(/,\s*\n\s*/),
      );
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) {
        if (selector === ":root") continue;
        expect(selector).toMatch(/^html\[data-fixed-card\]/);
      }
    }
    const sizes = readFileSync(resolve(process.cwd(), "src/components/sizes/SizesPage.module.css"), "utf8");
    expect(sizes).toMatch(/:global\(html\[data-fixed-card\]\) \.scaleBar \{/);
  });

  it("devrait garder l'accroche hors de la plaque compacte (grand écran, sans JavaScript)", () => {
    expect(css).toMatch(/\n\.hook \{[^}]*font-size: 1\.375rem;/);
    expect(css).not.toMatch(/\n\.plate \.hook \{/);
  });
});
