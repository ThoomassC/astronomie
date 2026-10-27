import { describe, expect, it } from "vitest";
import { spreadPositions } from "@/components/journey/railLayout";
import { RAIL_STOPS, railPercent, type StopKey } from "@/lib/journey/camera";

/** Tolérance d'arrondi flottant : un écart de 1e-9 px ne se voit pas. */
const EPSILON = 1e-9;
const MIN_GAP_PX = 26;

/** Écarts entre repères consécutifs. */
const gapsOf = (positions: readonly number[]) => positions.slice(1).map((p, i) => p - positions[i]);

/** Positions vraies des escales sur une règle de `height` px, comme dans DistanceRail. */
const railIdeal = (height: number) => RAIL_STOPS.map((stop) => (railPercent(stop.au) / 100) * height);

describe("spreadPositions", () => {
  it("devrait laisser les repères à leur place quand ils sont déjà assez espacés", () => {
    expect(spreadPositions([10, 50, 120, 300], MIN_GAP_PX, 400)).toEqual([10, 50, 120, 300]);
  });

  it("devrait ne pousser vers le bas que le repère trop proche de son prédécesseur", () => {
    expect(spreadPositions([10, 15, 100], MIN_GAP_PX, 400)).toEqual([10, 36, 100]);
  });

  it("devrait propager la poussée aux repères suivants quand ils deviennent trop proches", () => {
    expect(spreadPositions([10, 15, 40, 300], MIN_GAP_PX, 400)).toEqual([10, 36, 62, 300]);
  });

  it("devrait remonter les derniers repères quand la poussée les ferait sortir par le bas", () => {
    expect(spreadPositions([300, 380, 390, 395], MIN_GAP_PX, 400)).toEqual([300, 348, 374, 400]);
  });

  it("devrait réduire l'écart pour tout faire tenir quand la règle est trop courte", () => {
    // 4 intervalles sur 60 px : 15 px au plus, au lieu des 26 demandés.
    expect(spreadPositions([0, 1, 2, 3, 4], MIN_GAP_PX, 60)).toEqual([0, 15, 30, 45, 60]);
  });

  it("devrait ramener sur la règle un repère unique placé au-delà du bas", () => {
    expect(spreadPositions([120], MIN_GAP_PX, 100)).toEqual([100]);
  });

  it("devrait renvoyer une liste vide quand il n'y a aucun repère", () => {
    expect(spreadPositions([], MIN_GAP_PX, 400)).toEqual([]);
  });

  it("ne devrait pas modifier le tableau des positions vraies", () => {
    const ideal = [10, 15, 100];
    spreadPositions(ideal, MIN_GAP_PX, 400);
    expect(ideal).toEqual([10, 15, 100]);
  });

  describe("sur la règle réelle des onze escales", () => {
    it("devrait garder les positions vraies quand la règle est assez haute pour tout espacer", () => {
      const ideal = railIdeal(2000);
      expect(spreadPositions(ideal, MIN_GAP_PX, 2000)).toEqual(ideal);
    });

    it.each([[2000], [700], [420], [200], [97.3]])(
      "devrait conserver l'ordre et l'écart minimal atteignable sur une règle de %f px",
      (height) => {
        const placed = spreadPositions(railIdeal(height), MIN_GAP_PX, height);
        const reachableGap = Math.min(MIN_GAP_PX, height / (RAIL_STOPS.length - 1));
        expect(Math.min(...gapsOf(placed))).toBeGreaterThanOrEqual(reachableGap - EPSILON);
      },
    );

    it.each([[2000], [700], [420], [200], [97.3]])(
      "devrait garder tous les repères entre le haut et le bas d'une règle de %f px",
      (height) => {
        const placed = spreadPositions(railIdeal(height), MIN_GAP_PX, height);
        expect(Math.min(...placed)).toBeGreaterThanOrEqual(-EPSILON);
        expect(Math.max(...placed)).toBeLessThanOrEqual(height + EPSILON);
      },
    );

    it("devrait écarter la Terre de Vénus, sans toucher au Soleil, à Mercure ni à Vénus, sur une règle de 420 px", () => {
      const ideal = railIdeal(420);
      const placed = spreadPositions(ideal, MIN_GAP_PX, 420);
      const at = (key: StopKey) => RAIL_STOPS.findIndex((stop) => stop.key === key);
      expect(placed.slice(at("sun"), at("venus") + 1)).toEqual(ideal.slice(at("sun"), at("venus") + 1));
      expect(placed[at("earth")]).toBeCloseTo(ideal[at("venus")] + MIN_GAP_PX, 9);
    });
  });
});
