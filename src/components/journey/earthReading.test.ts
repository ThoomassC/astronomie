import { describe, expect, it } from "vitest";
import { earthReading } from "@/components/journey/earthReading";

/** Instant simulé : minuit UTC du jour donné. */
const at = (date: string) => Date.parse(`${date}T00:00:00Z`);

/*
 * Vénus le 15/08/2026 (plus grande élongation du soir) : éclairée à 48,8 %, 24,25″, 45,9° à l'est du Soleil.
 * Uranus le 21/11/2025 et Neptune le 23/09/2025 : à l'opposition (3,81″ et 2,36″).
 * Vénus le 23/03/2025 : conjonction inférieure, 8,4° du Soleil.
 */
describe("earthReading", () => {
  it("devrait dire la fraction éclairée, le diamètre et l'élongation sur la première ligne (Vénus, 15/08/2026)", () => {
    expect(earthReading("venus", at("2026-08-15")).lines[0]).toBe(
      "Éclairée à 49 % · 24″ de diamètre · 46° à l'est du Soleil",
    );
  });

  it("devrait dire quand regarder sur la seconde ligne, sans instrument pour une planète à l'œil nu (Vénus, 15/08/2026)", () => {
    expect(earthReading("venus", at("2026-08-15")).lines[1]).toBe("Le soir, à l'ouest après le coucher du Soleil");
  });

  it("devrait garder une décimale au diamètre sous 10″ (Uranus, 21/11/2025)", () => {
    expect(earthReading("uranus", at("2025-11-21")).lines[0]).toContain("· 3,8″ de diamètre ·");
  });

  it.each([
    ["uranus", "2025-11-21", "Toute la nuit, aux jumelles"],
    ["neptune", "2025-09-23", "Toute la nuit, au télescope"],
  ] as const)("devrait ajouter l'instrument nécessaire (%s le %s : « %s »)", (planet, date, line) => {
    expect(earthReading(planet, at(date)).lines[1]).toBe(line);
  });

  it("devrait dire qu'elle est trop près du Soleil, sans instrument (Vénus, 23/03/2025)", () => {
    expect(earthReading("venus", at("2025-03-23")).lines[1]).toBe("Trop près du Soleil pour être vue");
  });

  it("devrait écrire les unités en toutes lettres dans la phrase annoncée (secondes d'arc, degrés)", () => {
    const { spoken } = earthReading("venus", at("2026-08-15"));
    expect(spoken).toContain("secondes d'arc");
    expect(spoken).toContain("degrés");
  });

  it("ne devrait laisser ni ″ ni ° dans la phrase annoncée", () => {
    const { spoken } = earthReading("venus", at("2026-08-15"));
    expect(spoken).not.toContain("″");
    expect(spoken).not.toContain("°");
  });
});
