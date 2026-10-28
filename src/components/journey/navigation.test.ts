import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as NavigationModule from "@/components/journey/navigation";
import type { SectionRange } from "@/lib/journey/camera";

const RANGES: readonly SectionRange[] = [
  { key: "hero", arrive: 0, depart: 100 },
  { key: "sun", arrive: 804, depart: 1600 },
];
/** Le même découpage après qu'un module s'est rempli au-dessus du Soleil (+300 px). */
const GROWN: readonly SectionRange[] = [
  { key: "hero", arrive: 0, depart: 400 },
  { key: "sun", arrive: 1104, depart: 1900 },
];
/** Cible de défilement : 2 px après l'arrivée sur l'escale. */
const SUN_TARGET = 806;
const GROWN_SUN_TARGET = 1106;
/** Délai de repli quand `scrollend` n'arrive pas. */
const FALLBACK_MS = 1000;

/** Le module garde l'état du défilement en cours : il est rechargé pour chaque test. */
let goTo: typeof NavigationModule.goTo;
let setSectionRanges: typeof NavigationModule.setSectionRanges;

/** Frontière navigateur : défilement demandé à la fenêtre (jsdom ne défile pas). */
const scrollTo = vi.fn<(options: ScrollToOptions) => void>();
/** Position de défilement atteinte par la fenêtre. */
const scrolledTo = (y: number) => vi.stubGlobal("scrollY", y);

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  scrollTo.mockReset();
  vi.stubGlobal("scrollTo", scrollTo);
  scrolledTo(0);
  ({ goTo, setSectionRanges } = await import("@/components/journey/navigation"));
});

afterEach(() => {
  // Termine toute boucle de recalage encore armée : ses écouteurs sont retirés avant le test suivant.
  vi.runAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("goTo", () => {
  it("devrait renvoyer false et laisser faire l'ancre native tant que les sections ne sont pas mesurées", () => {
    expect(goTo("sun")).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each([
    ["hero", 2],
    ["sun", SUN_TARGET],
  ] as const)("devrait défiler en douceur jusqu'à 2 px après l'arrivée de l'escale (%s → %i px)", (key, top) => {
    setSectionRanges(RANGES);
    expect(goTo(key)).toBe(true);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top, behavior: "smooth" });
  });

  it("devrait placer le focus sur la section de l'escale", () => {
    const section = document.createElement("section");
    section.dataset.stop = "sun";
    section.tabIndex = -1;
    document.body.append(section);
    setSectionRanges(RANGES);
    goTo("sun");
    expect(document.activeElement).toBe(section);
  });

  describe("recalage", () => {
    it("devrait recaler sur la nouvelle cible à la fin du défilement quand la page a grandi pendant le trajet", () => {
      setSectionRanges(RANGES);
      goTo("sun");
      scrolledTo(SUN_TARGET);
      setSectionRanges(GROWN);
      window.dispatchEvent(new Event("scrollend"));
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: GROWN_SUN_TARGET, behavior: "smooth" });
    });

    it("devrait recaler aussi quand scrollend n'arrive jamais (délai de repli)", () => {
      setSectionRanges(RANGES);
      goTo("sun");
      scrolledTo(SUN_TARGET);
      setSectionRanges(GROWN);
      vi.advanceTimersByTime(FALLBACK_MS);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: GROWN_SUN_TARGET, behavior: "smooth" });
    });

    it("ne devrait pas corriger quand la position atteinte est à 2 px près de la cible", () => {
      setSectionRanges(RANGES);
      goTo("sun");
      scrolledTo(SUN_TARGET + 2);
      window.dispatchEvent(new Event("scrollend"));
      vi.advanceTimersByTime(FALLBACK_MS * 5);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("devrait corriger dès que l'écart dépasse 2 px", () => {
      setSectionRanges(RANGES);
      goTo("sun");
      scrolledTo(SUN_TARGET + 3);
      window.dispatchEvent(new Event("scrollend"));
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: SUN_TARGET, behavior: "smooth" });
    });

    it("devrait renoncer après trois corrections quand la cible n'est jamais atteinte", () => {
      setSectionRanges(RANGES);
      goTo("sun");
      vi.advanceTimersByTime(FALLBACK_MS * 10);
      expect(scrollTo).toHaveBeenCalledTimes(1 + 3);
    });

    it("devrait abandonner le recalage précédent quand on demande une autre escale", () => {
      setSectionRanges(RANGES);
      goTo("sun");
      goTo("hero");
      scrolledTo(2);
      vi.advanceTimersByTime(FALLBACK_MS * 5);
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 2, behavior: "smooth" });
    });
  });

  describe("la personne reprend la main", () => {
    it.each(["wheel", "touchstart", "keydown", "pointerdown"])(
      "devrait abandonner le recalage après un geste « %s »",
      (gesture) => {
        setSectionRanges(RANGES);
        goTo("sun");
        window.dispatchEvent(new Event(gesture));
        setSectionRanges(GROWN);
        window.dispatchEvent(new Event("scrollend"));
        vi.advanceTimersByTime(FALLBACK_MS * 5);
        expect(scrollTo).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("animations réduites", () => {
    it("devrait sauter directement à l'escale, sans recalage", () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
      setSectionRanges(RANGES);
      goTo("sun");
      setSectionRanges(GROWN);
      window.dispatchEvent(new Event("scrollend"));
      vi.advanceTimersByTime(FALLBACK_MS * 5);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: SUN_TARGET, behavior: "auto" });
    });
  });
});

describe("scrollInstantly", () => {
  it("devrait défiler sans douceur, même quand la page défile en douceur par défaut", async () => {
    const { scrollInstantly } = await import("@/components/journey/navigation");
    scrollInstantly(1200);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: "instant" });
  });

  it("ne devrait rien faire sauter quand la page est déjà à la position (défilement doux interrompu)", async () => {
    const { scrollInstantly, takeSkipSmoothing } = await import("@/components/journey/navigation");
    scrolledTo(1200);
    scrollInstantly(1200);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: "instant" });
    expect(takeSkipSmoothing()).toBe(false);
  });

  it("devrait demander au suivi du voyage de sauter une seule fois à la nouvelle position, sans lisser", async () => {
    const { scrollInstantly, takeSkipSmoothing } = await import("@/components/journey/navigation");
    expect(takeSkipSmoothing()).toBe(false);
    scrollInstantly(1200);
    expect(takeSkipSmoothing()).toBe(true);
    expect(takeSkipSmoothing()).toBe(false);
  });
});
