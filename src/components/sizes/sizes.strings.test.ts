import { describe, expect, it } from "vitest";
import { SIZES_STRINGS } from "@/components/sizes/sizes.strings";
import { LOCALES } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";

/*
 * Chaînes des composants client de la page « Tailles », dans les trois langues. Les nombres sont ceux qu'écrit Intl :
 * espace fine insécable (U+202F) dès 4 chiffres en français, virgule en anglais, point dès 5 chiffres en espagnol.
 */

/** Étoile des données, par sa clé. */
function star(key: SizeStarKey): ComparedStar {
  const found = COMPARED_STARS.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Étoile absente des données : ${key}`);
  return found;
}

describe("SIZES_STRINGS.names", () => {
  it.each([
    ["fr", ["Proxima du Centaure", "Soleil", "Sirius A", "Pollux", "Arcturus", "Aldébaran", "Rigel", "Antarès A", "Bételgeuse", "VY Canis Majoris"]],
    ["en", ["Proxima Centauri", "Sun", "Sirius A", "Pollux", "Arcturus", "Aldebaran", "Rigel", "Antares A", "Betelgeuse", "VY Canis Majoris"]],
    ["es", ["Próxima Centauri", "Sol", "Sirio A", "Pólux", "Arturo", "Aldebarán", "Rigel", "Antares A", "Betelgeuse", "VY Canis Majoris"]],
  ] as const)("devrait donner les noms officiels des dix étoiles, dans l'ordre des données (%s)", (locale, names) => {
    expect(COMPARED_STARS.map(({ key }) => SIZES_STRINGS[locale].names[key])).toEqual(names);
  });

  it.each(LOCALES)("devrait nommer le Soleil comme le reste du site, étoile et repère de la scène (%s)", (locale) => {
    expect(SIZES_STRINGS[locale].names.sun).toBe(bodyName("sun", locale));
    expect(SIZES_STRINGS[locale].labels.sunMarker).toBe(bodyName("sun", locale));
  });
});

describe("SIZES_STRINGS.radius", () => {
  it.each([
    ["fr", 0.154, "0,154 R☉"],
    ["fr", 1, "1 R☉"],
    ["fr", 1420, "1\u202f420 R☉"],
    ["en", 0.154, "0.154 R☉"],
    ["en", 25.4, "25.4 R☉"],
    ["en", 1420, "1,420 R☉"],
    ["es", 8.97, "8,97 R☉"],
    ["es", 1420, "1420 R☉"],
  ] as const)("devrait écrire le rayon avec les décimales des données (%s, %f → %s)", (locale, radiusSolar, expected) => {
    expect(SIZES_STRINGS[locale].radius(radiusSolar)).toBe(expected);
  });
});

describe("SIZES_STRINGS.radiusRange", () => {
  it.each([
    ["fr", "de 640 à 1\u202f010 R☉ selon les études"],
    ["en", "640–1,010 R☉, depending on the study"],
    ["es", "entre 640 y 1010 R☉ según los estudios"],
  ] as const)("devrait écrire la fourchette publiée d'un rayon débattu, celle de Bételgeuse (%s)", (locale, expected) => {
    expect(SIZES_STRINGS[locale].radiusRange(640, 1010)).toBe(expected);
  });
});

describe("SIZES_STRINGS.comparison", () => {
  it.each([
    ["en", "betelgeuse", "In the Sun's place, its surface would reach beyond the orbit of Mars."],
    ["fr", "vy-canis-majoris", "À la place du Soleil, sa surface dépasserait l'orbite de Jupiter."],
    ["es", "antares-a", "En el lugar del Sol, su superficie llegaría más allá de la órbita de Marte."],
    ["fr", "sun", "Il faudrait environ 109 Terres côte à côte pour égaler son diamètre."],
    ["en", "proxima-centauri", "It would take about 17 Earths side by side to span its diameter."],
    ["es", "sun", "Harían falta unas 109 Tierras en fila para igualar su diámetro."],
    ["fr", "arcturus", "Son volume contiendrait environ 16\u202f000 Soleils."],
    ["en", "rigel", "Its volume could hold about 410,000 Suns."],
    ["es", "aldebaran", "Su volumen podría contener unos 92.000 soles."],
    ["es", "sirius-a", "Su volumen podría contener unos 5 soles."],
  ] as const)("devrait dire la comparaison de l'étoile en une phrase (%s, %s)", (locale, key, expected) => {
    expect(SIZES_STRINGS[locale].comparison(star(key))).toBe(expected);
  });

  it.each([
    ["fr", 300, "À la place du Soleil, sa surface dépasserait l'orbite de la Terre."],
    ["fr", 5000, "À la place du Soleil, sa surface dépasserait l'orbite d'Uranus."],
    ["en", 300, "In the Sun's place, its surface would reach beyond the orbit of Earth."],
    ["es", 300, "En el lugar del Sol, su superficie llegaría más allá de la órbita de la Tierra."],
  ] as const)(
    "devrait accorder le nom de toute planète atteinte, article et élision compris (%s, %f R☉)",
    (locale, radiusSolar, expected) => {
      expect(SIZES_STRINGS[locale].comparison({ ...star("betelgeuse"), radiusSolar })).toBe(expected);
    },
  );
});

describe("SIZES_STRINGS, libellés de l'interface", () => {
  it.each([
    ["fr", "Règle des tailles, de la plus petite à la plus grande étoile", "Étoile"],
    ["en", "Size scale, from the smallest to the largest star", "Star"],
    ["es", "Escala de tamaños, de la estrella más pequeña a la más grande", "Estrella"],
  ] as const)("devrait nommer la règle et l'étoile affichée selon le glossaire du site (%s)", (locale, railLabel, current) => {
    expect(SIZES_STRINGS[locale].railLabel).toBe(railLabel);
    expect(SIZES_STRINGS[locale].current).toBe(current);
  });

  it.each([
    ["fr", { nav: "Étoiles", home: "Étoiles", choose: "choisir une étoile", change: "changer d'étoile" }],
    ["en", { nav: "Stars", home: "Stars", choose: "choose a star", change: "change star" }],
    ["es", { nav: "Estrellas", home: "Estrellas", choose: "elegir una estrella", change: "cambiar de estrella" }],
  ] as const)("devrait nommer le menu des étoiles et ses compléments lus après le bouton (%s)", (locale, menu) => {
    expect(SIZES_STRINGS[locale].menu).toEqual(menu);
  });
});

describe("SIZES_STRINGS.scaleBar", () => {
  it.each([
    ["fr", 10, "10 Soleils côte à côte"],
    ["fr", 1000, "1\u202f000 Soleils côte à côte"],
    ["en", 2, "2 Suns side by side"],
    ["en", 1000, "1,000 Suns side by side"],
    ["es", 1000, "1000 soles en fila"],
    ["es", 2000, "2000 soles en fila"],
  ] as const)("devrait dire ce que mesure l'échelle graphique (%s, %i Soleils)", (locale, suns, expected) => {
    expect(SIZES_STRINGS[locale].scaleBar(suns)).toBe(expected);
  });
});

describe("SIZES_STRINGS.railLegend", () => {
  it.each([
    ["fr", "× 10 à chaque graduation"],
    ["en", "× 10 per mark"],
    ["es", "× 10 en cada marca"],
  ] as const)("devrait rappeler que chaque graduation de la règle multiplie le rayon par 10 (%s)", (locale, legend) => {
    expect(SIZES_STRINGS[locale].railLegend).toBe(legend);
  });
});

describe("SIZES_STRINGS.rank", () => {
  it.each([
    ["fr", 1, { value: "1", suffix: "re", superscript: true, total: " sur 10" }],
    ["fr", 9, { value: "9", suffix: "e", superscript: true, total: " sur 10" }],
    ["en", 1, { value: "1", suffix: "st", superscript: false, total: " of 10" }],
    ["en", 2, { value: "2", suffix: "nd", superscript: false, total: " of 10" }],
    ["en", 3, { value: "3", suffix: "rd", superscript: false, total: " of 10" }],
    ["en", 9, { value: "9", suffix: "th", superscript: false, total: " of 10" }],
    ["es", 9, { value: "9", suffix: ".ª", superscript: false, total: " de 10" }],
  ] as const)("devrait écrire le rang d'une étoile parmi les dix (%s, %i)", (locale, position, rank) => {
    expect(SIZES_STRINGS[locale].rank(position, 10)).toEqual(rank);
  });
});

describe("SIZES_STRINGS.lightYears", () => {
  it.each([
    ["fr", 548, "548 années-lumière"],
    ["fr", 4.2465, "4,2 années-lumière"],
    ["fr", 3820, "3 820 années-lumière"],
    ["en", 548, "548 light-years"],
    ["en", 4.2465, "4.2 light-years"],
    ["es", 548, "548 años luz"],
    ["es", 3820, "3820 años luz"],
  ] as const)("devrait écrire la distance en toutes lettres, une décimale sous 10 al (%s, %f)", (locale, distanceLy, expected) => {
    expect(SIZES_STRINGS[locale].lightYears(distanceLy)).toBe(expected);
  });
});
