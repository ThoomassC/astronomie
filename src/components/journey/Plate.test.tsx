import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Plate, type PlateSection } from "@/components/journey/Plate";

const SECTIONS: readonly PlateSection[] = [
  { key: "fiche", label: "Lire la fiche", content: <p>Texte de la fiche</p> },
  { key: "module", label: "Votre poids sur chaque astre", content: <button type="button">Peser</button> },
];

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
          header={<h2>Mars</h2>}
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
      <Plate id="mars" name="Mars" color="#DA6A43" header={<h2>Mars</h2>} sections={SECTIONS} />,
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

  it("devrait garder le pied de plaque visible après les sections", () => {
    renderPlate();
    expect(screen.getByText("Pied de plaque")).toBeInTheDocument();
  });

  it("devrait donner des identifiants de zone uniques par plaque", () => {
    render(
      <>
        <Plate id="terre" name="Terre" color="#5B9BE6" header={null} sections={SECTIONS} />
        <Plate id="mars" name="Mars" color="#DA6A43" header={null} sections={SECTIONS} />
      </>,
    );
    const ids = screen.getAllByRole("button", { expanded: false }).map((button) => button.getAttribute("aria-controls"));
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
