import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchorOf } from "@/components/journey/anchors";
import type { RailStop } from "@/components/journey/DistanceRail";
import { ExploreMode } from "@/components/journey/ExploreMode";
import { TopBar } from "@/components/journey/TopBar";
import SolarScene from "@/components/scene/SolarScene";
import { SiteHeader } from "@/components/site/SiteHeader";
import { RAIL_STOPS, type StopKey } from "@/lib/journey/camera";
import { exploreStore } from "@/lib/journey/explore";
import { journeyStore } from "@/lib/journey/store";
import { currentFragment } from "@/lib/site/fragment";

/**
 * Moteur Three simulé : jsdom n'a pas de WebGL. La scène le crée quand elle s'affiche et le libère quand elle quitte
 * l'écran ; tout le reste de la scène (étiquettes, boucle d'animation, sortie de l'exploration) est le vrai.
 */
const scene = vi.hoisted(() => {
  const engine = { frame: vi.fn<(dt: number) => void>(), dispose: vi.fn<() => void>() };
  return { engine, create: vi.fn(() => engine) };
});
vi.mock("@/components/scene/engine", () => ({ createSolarScene: scene.create }));

/** Repères de la règle et lignes du menu des escales, tels que les pose la page. */
const STOPS: RailStop[] = RAIL_STOPS.map(({ key, au }) => ({ key, au, href: anchorOf(key) }));

/** Escale affichée par le voyage, au repos. */
const showStop = (key: StopKey) => act(() => journeyStore.update(key, key, 0));

/**
 * jsdom ne sait pas suivre un lien vers une autre page. Après les écouteurs de React, le test note pour chaque clic
 * sur un lien si la page a laissé le navigateur le suivre (rien d'annulé), puis l'annule lui-même.
 */
let followed: boolean[] = [];
function interceptLinks(event: MouseEvent) {
  if (!(event.target instanceof Element) || event.target.closest("a") === null) return;
  followed.push(!event.defaultPrevented);
  event.preventDefault();
}

beforeEach(() => {
  followed = [];
  document.addEventListener("click", interceptLinks);
});

afterEach(() => {
  cleanup();
  document.removeEventListener("click", interceptLinks);
  document.cookie = "lang=; Path=/; Max-Age=0";
  act(() => journeyStore.reset());
});

