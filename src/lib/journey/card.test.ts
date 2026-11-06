import { describe, expect, it } from "vitest";
import { CARD_EDGE, cardView, showsCard, showsSkeleton } from "@/lib/journey/card";
import type { StopFlight } from "@/lib/journey/store";

/** Escales d'un parcours : l'accueil et la ceinture n'ont pas de plaque, donc pas de carte. */
type Key = "hero" | "sun" | "mars" | "belt" | "jupiter";
const hasCard = (key: Key) => key !== "hero" && key !== "belt";

/** Vol de `from` à `to`, à l'avancement `t` ; l'escale affichée change à mi-vol, comme dans le store. */
function flight(from: Key, to: Key, t: number): StopFlight<Key> {
  return { from, to, t, current: t < 0.5 ? from : to };
}

describe("cardView", () => {
  it("devrait montrer la carte de l'escale au repos", () => {
    expect(cardView(flight("mars", "mars", 0), hasCard)).toEqual({ kind: "card", key: "mars" });
  });

  it("ne devrait montrer aucune carte au repos sur l'accueil, ou sur une escale sans plaque", () => {
    expect(cardView(flight("hero", "hero", 0), hasCard)).toEqual({ kind: "none" });
    expect(cardView(flight("belt", "belt", 0), hasCard)).toEqual({ kind: "none" });
  });

  it.each([0.1, 0.49, 0.5, 0.9])("devrait montrer le squelette en plein vol entre deux cartes (t = %f)", (t) => {
    expect(cardView(flight("sun", "mars", t), hasCard)).toEqual({ kind: "skeleton" });
  });

  /*
   * Un frôlement du bout de la plage de repos (quelques pixels de vol) ne fait pas clignoter le squelette : la carte
   * quittée reste jusqu'à 4 % du vol, celle d'arrivée paraît dès 96 %, sans attendre le repos.
   */
  it("devrait garder la carte quittée au tout début du vol, et montrer celle d'arrivée à sa toute fin", () => {
    expect(cardView(flight("sun", "mars", CARD_EDGE), hasCard)).toEqual({ kind: "card", key: "sun" });
    expect(cardView(flight("sun", "mars", 0.01), hasCard)).toEqual({ kind: "card", key: "sun" });
    expect(cardView(flight("sun", "mars", 1 - CARD_EDGE), hasCard)).toEqual({ kind: "card", key: "mars" });
    expect(cardView(flight("sun", "mars", 1), hasCard)).toEqual({ kind: "card", key: "mars" });
  });

  it("devrait ne rien montrer tant que l'escale affichée n'a pas de carte (départ de l'accueil, arrivée à la ceinture)", () => {
    expect(cardView(flight("hero", "sun", 0.3), hasCard)).toEqual({ kind: "none" });
    expect(cardView(flight("hero", "sun", 0.6), hasCard)).toEqual({ kind: "skeleton" });
    expect(cardView(flight("mars", "belt", 0.3), hasCard)).toEqual({ kind: "skeleton" });
    expect(cardView(flight("mars", "belt", 0.7), hasCard)).toEqual({ kind: "none" });
    expect(cardView(flight("belt", "jupiter", 0.99), hasCard)).toEqual({ kind: "card", key: "jupiter" });
  });
});

describe("showsCard et showsSkeleton", () => {
  it("devrait désigner une seule carte courante, et aucune pendant le squelette", () => {
    const rest = flight("mars", "mars", 0);
    expect(showsCard(rest, hasCard, "mars")).toBe(true);
    expect(showsCard(rest, hasCard, "sun")).toBe(false);
    expect(showsSkeleton(rest, hasCard)).toBe(false);
    const flying = flight("sun", "mars", 0.5);
    expect(showsCard(flying, hasCard, "sun")).toBe(false);
    expect(showsCard(flying, hasCard, "mars")).toBe(false);
    expect(showsSkeleton(flying, hasCard)).toBe(true);
  });
});
