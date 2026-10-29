import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExploreSurface } from "@/components/journey/ExploreSurface";
import { exploreStore } from "@/lib/journey/explore";
import type { OrbitInput } from "@/lib/journey/orbit";

/** Hauteur de la vue : un glisser sur toute la hauteur fait un demi-tour. */
const VIEW_HEIGHT = 800;

beforeEach(() => {
  vi.stubGlobal("innerHeight", VIEW_HEIGHT);
  act(() => exploreStore.enter("saturn"));
});

afterEach(() => {
  act(() => exploreStore.exit());
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Surface de gestes plein écran. Masquée aux technologies d'assistance (le pavé et le clavier font la même chose),
 * elle n'a ni rôle ni nom : on la prend à la racine du rendu.
 */
function renderSurface(): HTMLElement {
  const { container } = render(<ExploreSurface />);
  const surface = container.firstElementChild;
  if (!(surface instanceof HTMLElement)) throw new Error("Surface de gestes absente");
  return surface;
}

type Pointer = { id: number; x: number; y: number; type?: "mouse" | "touch" };
const pointer = ({ id, x, y, type = "touch" }: Pointer, buttons: number) => ({
  pointerId: id,
  pointerType: type,
  isPrimary: id === 1,
  clientX: x,
  clientY: y,
  button: 0,
  buttons,
});
const press = (surface: HTMLElement, p: Pointer) => fireEvent.pointerDown(surface, pointer(p, 1));
const move = (surface: HTMLElement, p: Pointer) => fireEvent.pointerMove(surface, pointer(p, 1));
const release = (surface: HTMLElement, p: Pointer) => fireEvent.pointerUp(surface, pointer(p, 0));
/** Souris survolée, bouton relâché. */
const hover = (surface: HTMLElement, p: Pointer) => fireEvent.pointerMove(surface, pointer(p, 0));

/** Compare les gestes transmis au moteur, champ par champ. */
function expectInput(actual: OrbitInput | null, expected: OrbitInput) {
  expect(actual).not.toBeNull();
  expect(actual?.azim, "azim").toBeCloseTo(expected.azim, 9);
  expect(actual?.elev, "elev").toBeCloseTo(expected.elev, 9);
  expect(actual?.distanceLog, "distanceLog").toBeCloseTo(expected.distanceLog, 9);
  expect(actual?.recenter, "recenter").toBe(expected.recenter);
}

describe("ExploreSurface", () => {
  it("devrait faire tourner l'astre en suivant le doigt, même sans setPointerCapture (absent de jsdom)", () => {
    const surface = renderSurface();
    press(surface, { id: 1, x: 100, y: 100, type: "mouse" });
    move(surface, { id: 1, x: 200, y: 50, type: "mouse" });
    // dragToRotation(100, −50, 800) : un huitième de tour vers la droite, un seizième vers le haut.
    expectInput(exploreStore.takeInput(), { azim: Math.PI / 8, elev: -Math.PI / 16, distanceLog: 0, recenter: false });
  });

  it("devrait rapprocher quand deux doigts s'écartent, sans tourner quand leur milieu ne bouge pas", () => {
    const surface = renderSurface();
    press(surface, { id: 1, x: 100, y: 400 });
    press(surface, { id: 2, x: 200, y: 400 });
    move(surface, { id: 1, x: 50, y: 400 });
    move(surface, { id: 2, x: 250, y: 400 });
    // Écart 100 → 200 : −ln 2 ; milieu revenu à x = 150.
    expectInput(exploreStore.takeInput(), { azim: 0, elev: 0, distanceLog: -Math.log(2), recenter: false });
  });

  it("devrait reculer quand on tourne la molette vers soi", () => {
    const surface = renderSurface();
    fireEvent.wheel(surface, { deltaY: 100, deltaMode: 0 });
    expectInput(exploreStore.takeInput(), { azim: 0, elev: 0, distanceLog: 0.15, recenter: false });
  });

  it("devrait empêcher la page de défiler à la molette (écouteur non passif)", () => {
    const surface = renderSurface();
    expect(fireEvent.wheel(surface, { deltaY: 100, deltaMode: 0 })).toBe(false);
  });

  it("devrait oublier le pointeur relâché : la souris qui survole ensuite ne fait plus tourner", () => {
    const surface = renderSurface();
    press(surface, { id: 1, x: 100, y: 100, type: "mouse" });
    release(surface, { id: 1, x: 100, y: 100, type: "mouse" });
    hover(surface, { id: 1, x: 200, y: 50, type: "mouse" });
    expect(exploreStore.takeInput()).toBeNull();
  });
});
