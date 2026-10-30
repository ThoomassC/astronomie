import { describe, expect, it } from "vitest";
import { earthReading } from "@/components/journey/earthReading";
import { EXPLORE_STRINGS, type ReadingFigures } from "@/components/journey/explore.strings";

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

describe("earthReading en anglais et en espagnol", () => {
  it.each([
    ["en", "49% lit · 24″ across · 46° east of the Sun", "In the evening, in the west after sunset"],
    ["es", "Iluminado al 49 % · 24″ de diámetro · 46° al este del Sol", "Al anochecer, al oeste tras la puesta de sol"],
  ] as const)(
    "devrait écrire les deux lignes dans la langue de la page (%s, Vénus, 15/08/2026)",
    (locale, first, second) => {
      expect(earthReading("venus", at("2026-08-15"), locale).lines).toEqual([first, second]);
    },
  );

  it.each([
    ["en", "· 3.8″ across ·"],
    ["es", "· 3,8″ de diámetro ·"],
  ] as const)("devrait écrire le diamètre décimal selon la langue (%s, Uranus, 21/11/2025)", (locale, diameter) => {
    expect(earthReading("uranus", at("2025-11-21"), locale).lines[0]).toContain(diameter);
  });

  it.each([
    ["en", "uranus", "2025-11-21", "All night, with binoculars"],
    ["en", "neptune", "2025-09-23", "All night, with a telescope"],
    ["en", "venus", "2025-03-23", "Too close to the Sun to be seen"],
    ["es", "uranus", "2025-11-21", "Toda la noche, con prismáticos"],
    ["es", "neptune", "2025-09-23", "Toda la noche, con telescopio"],
    ["es", "venus", "2025-03-23", "Demasiado cerca del Sol para verse"],
  ] as const)(
    "devrait dire quand regarder, et avec quoi, dans la langue (%s, %s le %s)",
    (locale, planet, date, line) => {
      expect(earthReading(planet, at(date), locale).lines[1]).toBe(line);
    },
  );

  it.each([
    [
      "en",
      "Seen from Earth on this date: 49% lit, 24 arcseconds across, 46 degrees east of the Sun. In the evening, in the west after sunset.",
    ],
    [
      "es",
      "Visto desde la Tierra en esta fecha: iluminado al 49 %, 24 segundos de arco de diámetro, 46 grados al este del Sol. Al anochecer, al oeste tras la puesta de sol.",
    ],
  ] as const)("devrait annoncer la lecture, unités en toutes lettres et sans ″ ni ° (%s)", (locale, spoken) => {
    expect(earthReading("venus", at("2026-08-15"), locale).spoken).toBe(spoken);
  });

  /** Lecture fictive : petits nombres, pour l'accord des unités annoncées. */
  const SMALL: ReadingFigures = {
    percent: 1,
    diameter: 1.5,
    diameterDigits: 1,
    elongation: 1,
    side: "west",
    visibility: "too-close",
    instrument: null,
  };

  it.each([
    ["fr", "1,5 seconde d'arc de diamètre, 1 degré à l'ouest du Soleil"],
    ["en", "1.5 arcseconds across, 1 degree west of the Sun"],
    ["es", "1,5 segundos de arco de diámetro, 1 grado al oeste del Sol"],
  ] as const)("devrait accorder les unités annoncées selon les règles de la langue (%s)", (locale, phrase) => {
    expect(EXPLORE_STRINGS[locale].reading.spoken(SMALL)).toContain(phrase);
  });
});
