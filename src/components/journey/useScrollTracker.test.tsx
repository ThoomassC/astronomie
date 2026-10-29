import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSectionRanges, scrollInstantly, setSectionRanges, takeSkipSmoothing } from "@/components/journey/navigation";
import { useScrollTracker } from "@/components/journey/useScrollTracker";
import { createStopStore, type StopStore } from "@/lib/journey/store";
import type * as FrameLoopModule from "@/lib/sim/frameLoop";
import type { FrameCallback } from "@/lib/sim/frameLoop";

/** Boucle d'images pilotée à la main : le suivi y inscrit son relevé du défilement. */
const frame = vi.hoisted(() => {
  const loop: { callback: FrameCallback | null } = { callback: null };
  return loop;
});

vi.mock("@/lib/sim/frameLoop", async (importOriginal) => ({
  ...(await importOriginal<typeof FrameLoopModule>()),
  useFrame: (callback: FrameCallback) => {
    frame.callback = callback;
  },
}));

/** Une image de la boucle, `dt` secondes après la précédente. */
const runFrame = (dt = 1 / 60) => act(() => frame.callback?.(dt));

/** Escales d'un parcours quelconque : celui de la page Tailles, réduit à deux sections. */
type Key = "intro" | "sun";
const isKey = (value: string | undefined): value is Key => value === "intro" || value === "sun";

/**
 * Vue de 800 px. Introduction de 0 à 900 px, Soleil de 900 à 2 400 px : repos sur l'introduction jusqu'à 100 px,
 * vol de 100 à 804 px, repos sur le Soleil de 804 à 1 600 px.
 */
const VIEW_HEIGHT = 800;
const SECTIONS: readonly { key: string; top: number; height: number }[] = [
  { key: "intro", top: 0, height: 900 },
  { key: "sun", top: 900, height: 1500 },
];

let store: StopStore<Key>;
/** Défilement de la page. */
let scrollY = 0;
/** Plaque de chaque section, par clé. */
const plates = new Map<string, HTMLElement>();

/** Sections `[data-stop]` de la page, chacune avec sa plaque ; leurs boîtes suivent le défilement. */
function buildPage(sections: readonly { key: string; top: number; height: number }[] = SECTIONS): void {
  const main = document.createElement("main");
  for (const { key, top, height } of sections) {
    const section = document.createElement("section");
    section.dataset.stop = key;
    // Frontière navigateur : jsdom ne calcule aucune boîte.
    vi.spyOn(section, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, top - scrollY, 1024, height));
    const plate = document.createElement("article");
    plate.className = "plate";
    section.append(plate);
    main.append(section);
    plates.set(key, plate);
  }
  document.body.append(main);
}

