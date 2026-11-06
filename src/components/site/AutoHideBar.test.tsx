import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Activity, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollInstantly } from "@/components/journey/navigation";
import { AutoHideBar } from "@/components/site/AutoHideBar";
import { CONCEAL_AFTER_PX, REVEAL_AFTER_PX } from "@/lib/site/barSlide";

/*
 * Barre haute du Voyage et de Tailles : elle suit le défilement de la page (glisse hors de l'écran en descendant,
 * revient en remontant), revient quand le focus y entre ou que la fenêtre change de taille, et laisse tout en place
 * quand la page est masquée. La feuille de style décide où elle glisse vraiment (mise en page compacte, écran bas) et
 * la garde tant qu'elle a le focus clavier ou un menu ouvert.
 */

/** Vue de 800 px sur une page de 10 000 px : on défile de 0 à 9 200 px. */
const VIEW_HEIGHT = 800;
const PAGE_HEIGHT = 10_000;
const BOTTOM = PAGE_HEIGHT - VIEW_HEIGHT;
/** Hauteur de la barre. */
const BAR_HEIGHT = 64;

let scrollY = 0;

/** La page défile jusqu'à `y` px ; le navigateur prévient par un événement `scroll`. */
const scrollPageTo = (y: number) => {
  scrollY = y;
  fireEvent.scroll(window);
};

/**
 * La page saute d'elle-même jusqu'à `y` px (scrollInstantly : repli d'une plaque, caméra posée avant l'exploration) ;
 * l'événement `scroll` arrive ensuite, comme dans le navigateur.
 */
const jumpPageTo = (y: number) => {
  act(() => scrollInstantly(y));
  fireEvent.scroll(window);
};

