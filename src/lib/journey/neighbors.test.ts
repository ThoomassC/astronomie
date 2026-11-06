import { describe, expect, it } from "vitest";
import { RAIL_STOPS, type StopKey } from "@/lib/journey/camera";
import { stopNeighbors } from "@/lib/journey/neighbors";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";

/*
 * Escales voisines, pour aller d'escale en escale sur téléphone : celles de la règle et du menu, dans l'ordre de la
 * page, sans l'introduction, qui n'en est pas une.
 */

/** Escales du voyage, du Soleil au multivers (celles de la règle). */
const VOYAGE: readonly StopKey[] = RAIL_STOPS.map(({ key }) => key);
/** Astres de Tailles, du plus petit au plus grand. */
const SIZES = COMPARED_OBJECTS.map(({ key }) => key);

describe("stopNeighbors", () => {
  it("devrait donner la précédente et la suivante d'une escale du milieu", () => {
    expect(stopNeighbors(VOYAGE, "earth")).toEqual({ previous: "venus", next: "mars" });
  });

  it("devrait passer par la ceinture d'astéroïdes, escale de la règle et du menu", () => {
    expect(stopNeighbors(VOYAGE, "mars")).toEqual({ previous: "earth", next: "belt" });
    expect(stopNeighbors(VOYAGE, "jupiter")).toEqual({ previous: "belt", next: "saturn" });
  });

  it("ne devrait pas proposer de précédente à la première escale : la vue d'ensemble n'en est pas une", () => {
    expect(stopNeighbors(VOYAGE, "sun")).toEqual({ previous: null, next: "mercury" });
  });

  it("ne devrait pas proposer de suivante à la dernière escale, dont la plaque ramène au Soleil", () => {
    expect(stopNeighbors(VOYAGE, "multiverse")).toEqual({ previous: "universe", next: null });
  });

  it("ne devrait proposer aucune voisine à l'introduction, hors du parcours", () => {
    expect(stopNeighbors(VOYAGE, "hero")).toEqual({ previous: null, next: null });
  });

  it("devrait suivre les astres de Tailles du plus petit au plus grand, sans rien après le dernier", () => {
    expect(stopNeighbors(SIZES, "cygnus-x-1")).toEqual({ previous: null, next: "proxima-centauri" });
    expect(stopNeighbors(SIZES, "sun")).toEqual({ previous: "proxima-centauri", next: "sirius-a" });
    expect(stopNeighbors(SIZES, "cosmic-horseshoe")).toEqual({ previous: "m87-star", next: null });
  });
});