describe("TopBar", () => {
  it("devrait poser la barre commune dans la langue du voyage, son onglet en page courante", () => {
    render(<TopBar locale="en" stops={STOPS} />);
    const journey = within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: "Journey" });
    expect(journey).toHaveAttribute("href", "/en/voyage");
    expect(journey).toHaveAttribute("aria-current", "page");
  });

  it("devrait mener la marque à l'accueil du site, dans la langue du voyage", () => {
    render(<TopBar locale="es" stops={STOPS} />);
    expect(screen.getByRole("link", { name: "Astronomie, inicio" })).toHaveAttribute("href", "/es");
  });

  it("devrait rester la barre que mesure la scène (.bar), effacée pendant l'exploration, avec les commandes du voyage", () => {
    render(<TopBar locale="fr" stops={STOPS} />);
    const bar = screen.getByRole("banner");
    expect(bar).toHaveClass("bar");
    expect(bar).toHaveAttribute("data-hide-on-explore");
    expect(bar).toHaveAttribute("data-page", "voyage");
    expect(bar).toHaveAttribute("data-controls");
  });

  it("devrait afficher l'escale en cours dans la barre", () => {
    showStop("saturn");
    render(<TopBar locale="fr" stops={STOPS} />);
    expect(screen.getByRole("banner").querySelector(".where")).toHaveTextContent("Saturne");
  });

  it("devrait suivre au clavier l'ordre de la barre : marque, onglets, commandes du voyage, langue, menu", async () => {
    const user = userEvent.setup();
    showStop("saturn");
    render(<TopBar locale="fr" stops={STOPS} />);
    const order = [
      screen.getByRole("link", { name: "Astronomie, accueil" }),
      screen.getByRole("link", { name: "Accueil" }),
      screen.getByRole("link", { name: "Voyage" }),
      screen.getByRole("link", { name: "Tailles" }),
      screen.getByRole("link", { name: "À propos" }),
      screen.getByRole("button", { name: "Saturne, changer d'escale" }),
      screen.getByRole("button", { name: "Tourner autour de Saturne" }),
      screen.getByRole("button", { name: "FR, langue\u00a0: français" }),
      screen.getByRole("button", { name: "Menu" }),
    ];
    for (const element of order) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it("devrait garder l'escale affichée en changeant de langue : à Saturne, l'anglais mène à /en/voyage#saturne", async () => {
    const user = userEvent.setup();
    showStop("saturn");
    render(<TopBar locale="fr" stops={STOPS} />);
    await user.click(screen.getByRole("button", { name: "FR, langue\u00a0: français" }));
    const english = screen.getByRole("link", { name: "English" });
    await user.click(english);
    expect(english).toHaveAttribute("href", "/en/voyage#saturne");
    expect(followed).toEqual([true]);
  });

  it("devrait garder l'escale affichée aussi depuis le menu replié des petits écrans", async () => {
    const user = userEvent.setup();
    showStop("saturn");
    render(<TopBar locale="fr" stops={STOPS} />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const english = screen.getByRole("link", { name: "English" });
    await user.click(english);
    expect(english).toHaveAttribute("href", "/en/voyage#saturne");
    expect(followed).toEqual([true]);
  });

  /**
   * Les onglets sont des liens `next/link` : on quitte le voyage sans recharger la page. Next 16, avec
   * `cacheComponents`, ne démonte pas la page quittée : il la masque sous `<Activity>` (display: none, effets
   * nettoyés, état et DOM gardés) pour la rendre telle quelle au retour, jusqu'à trois pages. Pendant l'exploration,
   * la barre est inerte : on en sort par le retour arrière du navigateur, que Next traite de la même façon.
   */
  describe("en quittant le voyage sans recharger la page", () => {
    /** Images demandées et pas encore servies : la boucle d'animation commune tourne tant qu'il en reste une. */
    const frames = new Map<number, FrameRequestCallback>();
    let lastFrame = 0;
    /** Frontière navigateur : jsdom ne défile pas ; le bouchon pose la position atteinte. */
    const scrollTo = vi.fn<(options: ScrollToOptions) => void>();

    /** Frontière navigateur : jsdom ignore `inert` ; comme un navigateur, la propriété reflète l'attribut. */
    function emulateInert(): void {
      Object.defineProperty(HTMLElement.prototype, "inert", {
        configurable: true,
        get(this: HTMLElement) {
          return this.hasAttribute("inert");
        },
        set(this: HTMLElement, value: boolean) {
          this.toggleAttribute("inert", Boolean(value));
        },
      });
    }

    beforeEach(() => {
      emulateInert();
      frames.clear();
      vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        lastFrame += 1;
        frames.set(lastFrame, callback);
        return lastFrame;
      });
      vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        frames.delete(id);
      });
      scrollTo.mockReset();
      scrollTo.mockImplementation(({ top }) => vi.stubGlobal("scrollY", top));
      vi.stubGlobal("scrollTo", scrollTo);
      scene.create.mockClear();
      scene.engine.dispose.mockClear();
      showStop("saturn");
    });

    afterEach(() => {
      act(() => exploreStore.exit());
      cleanup();
      document.documentElement.removeAttribute("data-explore");
      delete (HTMLElement.prototype as { inert?: boolean }).inert;
      vi.unstubAllGlobals();
    });

    /** Le voyage réduit à ce que sa sortie met en jeu, dans l'ordre de la page : scène, barre, contenu, exploration. */
    function Voyage() {
      return (
        <>
          <SolarScene />
          <TopBar locale="fr" stops={STOPS} />
          <main data-hide-on-explore>
            <h1>Voyage</h1>
          </main>
          <ExploreMode />
        </>
      );
    }

    /** L'accueil : sa barre, sans commandes, et son contenu. */
    function Home() {
      return (
        <>
          <SiteHeader locale="fr" page="home" />
          <main>
            <h1>Accueil</h1>
          </main>
        </>
      );
    }

    /** Le site tel que le range le routeur : la page affichée, et l'autre, déjà visitée, masquée et gardée. */
    function Site({ page }: { page: "voyage" | "home" }) {
      return (
        <>
          <Activity mode={page === "voyage" ? "visible" : "hidden"}>
            <Voyage />
          </Activity>
          <Activity mode={page === "home" ? "visible" : "hidden"}>
            <Home />
          </Activity>
        </>
      );
    }

    /** « Tourner autour » de Saturne, depuis la barre. */
    async function exploreSaturn(): Promise<void> {
      await userEvent.setup().click(screen.getByRole("button", { name: "Tourner autour de Saturne" }));
    }

    it("devrait rendre la page affichée : data-explore retiré de <html>, plus rien d'inerte", async () => {
      const { rerender } = render(<Site page="voyage" />);
      await exploreSaturn();
      expect(document.documentElement).toHaveAttribute("data-explore");
      rerender(<Site page="home" />);
      expect(document.documentElement).not.toHaveAttribute("data-explore");
      expect(document.querySelectorAll("[data-hide-on-explore][inert]")).toHaveLength(0);
      expect(screen.getByRole("banner")).toHaveAttribute("data-page", "home");
    });

    it("devrait sortir de l'exploration", async () => {
      const { rerender } = render(<Site page="voyage" />);
      await exploreSaturn();
      rerender(<Site page="home" />);
      expect(exploreStore.get().stop).toBeNull();
    });

    it("devrait libérer la scène 3D et arrêter la boucle d'animation", async () => {
      const { rerender } = render(<Site page="voyage" />);
      await exploreSaturn();
      expect(frames.size).toBe(1);
      rerender(<Site page="home" />);
      expect(scene.engine.dispose).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
    });

    it("devrait rendre le clavier et la fenêtre à la page affichée : flèches, Échap, redimensionnement", async () => {
      const { rerender } = render(<Site page="voyage" />);
      await exploreSaturn();
      rerender(<Site page="home" />);
      scrollTo.mockClear();
      // Annulées, les flèches ne feraient plus défiler l'accueil, et Échap ne fermerait plus ses menus.
      expect(fireEvent.keyDown(document.body, { key: "ArrowLeft" })).toBe(true);
      expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(true);
      fireEvent(window, new Event("resize"));
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("ne devrait plus donner l'escale du voyage au changement de langue", async () => {
      const { rerender } = render(<Site page="voyage" />);
      await exploreSaturn();
      rerender(<Site page="home" />);
      expect(currentFragment()).toBeNull();
    });

    it("devrait retrouver au retour le voyage hors de l'exploration, sans saut, scène reconstruite", async () => {
      const { rerender } = render(<Site page="voyage" />);
      await exploreSaturn();
      rerender(<Site page="home" />);
      scrollTo.mockClear();
      rerender(<Site page="voyage" />);
      expect(exploreStore.get().stop).toBeNull();
      expect(document.documentElement).not.toHaveAttribute("data-explore");
      expect(scrollTo).not.toHaveBeenCalled();
      expect(scene.create).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Tourner autour de Saturne" })).toBeEnabled();
      expect(currentFragment()).toBe("#saturne");
    });

    it("devrait tout rendre de même quand le voyage est démonté plutôt que masqué", async () => {
      const { rerender } = render(<Voyage />);
      await exploreSaturn();
      rerender(<Home />);
      expect(document.documentElement).not.toHaveAttribute("data-explore");
      expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
      expect(exploreStore.get().stop).toBeNull();
      expect(scene.engine.dispose).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
      expect(fireEvent.keyDown(document.body, { key: "ArrowLeft" })).toBe(true);
      expect(currentFragment()).toBeNull();
    });
  });
});
