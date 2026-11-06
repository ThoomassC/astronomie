import { describe, expect, it } from "vitest";
import { freeBand } from "@/lib/journey/screen";

describe("freeBand", () => {
  it("devrait aller du bas de la carte fixée en haut au haut de ce qui borde le bas, 8 px d'air de chaque côté", () => {
    expect(freeBand(812, 154, 730)).toEqual({ top: 162 / 812, bottom: 722 / 812 });
  });

  it("devrait renoncer quand la bande tombe sous 8 % de l'écran (texte très agrandi)", () => {
    expect(freeBand(800, 610, 680)).toBeNull();
  });
});

/*
 * Voie lactée en 375 × 553 (téléphone court, barres du navigateur ouvertes), distances réelles actives. Avant la carte
 * fixe, la plaque repliée (rang, nom encadré des flèches, rangée des titres-boutons, « Revenir au Soleil ») était collée
 * au-dessus du dock et la note d'échelle sous la barre : il restait à l'astre 17 % de l'écran. La carte repliée (rang et
 * nom seuls) se fixe sous la barre, la note passe au-dessus du dock. Hauteurs tirées de globals.css (téléphone court,
 * ≤ 700 px), en px.
 */
describe("bande libre d'un téléphone court, carte fixée en haut, note d'échelle visible", () => {
  const VIEW = 553;
  /** Bas de la barre au repos : commandes de 44 px, 0,6 rem au-dessus et au-dessous. */
  const BAR = 44 + 2 * 9.6;
  /** Carte repliée : marges (2 × 8), rang (13 × 1,3 et 2 px), rangée du nom (44), filets (2). */
  const CARD = 16 + 16.9 + 2 + 44 + 2;
  /** Dock : sa réserve en bas de l'écran. */
  const DOCK_CLEAR = 82;
  /** Note repliée, au-dessus du dock à 0,5 rem : deux lignes de 0,875 rem (interligne 1,6), marges et filet. */
  const NOTE = 2 * 14 * 1.6 + 2 * 4 + 2;
  const NOTE_TOP = VIEW - DOCK_CLEAR - 8 - NOTE;
  /** Ancienne bande : sous la note d'échelle placée sous la barre, au-dessus de la plaque collée en bas. */
  const OLD_BAND = 553 - 82 - (13.6 + 15.2 + 20.8 + 1.6 + 44 + 8 + 44 + 22.4 + 50 + 2) - 8 - (84 + NOTE + 8);

  it("devrait faire une carte repliée d'environ 80 px", () => {
    expect(CARD).toBeGreaterThan(75);
    expect(CARD).toBeLessThan(85);
  });

  it("devrait laisser à l'astre plus de 40 % de l'écran, au lieu de 17 %", () => {
    const band = freeBand(VIEW, BAR + CARD, NOTE_TOP);
    expect(band).not.toBeNull();
    const height = ((band?.bottom ?? 0) - (band?.top ?? 0)) * VIEW;
    expect(OLD_BAND / VIEW).toBeLessThan(0.18);
    expect(height / VIEW).toBeGreaterThan(0.4);
  });
});
