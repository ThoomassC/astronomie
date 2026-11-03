import { describe, expect, it } from "vitest";
import { anchorOf } from "@/components/journey/anchors";

describe("anchorOf", () => {
  it.each([
    ["stars", "#etoiles-voisines"],
    ["galaxy", "#voie-lactee"],
  ] as const)("devrait renvoyer vers la section de l'escale cosmique %s (%s)", (key, href) => {
    expect(anchorOf(key)).toBe(href);
  });

  it.each([
    ["hero", "#accueil"],
    ["beyond", "#au-dela"],
    ["mars", "#mars"],
  ] as const)("devrait garder l'ancre de l'escale %s (%s)", (key, href) => {
    expect(anchorOf(key)).toBe(href);
  });
});
