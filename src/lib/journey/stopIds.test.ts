import { describe, expect, it } from "vitest";
import { HERO_ID } from "@/components/journey/ids";
import { BEYOND } from "@/content/site";
import { STOPS } from "@/content/stops";
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

/** Identifiants lus aujourd'hui dans le contenu (src/content), qui disparaîtra en clôture avec ces quatre cas. */
describe("STOP_IDS, comme le contenu actuel", () => {
  it.each(STOPS.map((stop) => [stop.key, stop.id] as const))(
    "devrait reprendre l'ancre de l'escale %s (« %s »)",
    (key, id) => {
      expect(STOP_IDS[key]).toBe(id);
    },
  );

  it("devrait reprendre l'ancre de l'au-delà", () => {
    expect(STOP_IDS.beyond).toBe(BEYOND.id);
  });

  it.each([
    ["stars", "etoiles-voisines"],
    ["galaxy", "voie-lactee"],
  ] as const)("devrait garder l'ancre publiée de l'escale cosmique %s (« %s »)", (key, id) => {
    expect(STOP_IDS[key]).toBe(id);
  });

  it("devrait reprendre l'ancre de l'accueil", () => {
    expect(STOP_IDS.hero).toBe(HERO_ID);
  });
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
