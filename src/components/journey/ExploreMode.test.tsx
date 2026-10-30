import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { earthReading } from "@/components/journey/earthReading";
import { ExploreMode } from "@/components/journey/ExploreMode";
import { setSectionRanges } from "@/components/journey/navigation";
import { renderIn } from "@/components/modules/testUtils";
import type { StopKey } from "@/lib/journey/camera";
import { exploreStore } from "@/lib/journey/explore";
import type { ExploreStop, OrbitInput } from "@/lib/journey/orbit";
import { journeyStore } from "@/lib/journey/store";
import { getClock } from "@/lib/sim/clock";

const DEG = Math.PI / 180;
/** Instant simulé : Saturne le soir, 46,6° à l'est du Soleil, 16,4″, disque éclairé à 99,9 %. */
const NOW = Date.parse("2026-02-01T00:00:00Z");
/** Calme exigé par l'annonceur avant de parler, en ms. */
const CALM_MS = 450;
/** Défilement de la page au moment d'entrer, au repos sur l'escale. */
const SCROLL_Y = 1200;
const SATURN_GROUP = "Exploration autour de Saturne";

/** Frontière navigateur : défilement demandé à la fenêtre ; jsdom ne défile pas, le bouchon pose la position atteinte. */
const scrollTo = vi.fn<(options: ScrollToOptions) => void>();

/**
 * Frontière navigateur : jsdom ignore `inert` (aucune propriété reflétée, focus accepté dans un sous-arbre inerte).
 * Comme un navigateur, la propriété reflète l'attribut et un élément d'un sous-arbre inerte refuse le focus :
 * le retour du focus sur un bouton de la barre n'est possible qu'une fois la barre redevenue active.
 */
const nativeFocus = HTMLElement.prototype.focus;
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
  vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
    if (!this.closest("[inert]")) nativeFocus.call(this, options);
  });
}

/** Escale affichée par le voyage. */
const showStop = (key: StopKey) => act(() => journeyStore.update(key, key, 0));
const enter = (stop: ExploreStop) => act(() => exploreStore.enter(stop));
/**
 * Calme de l'annonceur écoulé. Minuteurs simulés seulement dans les tests d'annonce : avec eux, user-event attend
 * un minuteur que Testing Library n'avance que pour Jest (les clics y passent par fireEvent).
 */
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(CALM_MS);
  });

beforeEach(() => {
  emulateInert();
  scrollTo.mockReset();
  scrollTo.mockImplementation(({ top }) => vi.stubGlobal("scrollY", top));
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("scrollY", SCROLL_Y);
  // Frontière navigateur : jsdom n'a ni ResizeObserver ni matchMedia.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  getClock().reset(NOW);
  showStop("saturn");
});

