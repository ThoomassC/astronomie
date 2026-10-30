import { describe, expect, it } from "vitest";
import { STOP_ORDER } from "@/lib/journey/camera";
import { STOP_IDS, stopAnchor } from "@/lib/journey/stopIds";

describe("STOP_IDS", () => {
  it("devrait donner une ancre à chacune des 17 escales du voyage, et à rien d'autre", () => {
    expect(Object.keys(STOP_IDS)).toHaveLength(17);
    expect(new Set(Object.keys(STOP_IDS))).toEqual(new Set(STOP_ORDER));
  });

  it("devrait garder les ancres publiques : les changer casserait les liens partagés (« /#saturne »)", () => {
    expect(STOP_IDS).toEqual({
      hero: "accueil",
      sun: "soleil",
      mercury: "mercure",
      venus: "venus",
      earth: "terre",
      mars: "mars",
      belt: "ceinture",
      jupiter: "jupiter",
      saturn: "saturne",
      uranus: "uranus",
      neptune: "neptune",
      beyond: "au-dela",
      stars: "etoiles-voisines",
      galaxy: "voie-lactee",
      localGroup: "groupe-local",
      universe: "univers-observable",
      multiverse: "multivers",
    });
  });

  it("devrait donner une ancre différente à chaque escale", () => {
    expect(new Set(Object.values(STOP_IDS)).size).toBe(STOP_ORDER.length);
  });

  it.each(Object.entries(STOP_IDS))(
    "devrait écrire l'ancre de %s en minuscules sans accent, mots liés par des tirets (« %s »)",
    (_key, id) => {
      expect(id).toMatch(/^[a-z-]+$/);
    },
  );
});

describe("stopAnchor", () => {
  it.each([
    ["saturn", "#saturne"],
    ["hero", "#accueil"],
    ["galaxy", "#voie-lactee"],
    ["multiverse", "#multivers"],
  ] as const)("devrait renvoyer vers la section de l'escale %s (« %s »)", (key, anchor) => {
    expect(stopAnchor(key)).toBe(anchor);
  });
});