/** Frontière navigateur : préférence de mouvement réduit, lue par useReducedMotion. */
function stubReducedMotion(reduced: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** La page défile jusqu'à `y` px. */
const scrollPageTo = (y: number) => {
  scrollY = y;
};

function Tracker({ trackedStore }: { trackedStore: StopStore<Key> }) {
  useScrollTracker(trackedStore, isKey);
  return null;
}

const rest = (key: string) => plates.get(key)?.style.getPropertyValue("--rest");

beforeEach(() => {
  store = createStopStore<Key>("intro");
  scrollY = 0;
  vi.stubGlobal("innerHeight", VIEW_HEIGHT);
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.stubGlobal("scrollTo", ({ top }: ScrollToOptions) => scrollPageTo(top ?? scrollY));
  // Frontière navigateur : jsdom n'a pas de ResizeObserver.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  frame.callback = null;
  setSectionRanges([]);
  takeSkipSmoothing();
  plates.clear();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useScrollTracker", () => {
  it("devrait mesurer les sections de la page au montage, avec leurs clés", () => {
    buildPage();
    render(<Tracker trackedStore={store} />);
    expect(getSectionRanges()).toEqual([
      { key: "intro", arrive: 0, depart: 100 },
      { key: "sun", arrive: expect.closeTo(804, 9), depart: 1600 },
    ]);
  });

  it("devrait poser le parcours sur l'escale où se trouve la page, et écrire l'avancement de son repos sur sa plaque", () => {
    buildPage();
    scrollPageTo(1000);
    render(<Tracker trackedStore={store} />);
    runFrame();
    expect(store.get()).toEqual({ from: "sun", to: "sun", t: 0, current: "sun" });
    // (1 000 − 804) / (1 600 − 804), au millième.
    expect(rest("sun")).toBe("0.246");
  });

  it("devrait publier le vol entre deux escales : plaque quittée pleine, plaque d'arrivée vide", () => {
    buildPage();
    scrollPageTo(452);
    render(<Tracker trackedStore={store} />);
    runFrame();
    expect(store.get()).toEqual({ from: "intro", to: "sun", t: 0.5, current: "sun" });
    expect(rest("intro")).toBe("1");
    expect(rest("sun")).toBe("0");
  });

  it("devrait lisser le défilement à 5 par seconde quand la page bouge", () => {
    buildPage();
    scrollPageTo(1000);
    render(<Tracker trackedStore={store} />);
    runFrame();
    scrollPageTo(1600);
    runFrame(0.1);
    // 1 000 + 600 × (1 − e^(−0,5)) = 1 236,08 : toujours au repos sur le Soleil, à 54,3 % de son repos.
    expect(store.get()).toEqual({ from: "sun", to: "sun", t: 0, current: "sun" });
    expect(rest("sun")).toBe("0.543");
  });

  it("devrait sauter à la position sans lisser quand le mouvement est réduit", () => {
    stubReducedMotion(true);
    buildPage();
    scrollPageTo(1000);
    render(<Tracker trackedStore={store} />);
    runFrame();
    scrollPageTo(1600);
    runFrame(0.1);
    expect(rest("sun")).toBe("1");
  });

  it("devrait sauter à la position sans lisser après un défilement immédiat (scrollInstantly)", () => {
    buildPage();
    scrollPageTo(1000);
    render(<Tracker trackedStore={store} />);
    runFrame();
    act(() => scrollInstantly(1600));
    runFrame(0.1);
    expect(rest("sun")).toBe("1");
  });

  it("ne devrait publier que lorsque le vol change : au repos, la scène n'a rien à redessiner", () => {
    buildPage();
    scrollPageTo(1000);
    render(<Tracker trackedStore={store} />);
    const update = vi.spyOn(store, "update");
    runFrame();
    runFrame();
    runFrame();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("ne devrait rien publier pour une section qui n'appartient pas au parcours", () => {
    buildPage([
      { key: "intro", top: 0, height: 900 },
      { key: "ailleurs", top: 900, height: 1500 },
    ]);
    scrollPageTo(1000);
    render(<Tracker trackedStore={store} />);
    runFrame();
    expect(store.get()).toEqual({ from: "intro", to: "intro", t: 0, current: "intro" });
  });

  it("devrait remesurer les sections 120 ms après un redimensionnement de la fenêtre", () => {
    vi.useFakeTimers();
    buildPage();
    render(<Tracker trackedStore={store} />);
    vi.stubGlobal("innerHeight", 600);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(119);
    });
    expect(getSectionRanges()[0].depart).toBe(100);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getSectionRanges()[0].depart).toBe(300);
  });

  it("devrait rendre le parcours à son état initial et oublier les plages au démontage de la page", () => {
    buildPage();
    scrollPageTo(1000);
    const { unmount } = render(<Tracker trackedStore={store} />);
    runFrame();
    const listener = vi.fn();
    store.subscribe(listener);
    unmount();
    expect(store.get()).toEqual({ from: "intro", to: "intro", t: 0, current: "intro" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSectionRanges()).toEqual([]);
  });
});