beforeEach(() => {
  scrollY = 0;
  // Frontière navigateur : jsdom ne fait ni défiler ni mesurer.
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.stubGlobal("innerHeight", VIEW_HEIGHT);
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(PAGE_HEIGHT);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(BAR_HEIGHT);
  vi.stubGlobal("scrollTo", ({ top }: ScrollToOptions) => {
    scrollY = top ?? scrollY;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Bar({ children }: { children?: ReactNode }) {
  return (
    <AutoHideBar className="bar header" page="voyage" controls>
      <button type="button">Escales</button>
      {children}
    </AutoHideBar>
  );
}

const banner = () => screen.getByRole("banner");

describe("AutoHideBar", () => {
  it("devrait poser la barre de la page : classes, page, commandes, effacée pendant l'exploration, masquable", () => {
    render(<Bar />);
    expect(banner()).toHaveClass("bar", "header");
    expect(banner()).toHaveAttribute("data-page", "voyage");
    expect(banner()).toHaveAttribute("data-controls");
    expect(banner()).toHaveAttribute("data-hide-on-explore");
    expect(banner()).toHaveAttribute("data-autohide");
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("ne devrait pas signaler de commandes quand la page n'en a pas", () => {
    render(<AutoHideBar className="bar" page="sizes" controls={false} />);
    expect(banner()).not.toHaveAttribute("data-controls");
  });

  it("devrait glisser hors de l'écran quand on descend, et revenir dès qu'on remonte", () => {
    render(<Bar />);
    scrollPageTo(1000);
    scrollPageTo(1000 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
    scrollPageTo(1000 + CONCEAL_AFTER_PX - REVEAL_AFTER_PX);
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("devrait rester affichée en haut de la page, à moins de sa hauteur du haut", () => {
    render(<Bar />);
    scrollPageTo(BAR_HEIGHT);
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("ne devrait pas revenir sur le rebond du bas de la page (défilement au-delà du bas, puis retour)", () => {
    render(<Bar />);
    scrollPageTo(BOTTOM - 100);
    scrollPageTo(BOTTOM);
    scrollPageTo(BOTTOM + 60);
    scrollPageTo(BOTTOM);
    expect(banner()).toHaveAttribute("data-concealed");
  });

  /* Un saut programmé n'est pas un geste : la barre reste comme elle est, sa course repart de la nouvelle position. */
  it("ne devrait pas revenir quand la page remonte d'elle-même en plein vol (repli d'une plaque)", () => {
    render(<Bar />);
    scrollPageTo(2000);
    jumpPageTo(1400);
    expect(banner()).toHaveAttribute("data-concealed");
    scrollPageTo(1400 - REVEAL_AFTER_PX);
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("ne devrait pas se cacher quand la page descend d'elle-même (caméra posée avant l'exploration)", () => {
    render(<Bar />);
    scrollPageTo(1000);
    scrollPageTo(1000 - REVEAL_AFTER_PX);
    expect(banner()).not.toHaveAttribute("data-concealed");
    jumpPageTo(1800);
    expect(banner()).not.toHaveAttribute("data-concealed");
    scrollPageTo(1800 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
  });

  it("devrait revenir quand le focus y entre", () => {
    render(<Bar />);
    scrollPageTo(2000);
    expect(banner()).toHaveAttribute("data-concealed");
    act(() => screen.getByRole("button", { name: "Escales" }).focus());
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  it("devrait repartir de la position du focus : descendre ensuite la cache de nouveau", () => {
    render(<Bar />);
    scrollPageTo(2000);
    act(() => screen.getByRole("button", { name: "Escales" }).focus());
    scrollPageTo(2000 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
  });

  it("devrait revenir quand la fenêtre change de largeur (rotation du téléphone)", () => {
    render(<Bar />);
    scrollPageTo(2000);
    vi.stubGlobal("innerWidth", 844);
    fireEvent(window, new Event("resize"));
    expect(banner()).not.toHaveAttribute("data-concealed");
  });

  /* La barre d'adresse du navigateur se replie quand on descend : la hauteur de la vue change, pas sa largeur. */
  it("ne devrait pas revenir quand seule la hauteur de la vue change", () => {
    render(<Bar />);
    scrollPageTo(2000);
    vi.stubGlobal("innerHeight", VIEW_HEIGHT + 56);
    fireEvent(window, new Event("resize"));
    expect(banner()).toHaveAttribute("data-concealed");
  });

  /*
   * Next garde la page quittée, masquée sous <Activity> : elle ne suit plus le défilement de la page affichée, et
   * revient affichée à son retour, quel que soit l'état où on l'avait laissée.
   */
  it("devrait cesser de suivre le défilement quand la page est masquée, et revenir affichée à son retour", () => {
    const { rerender } = render(
      <Activity mode="visible">
        <Bar />
      </Activity>,
    );
    scrollPageTo(2000);
    expect(banner()).toHaveAttribute("data-concealed");
    rerender(
      <Activity mode="hidden">
        <Bar />
      </Activity>,
    );
    const bar = document.querySelector("header");
    scrollPageTo(0);
    scrollPageTo(3000);
    expect(bar).not.toHaveAttribute("data-concealed");
    rerender(
      <Activity mode="visible">
        <Bar />
      </Activity>,
    );
    expect(banner()).not.toHaveAttribute("data-concealed");
    scrollPageTo(3000 + CONCEAL_AFTER_PX);
    expect(banner()).toHaveAttribute("data-concealed");
  });
});

/*
 * Ce que décide la feuille de style (globals.css, lue telle quelle) : où la barre glisse, ce qui la retient, et son
 * voile, là où les plaques passent dessous sans fondu.
 */
describe("feuille de style de la barre qui glisse", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  /** Mise en page compacte et écran bas : le complément exact de la requête des fondus. */
  const SLIDING = "(max-width: 640px), (max-width: 1100px) and (orientation: portrait), (max-height: 30rem)";

  /** Requête du bloc média qui contient `marker`, à `from` caractères au moins du début. */
  function queryAround(marker: string, from = 0): { query: string; at: number } {
    const at = css.indexOf(marker, from);
    expect(at, marker).toBeGreaterThan(0);
    const start = css.lastIndexOf("@media", at);
    return { query: css.slice(start + "@media".length, css.indexOf("{", start)).replace(/\s+/g, " ").trim(), at };
  }

  /** Déclarations de la règle `selector` (indentation de 2) dans le bloc média de requête `query`. */
  function ruleIn(query: string, selector: string): string {
    const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = new RegExp(`@media ${escaped(query)} \\{([\\s\\S]*?)\\n\\}`, "g");
    const rules = Array.from(css.matchAll(block), (match) => match[1])
      .map((body) => new RegExp(`\\n {2}${escaped(selector)} \\{([^}]*)\\}`).exec(body)?.[1])
      .filter((rule): rule is string => rule !== undefined);
    expect(rules, `${selector} dans ${query}`).not.toEqual([]);
    return rules.join("\n");
  }

  it("devrait la faire glisser seulement là où ni la règle ni les fondus ne bordent la page", () => {
    // La règle de la barre même : la carte fixe du téléphone (« Carte fixe ») suit aussi `.bar[data-concealed]`.
    const { query } = queryAround('.bar[data-concealed]:not(:has(:focus-visible, [aria-expanded="true"])) {');
    expect(query).toBe(SLIDING);
  });

  it("devrait la garder tant qu'elle a le focus clavier ou qu'un de ses menus est ouvert", () => {
    expect(ruleIn(SLIDING, '.bar[data-concealed]:not(:has(:focus-visible, [aria-expanded="true"]))')).toMatch(
      /transform: translateY\(-100%\);/,
    );
  });

  it("devrait la faire glisser en 0,25 s, et sans animation en mouvement réduit", () => {
    expect(ruleIn(SLIDING, ".bar[data-autohide]")).toMatch(/transform 0\.25s/);
    expect(ruleIn("(prefers-reduced-motion: reduce)", "*,\n  *::before,\n  *::after")).toMatch(/transition: none !important;/);
  });

  /*
   * Les plaques passent sous elle sans fondu (en 844 × 390, « 6e planète en partant du Soleil » se lisait sous la
   * marque) : nuit pleine jusqu'au bas des commandes, puis un fondu sur sa marge basse, dans chaque mise en page.
   */
  const SHORT_PHONE = "(max-width: 640px) and (max-height: 700px)";
  const LOW_SCREEN = "(max-height: 30rem) and (scripting: enabled)";
  /** Marge basse de la barre : celle de la règle de base, puis du téléphone court et de l'écran bas. */
  const margins: Readonly<Record<string, string | undefined>> = {
    [SLIDING]: /\n\.bar \{[^}]*\n {2}padding: ([\d.]+rem) /.exec(css)?.[1],
    [SHORT_PHONE]: /padding-block: ([\d.]+rem);/.exec(ruleIn(SHORT_PHONE, ".bar"))?.[1],
    [LOW_SCREEN]: /padding-block: ([\d.]+rem);/.exec(ruleIn(LOW_SCREEN, ".bar[data-autohide]"))?.[1],
  };

  it.each([SLIDING, SHORT_PHONE, LOW_SCREEN])(
    "devrait masquer ce qui passe sous elle jusqu'au bas des commandes, fondu sur sa marge basse (%s)",
    (query) => {
      const margin = margins[query] ?? "";
      expect(margin).toMatch(/^[\d.]+rem$/);
      const gradient = `background: linear-gradient(var(--nuit) calc(100% - ${margin}), rgba(6, 11, 24, 0));`;
      expect(ruleIn(query, ".bar[data-autohide]")).toContain(gradient);
    },
  );

  it("devrait poser, en couleurs forcées, un fond plein du système sous la barre qui glisse", () => {
    const at = css.indexOf("@media (forced-colors: active) {\n  @media " + SLIDING);
    expect(at).toBeGreaterThan(0);
    expect(css.slice(at, css.indexOf("\n}", at))).toMatch(/\.bar\[data-autohide\] \{\n {6}background: Canvas;/);
  });
});