afterEach(() => {
  act(() => exploreStore.exit());
  cleanup();
  act(() => journeyStore.update("hero", "hero", 0));
  setSectionRanges([]);
  document.documentElement.removeAttribute("data-explore");
  delete (HTMLElement.prototype as { inert?: boolean }).inert;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * La page réduite à ce que le mode touche : le bouton d'entrée dans la barre, le contenu et le pied de page,
 * tous marqués `data-hide-on-explore`, puis la couche d'exploration.
 */
function renderPage() {
  return render(
    <>
      <header data-hide-on-explore>
        <button type="button" id="tourner-autour">
          Tourner autour
        </button>
      </header>
      <main data-hide-on-explore>
        <button type="button">Lire la fiche</button>
      </main>
      <footer data-hide-on-explore>Sources</footer>
      <ExploreMode />
    </>,
  );
}

/** Compare les gestes transmis au moteur, champ par champ. */
function expectInput(actual: OrbitInput | null, expected: OrbitInput) {
  expect(actual).not.toBeNull();
  expect(actual?.azim, "azim").toBeCloseTo(expected.azim, 9);
  expect(actual?.elev, "elev").toBeCloseTo(expected.elev, 9);
  expect(actual?.distanceLog, "distanceLog").toBeCloseTo(expected.distanceLog, 9);
  expect(actual?.recenter, "recenter").toBe(expected.recenter);
}

const TURN_LEFT: OrbitInput = { azim: -15 * DEG, elev: 0, distanceLog: 0, recenter: false };
const CLOSER: OrbitInput = { azim: 0, elev: 0, distanceLog: -Math.log(1.25), recenter: false };
const RECENTER: OrbitInput = { azim: 0, elev: 0, distanceLog: 0, recenter: true };

describe("ExploreMode", () => {
  describe("entrée", () => {
    it("devrait marquer la page (data-explore sur <html>) pour bloquer son défilement", () => {
      renderPage();
      enter("saturn");
      expect(document.documentElement).toHaveAttribute("data-explore");
    });

    it("devrait rendre inerte tout ce qui est marqué data-hide-on-explore", () => {
      renderPage();
      enter("saturn");
      expect(screen.getByRole("banner")).toHaveAttribute("inert");
      expect(screen.getByRole("main")).toHaveAttribute("inert");
      expect(screen.getByRole("contentinfo")).toHaveAttribute("inert");
    });

    it("devrait placer le focus sur le groupe des commandes d'exploration (#exploration), nommé d'après l'escale", () => {
      renderPage();
      enter("saturn");
      const group = screen.getByRole("group", { name: SATURN_GROUP });
      expect(group).toHaveFocus();
      expect(group).toHaveAttribute("id", "exploration");
    });

    it("devrait annoncer l'exploration et ses commandes une fois le calme de l'annonceur écoulé", () => {
      vi.useFakeTimers();
      renderPage();
      enter("saturn");
      settle();
      expect(screen.getByRole("status")).toHaveTextContent(SATURN_GROUP);
    });

    it("devrait poser la page au repos de l'escale, sans animation, quand on entre pendant le vol", () => {
      // Défilement à 1 200 px : à mi-vol de Jupiter (repos jusqu'à 900) vers Saturne (repos dès 1 500), Saturne affichée.
      setSectionRanges([
        { key: "jupiter", arrive: 0, depart: 900 },
        { key: "saturn", arrive: 1500, depart: 2400 },
      ]);
      renderPage();
      enter("saturn");
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 1502, behavior: "instant" });
    });
  });

  describe("clavier", () => {
    it.each([
      ["{ArrowLeft}", TURN_LEFT],
      ["+", CLOSER],
      ["0", RECENTER],
    ] as const)("devrait transmettre la touche %s au moteur, où que soit le focus", async (keys, expected) => {
      const user = userEvent.setup();
      renderPage();
      enter("saturn");
      act(() => screen.getByRole("group", { name: SATURN_GROUP }).blur());
      await user.keyboard(keys);
      expectInput(exploreStore.takeInput(), expected);
    });
  });

  describe("sortie par Échap", () => {
    const pressEscape = () => fireEvent.keyDown(screen.getByRole("group", { name: SATURN_GROUP }), { key: "Escape" });

    it("devrait consommer Échap (preventDefault) pour ne fermer qu'une couche", () => {
      renderPage();
      enter("saturn");
      expect(pressEscape()).toBe(false);
    });

    it("devrait quitter le mode", () => {
      renderPage();
      enter("saturn");
      pressEscape();
      expect(exploreStore.get().stop).toBeNull();
    });

    it("devrait rendre la page : inert et data-explore retirés", () => {
      renderPage();
      enter("saturn");
      pressEscape();
      expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
      expect(screen.getByRole("main")).not.toHaveAttribute("inert");
      expect(screen.getByRole("contentinfo")).not.toHaveAttribute("inert");
      expect(document.documentElement).not.toHaveAttribute("data-explore");
    });

    it("devrait rendre le focus au bouton « Tourner autour », une fois la barre redevenue active", () => {
      renderPage();
      enter("saturn");
      pressEscape();
      expect(screen.getByRole("button", { name: "Tourner autour" })).toHaveFocus();
    });
  });

  describe("pavé d'exploration", () => {
    it.each([
      ["Tourner vers la gauche", TURN_LEFT],
      ["Se rapprocher", CLOSER],
      ["Recentrer", RECENTER],
    ] as const)("devrait transmettre « %s » au moteur", async (name, expected) => {
      const user = userEvent.setup();
      renderPage();
      enter("saturn");
      await user.click(screen.getByRole("button", { name }));
      expectInput(exploreStore.takeInput(), expected);
    });

    it("devrait quitter le mode avec « Terminer »", async () => {
      const user = userEvent.setup();
      renderPage();
      enter("saturn");
      await user.click(screen.getByRole("button", { name: "Terminer" }));
      expect(exploreStore.get().stop).toBeNull();
    });
  });

  describe("vu depuis la Terre", () => {
    const toggle = () => screen.getByRole("button", { name: "Vu depuis la Terre" });

    it.each(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"] as const)(
      "devrait proposer la bascule, relâchée, à %s",
      (stop) => {
        showStop(stop);
        renderPage();
        enter(stop);
        expect(toggle()).toHaveAttribute("aria-pressed", "false");
      },
    );

    it.each(["hero", "sun", "earth", "beyond", "stars", "galaxy"] as const)(
      "ne devrait pas proposer la bascule à %s, qui n'est pas une autre planète",
      (stop) => {
        showStop(stop);
        renderPage();
        enter(stop);
        expect(screen.queryByRole("button", { name: "Vu depuis la Terre" })).not.toBeInTheDocument();
      },
    );

    it("devrait passer en vue depuis la Terre au clic, bascule enfoncée", async () => {
      const user = userEvent.setup();
      renderPage();
      enter("saturn");
      await user.click(toggle());
      expect(exploreStore.get().fromEarth).toBe(true);
      expect(toggle()).toHaveAttribute("aria-pressed", "true");
    });

    it("devrait afficher la lecture du jour : éclairage, diamètre, élongation, puis quand regarder", async () => {
      const user = userEvent.setup();
      renderPage();
      enter("saturn");
      await user.click(toggle());
      expect(screen.getByText("Vu depuis la Terre, ce jour")).toBeVisible();
      expect(document.body).toHaveTextContent("Éclairée à 100 % · 16″ de diamètre · 47° à l'est du Soleil");
      expect(document.body).toHaveTextContent("Le soir, à l'ouest après le coucher du Soleil");
    });

    it("devrait annoncer la lecture, unités en toutes lettres, à l'activation", () => {
      vi.useFakeTimers();
      renderPage();
      enter("saturn");
      settle();
      fireEvent.click(toggle());
      settle();
      expect(screen.getByRole("status")).toHaveTextContent(earthReading("saturn", NOW, "fr").spoken);
    });

    it("devrait relâcher la bascule quand on fait tourner l'astre", async () => {
      const user = userEvent.setup();
      renderPage();
      enter("saturn");
      await user.click(toggle());
      act(() => exploreStore.rotate(0.1, 0));
      expect(toggle()).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("garde-fous", () => {
    /** La page défile quand même (ancre, retour arrière, trou d'iOS) : le navigateur prévient le document. */
    const scrollPageTo = (y: number) =>
      act(() => {
        vi.stubGlobal("scrollY", y);
        document.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

    it("devrait quitter le mode quand la page défile malgré tout", () => {
      renderPage();
      enter("saturn");
      scrollPageTo(SCROLL_Y + 10);
      expect(exploreStore.get().stop).toBeNull();
    });

    it("ne devrait pas quitter le mode pour un écart de défilement de moins de 2 px", () => {
      renderPage();
      enter("saturn");
      scrollPageTo(SCROLL_Y + 1);
      expect(exploreStore.get().stop).toBe("saturn");
    });

    it("ne devrait pas quitter le mode quand arrive l'événement scroll de son propre saut (entrée pendant le vol)", () => {
      setSectionRanges([
        { key: "jupiter", arrive: 0, depart: 900 },
        { key: "saturn", arrive: 1500, depart: 2400 },
      ]);
      renderPage();
      enter("saturn");
      // Le navigateur signale le saut à 1 502 px après coup : la référence du garde-fou est la position atteinte.
      scrollPageTo(1502);
      expect(exploreStore.get().stop).toBe("saturn");
    });

    it("devrait quitter le mode quand l'escale affichée change", () => {
      renderPage();
      enter("saturn");
      showStop("uranus");
      expect(exploreStore.get().stop).toBeNull();
    });
  });

  /*
   * Next 16, avec `cacheComponents`, ne démonte pas la page qu'on quitte par un onglet ou par le retour arrière : il la
   * masque sous `<Activity>` (effets nettoyés, état gardé) pour la rendre telle quelle au retour. C'est d'ordinaire la
   * scène qui met fin à l'exploration en se libérant ; tant que three.js se charge, elle n'est pas encore montée.
   */
  describe("en quittant la page sans la recharger, scène pas encore montée", () => {
    /** La page du voyage, affichée ou masquée par le routeur. */
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <header data-hide-on-explore>
          <button type="button" id="tourner-autour">
            Tourner autour
          </button>
        </header>
        <main data-hide-on-explore>
          <button type="button">Lire la fiche</button>
        </main>
        <ExploreMode />
      </Activity>
    );

    it("devrait sortir de l'exploration quand la page est masquée", () => {
      const { rerender } = render(page("visible"));
      enter("saturn");
      rerender(page("hidden"));
      expect(exploreStore.get().stop).toBeNull();
      expect(document.documentElement).not.toHaveAttribute("data-explore");
    });

    it("ne devrait pas reprendre l'exploration au retour sur la page : ni saut, ni page figée, ni focus déplacé", () => {
      const { rerender } = render(page("visible"));
      enter("saturn");
      rerender(page("hidden"));
      scrollTo.mockClear();
      rerender(page("visible"));
      expect(exploreStore.get().stop).toBeNull();
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.documentElement).not.toHaveAttribute("data-explore");
      expect(document.querySelectorAll("[data-hide-on-explore][inert]")).toHaveLength(0);
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
    });

    it("devrait sortir de l'exploration quand la page est démontée", () => {
      const { unmount } = renderPage();
      enter("saturn");
      unmount();
      expect(exploreStore.get().stop).toBeNull();
    });
  });
});

describe("ExploreMode en anglais et en espagnol", () => {
  const LOCALIZED = [
    {
      locale: "en",
      group: "Orbiting Saturn",
      announce:
        "Orbiting Saturn. Drag to turn, pinch or use the scroll wheel to change the distance. With the keyboard: arrow keys to turn, plus and minus for distance, 0 to recentre, Escape to finish.",
      where: "Saturn",
      hint: "Drag to turn · scroll for distance · Esc to finish",
      fromEarth: "Seen from Earth",
      done: "Done",
      pad: ["Turn left", "Tilt up", "Tilt down", "Turn right", "Move away", "Move closer", "Recentre"],
      title: "Seen from Earth on this date",
      figures: "100% lit · 16″ across · 47° east of the Sun",
      whenToLook: "In the evening, in the west after sunset",
    },
    {
      locale: "es",
      group: "Girando alrededor de Saturno",
      announce:
        "Girando alrededor de Saturno. Arrastra para girar, pellizca o usa la rueda del ratón para cambiar la distancia. Con el teclado: flechas para girar, más y menos para la distancia, 0 para volver a centrar, Escape para terminar.",
      where: "Saturno",
      hint: "Arrastra para girar · rueda para la distancia · Esc para terminar",
      fromEarth: "Visto desde la Tierra",
      done: "Terminar",
      pad: [
        "Girar a la izquierda",
        "Girar hacia arriba",
        "Girar hacia abajo",
        "Girar a la derecha",
        "Alejarse",
        "Acercarse",
        "Volver a centrar",
      ],
      title: "Visto desde la Tierra en esta fecha",
      figures: "Iluminado al 100 % · 16″ de diámetro · 47° al este del Sol",
      whenToLook: "Al anochecer, al oeste tras la puesta de sol",
    },
  ] as const;

  /** La page réduite à ce que le mode touche, dans la langue donnée. */
  const renderPageIn = (locale: (typeof LOCALIZED)[number]["locale"]) =>
    renderIn(
      locale,
      <>
        <header data-hide-on-explore>
          <button type="button" id="tourner-autour">
            …
          </button>
        </header>
        <ExploreMode />
      </>,
    );

  it.each(LOCALIZED)("devrait nommer le groupe des commandes d'après l'escale, dans la langue ($locale)", (t) => {
    renderPageIn(t.locale);
    enter("saturn");
    expect(screen.getByRole("group", { name: t.group })).toHaveFocus();
  });

  it.each(LOCALIZED)("devrait annoncer l'exploration et ses gestes dans la langue de la page ($locale)", (t) => {
    vi.useFakeTimers();
    renderPageIn(t.locale);
    enter("saturn");
    settle();
    expect(screen.getByRole("status")).toHaveTextContent(t.announce);
  });

  it.each(LOCALIZED)("devrait écrire la barre et le pavé dans la langue ($locale)", (t) => {
    renderPageIn(t.locale);
    enter("saturn");
    const group = screen.getByRole("group", { name: t.group });
    expect(within(group).getByText(t.where)).toBeInTheDocument();
    expect(within(group).getByText(t.hint)).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: t.fromEarth })).toHaveAttribute("aria-pressed", "false");
    expect(within(group).getByRole("button", { name: t.done })).toBeInTheDocument();
    const pad = group.querySelector<HTMLElement>(".explore-pad");
    if (!pad) throw new Error("Pavé d'exploration absent");
    const padLabels = within(pad)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(padLabels).toEqual(t.pad);
  });

  it.each(LOCALIZED)("devrait afficher et annoncer la lecture du jour dans la langue ($locale)", (t) => {
    vi.useFakeTimers();
    renderPageIn(t.locale);
    enter("saturn");
    settle();
    fireEvent.click(screen.getByRole("button", { name: t.fromEarth }));
    expect(screen.getByText(t.title)).toBeVisible();
    expect(screen.getByText(t.figures)).toBeVisible();
    expect(screen.getByText(t.whenToLook)).toBeVisible();
    settle();
    expect(screen.getByRole("status")).toHaveTextContent(earthReading("saturn", NOW, t.locale).spoken);
  });
});
