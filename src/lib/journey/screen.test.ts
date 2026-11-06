import { describe, expect, it } from "vitest";
import { freeBand } from "@/lib/journey/screen";

describe("freeBand", () => {
  it("devrait aller du bas des bandeaux du haut au haut de la plaque repliée, 8 px d'air de chaque côté", () => {
    expect(freeBand(800, 80, { height: 280, bottom: 82 })).toEqual({ top: 88 / 800, bottom: 430 / 800 });
  });

  it("devrait renoncer quand la bande tombe sous 8 % de l'écran (texte très agrandi)", () => {
    expect(freeBand(800, 80, { height: 560, bottom: 82 })).toBeNull();
  });
});

/*
 * Voie lactée en 375 × 553 (téléphone court, barres du navigateur ouvertes), distances réelles actives : la note
 * d'échelle borde la bande par le haut, la plaque repliée par le bas. Hauteurs tirées de globals.css (téléphone court,
 * ≤ 700 px), en px. Les escales voisines (« ← Étoiles voisines », « Groupe local → ») ne tiennent pas côte à côte à
 * 375 px : posées en rangée à part, sous la plaque, elles en prennent une ou deux de plus.
 */
describe("bande libre d'un téléphone court, note d'échelle visible", () => {
  const VIEW = 553;
  /** Bas de la note repliée : 5,25 rem sous le haut, deux lignes de 0,875 rem (interligne 1,6), marges et filet. */
  const NOTE_BOTTOM = 84 + (2 * 14 * 1.6 + 2 * 4 + 2);
  /** Réserve du dock, sous la plaque. */
  const DOCK_CLEAR = 82;
  /**
   * Plaque repliée, sans escales voisines : marges (13,6 + 15,2), rang (20,8 + 1,6), nom (36 + 5,6), accroche sur deux
   * lignes (2 × 22,1 + 9,6), « Lire la fiche » (44), « Revenir au Soleil » (22,4 + 50), filets (2).
   */
  const PLATE = 13.6 + 15.2 + 20.8 + 1.6 + 36 + 5.6 + 2 * 22.1 + 9.6 + 44 + 22.4 + 50 + 2;
  /** Rangée à part : 0,75 rem au-dessus, puis une ligne de 44 px, ou deux (0,5 rem entre elles). */
  const ONE_ROW = 12 + 44;
  const TWO_ROWS = 12 + 44 + 8 + 44;

  it("devrait perdre sa bande avec les escales voisines sur deux lignes : l'astre passerait derrière la plaque", () => {
    expect(freeBand(VIEW, NOTE_BOTTOM, { height: PLATE + TWO_ROWS, bottom: DOCK_CLEAR })).toBeNull();
  });

  it("devrait la perdre aussi avec une seule ligne à part : il n'y a pas la place d'une rangée de plus", () => {
    expect(freeBand(VIEW, NOTE_BOTTOM, { height: PLATE + ONE_ROW, bottom: DOCK_CLEAR })).toBeNull();
  });

  it("devrait la garder quand les escales voisines n'ajoutent aucune rangée (dans celle des titres-boutons)", () => {
    const band = freeBand(VIEW, NOTE_BOTTOM, { height: PLATE, bottom: DOCK_CLEAR });
    expect(band).not.toBeNull();
    expect(((band?.bottom ?? 0) - (band?.top ?? 0)) * VIEW).toBeGreaterThanOrEqual(0.08 * VIEW);
  });
});

/*
 * La même plaque repliée, depuis qu'elle a perdu son accroche et ses titres-boutons à texte : rang, nom encadré des
 * flèches des escales voisines (rangée de 44 px, plus haute que le nom de 36 px, puis 0,5 rem), une rangée de boutons
 * ronds de 44 px, « Revenir au Soleil ». L'astre gagne toute la hauteur de l'accroche.
 */
describe("bande libre d'un téléphone court, plaque compacte sans accroche", () => {
  const VIEW = 553;
  const NOTE_BOTTOM = 84 + (2 * 14 * 1.6 + 2 * 4 + 2);
  const DOCK_CLEAR = 82;
  /** Ancienne plaque : accroche sur deux lignes, flèches au bout du premier titre-bouton. */
  const WITH_HOOK = 13.6 + 15.2 + 20.8 + 1.6 + 36 + 5.6 + 2 * 22.1 + 9.6 + 44 + 22.4 + 50 + 2;
  /** Marges, rang, rangée du nom (44 + 8), rangée des boutons (44), « Revenir au Soleil », filets. */
  const COMPACT = 13.6 + 15.2 + 20.8 + 1.6 + 44 + 8 + 44 + 22.4 + 50 + 2;

  const bandHeight = (plate: number) => {
    const band = freeBand(VIEW, NOTE_BOTTOM, { height: plate, bottom: DOCK_CLEAR });
    return band ? (band.bottom - band.top) * VIEW : 0;
  };

  it("devrait agrandir la bande libre de toute la hauteur gagnée sur la plaque", () => {
    expect(bandHeight(COMPACT) - bandHeight(WITH_HOOK)).toBeCloseTo(WITH_HOOK - COMPACT, 6);
    expect(WITH_HOOK - COMPACT).toBeGreaterThan(40);
  });

  it("devrait laisser à l'astre plus de 15 % de l'écran, au lieu de 9 %", () => {
    expect(bandHeight(WITH_HOOK) / VIEW).toBeLessThan(0.1);
    expect(bandHeight(COMPACT) / VIEW).toBeGreaterThan(0.15);
  });
});
