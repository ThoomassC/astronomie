import { describe, expect, it } from "vitest";
import { SIZES_STRINGS } from "@/components/sizes/sizes.strings";
import { LOCALES } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { COMPARED_BLACK_HOLE_BY_KEY } from "@/lib/astro/blackHoles";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";

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

  it.each([
    ["fr", ["Cygnus X-1", "Sagittarius A*", "M87*", "Fer à cheval cosmique"]],
    ["en", ["Cygnus X-1", "Sagittarius A*", "M87*", "Cosmic Horseshoe"]],
    ["es", ["Cygnus X-1", "Sagitario A*", "M87*", "Herradura Cósmica"]],
  ] as const)("devrait nommer les quatre trous noirs (%s)", (locale, names) => {
    const keys = ["cygnus-x-1", "sagittarius-a-star", "m87-star", "cosmic-horseshoe"] as const;
    expect(keys.map((key) => SIZES_STRINGS[locale].names[key])).toEqual(names);
  });

  it.each(LOCALES)("devrait nommer les quatorze astres, sans doublon (%s)", (locale) => {
    const names = COMPARED_OBJECTS.map(({ key }) => SIZES_STRINGS[locale].names[key]);
    expect(new Set(names).size).toBe(14);
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

describe("SIZES_STRINGS.comparison d'un trou noir, par son ombre", () => {
  it.each([
    ["fr", "cygnus-x-1", "Son ombre ne mesure qu'environ 330 km de diamètre."],
    ["en", "cygnus-x-1", "Its shadow is only about 330 km across."],
    ["es", "cygnus-x-1", "Su sombra mide solo unos 330 km de diámetro."],
    ["fr", "sagittarius-a-star", "À la place du Soleil, son ombre tiendrait dans l'orbite de Mercure."],
    ["en", "sagittarius-a-star", "In the Sun's place, its shadow would fit inside the orbit of Mercury."],
    ["es", "sagittarius-a-star", "En el lugar del Sol, su sombra cabría dentro de la órbita de Mercurio."],
    ["fr", "m87-star", "À la place du Soleil, son ombre engloutirait tout le système solaire, jusqu'à 11 fois l'orbite de Neptune."],
    ["en", "m87-star", "In the Sun's place, its shadow would swallow the whole Solar System, out to 11 times Neptune's orbit."],
    ["es", "cosmic-horseshoe", "En el lugar del Sol, su sombra engulliría todo el sistema solar, hasta 61 veces la órbita de Neptuno."],
  ] as const)("devrait comparer l'ombre en une phrase (%s, %s)", (locale, key, expected) => {
    expect(SIZES_STRINGS[locale].comparison(COMPARED_BLACK_HOLE_BY_KEY[key])).toBe(expected);
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
    ["fr", "Règle des tailles, du plus petit au plus grand astre", { star: "Étoile", "black-hole": "Trou noir" }],
    ["en", "Size scale, from the smallest to the largest object", { star: "Star", "black-hole": "Black hole" }],
    ["es", "Escala de tamaños, del astro más pequeño al más grande", { star: "Estrella", "black-hole": "Agujero negro" }],
  ] as const)("devrait nommer la règle et l'astre affiché, selon sa sorte (%s)", (locale, railLabel, current) => {
    expect(SIZES_STRINGS[locale].railLabel).toBe(railLabel);
    expect(SIZES_STRINGS[locale].current).toEqual(current);
  });

  it.each([
    ["fr", { nav: "Étoiles et trous noirs", home: "Astres", choose: "choisir un astre", change: "changer d'astre" }],
    ["en", { nav: "Stars and black holes", home: "Objects", choose: "choose an object", change: "change object" }],
    ["es", { nav: "Estrellas y agujeros negros", home: "Astros", choose: "elegir un astro", change: "cambiar de astro" }],
  ] as const)("devrait nommer le menu des astres et ses compléments lus après le bouton (%s)", (locale, menu) => {
    expect(SIZES_STRINGS[locale].menu).toEqual(menu);
  });
});

/*
 * Taille comparée, comme la règle, le menu et les étiquettes l'écrivent : rayon d'une étoile avec les décimales des
 * données ; ombre d'un trou noir aux chiffres significatifs de sa masse, en kilomètres sous 0,01 R☉.
 */
describe("SIZES_STRINGS.size", () => {
  it.each([
    ["fr", "betelgeuse", "764 R☉"],
    ["fr", "cygnus-x-1", "163 km"],
    ["fr", "sagittarius-a-star", "47,4 R☉"],
    ["en", "sagittarius-a-star", "47.4 R☉"],
    ["fr", "m87-star", "72\u202f000 R☉"],
    ["en", "m87-star", "72,000 R☉"],
    ["es", "m87-star", "72.000 R☉"],
    ["fr", "cosmic-horseshoe", "400\u202f000 R☉"],
  ] as const)("devrait écrire la taille comparée (%s, %s : %s)", (locale, key, expected) => {
    const object = COMPARED_OBJECTS.find((candidate) => candidate.key === key);
    if (!object) throw new Error(`Astre absent : ${key}`);
    expect(SIZES_STRINGS[locale].size(object)).toBe(expected);
  });
});

describe("SIZES_STRINGS.solarRadii", () => {
  it.each([
    ["fr", 18.24, 3, "18,2 R☉"],
    ["fr", 8.999e-5, 3, "0,0000900 R☉"],
    ["en", 27_593, 2, "28,000 R☉"],
    ["es", 152_822, 2, "150.000 R☉"],
  ] as const)("devrait écrire un rayon en R☉ à ses chiffres significatifs (%s, %f, %i)", (locale, radiusSolar, digits, expected) => {
    expect(SIZES_STRINGS[locale].solarRadii(radiusSolar, digits)).toBe(expected);
  });
});

describe("SIZES_STRINGS.kilometres", () => {
  it.each([
    ["fr", 62.61, 3, "62,6 km"],
    ["fr", 1.269e7, 3, "12,7 millions de km"],
    ["en", 1.92e10, 3, "19.2 billion km"],
    ["es", 1.07e11, 3, "107 mil millones de km"],
  ] as const)("devrait écrire une longueur en km, en mots au-delà du million (%s, %f)", (locale, km, digits, expected) => {
    expect(SIZES_STRINGS[locale].kilometres(km, digits)).toBe(expected);
  });
});

describe("SIZES_STRINGS.mass et massRange", () => {
  it.each([
    ["fr", 21.2, 3, "21,2 masses solaires"],
    ["fr", 4.297e6, 3, "4,3 millions de masses solaires"],
    ["en", 6.5e9, 2, "6.5 billion solar masses"],
    ["es", 3.6e10, 2, "36 mil millones de masas solares"],
  ] as const)("devrait écrire la masse en mots (%s, %f)", (locale, massSolar, digits, expected) => {
    expect(SIZES_STRINGS[locale].mass(massSolar, digits)).toBe(expected);
  });

  it.each([
    ["fr", 12.7, 23.4, 3, "de 12,7 à 23,4 masses solaires selon les études"],
    ["en", 5.12e9, 7.2e9, 2, "5.1–7.2 billion solar masses, depending on the study"],
    ["es", 2.6e10, 5e10, 2, "entre 26 y 50 mil millones de masas solares según los estudios"],
  ] as const)("devrait écrire la fourchette publiée d'une masse débattue (%s)", (locale, low, high, digits, expected) => {
    expect(SIZES_STRINGS[locale].massRange(low, high, digits)).toBe(expected);
  });
});

describe("SIZES_STRINGS.scaleBar", () => {
  it.each([
    ["fr", 10, "10 Soleils côte à côte"],
    ["fr", 1000, "1 000 Soleils côte à côte"],
    ["fr", 500_000, "500 000 Soleils côte à côte"],
    ["fr", 1_000_000, "1 million de Soleils côte à côte"],
    ["en", 2, "2 Suns side by side"],
    ["en", 1000, "1,000 Suns side by side"],
    ["en", 1_000_000, "1 million Suns side by side"],
    ["es", 1000, "1000 soles en fila"],
    ["es", 2000, "2000 soles en fila"],
    ["es", 1_000_000, "1 millón de soles en fila"],
  ] as const)("devrait dire ce que mesure l'échelle graphique en Soleils (%s, %i)", (locale, count, expected) => {
    expect(SIZES_STRINGS[locale].scaleBar({ unit: "suns", count, lengthPx: 100 })).toBe(expected);
  });

  it.each([
    ["fr", 500, "500 km"],
    ["fr", 100_000, "100 000 km"],
    ["fr", 2_000_000, "2 millions de km"],
    ["en", 100_000, "100,000 km"],
    ["en", 2_000_000, "2 million km"],
    ["es", 5000, "5000 km"],
    ["es", 100_000, "100.000 km"],
    ["es", 2_000_000, "2 millones de km"],
  ] as const)("devrait dire ce que mesure l'échelle graphique en kilomètres, en mots au-delà du million (%s, %i km)", (locale, count, expected) => {
    expect(SIZES_STRINGS[locale].scaleBar({ unit: "km", count, lengthPx: 100 })).toBe(expected);
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
    ["fr", 1, "feminine", { value: "1", suffix: "re", superscript: true, total: " sur 14" }],
    ["fr", 1, "masculine", { value: "1", suffix: "er", superscript: true, total: " sur 14" }],
    ["fr", 9, "feminine", { value: "9", suffix: "e", superscript: true, total: " sur 14" }],
    ["fr", 13, "masculine", { value: "13", suffix: "e", superscript: true, total: " sur 14" }],
    ["en", 1, "masculine", { value: "1", suffix: "st", superscript: false, total: " of 14" }],
    ["en", 2, "feminine", { value: "2", suffix: "nd", superscript: false, total: " of 14" }],
    ["en", 3, "feminine", { value: "3", suffix: "rd", superscript: false, total: " of 14" }],
    ["en", 13, "masculine", { value: "13", suffix: "th", superscript: false, total: " of 14" }],
    ["es", 9, "feminine", { value: "9", suffix: ".ª", superscript: false, total: " de 14" }],
    ["es", 13, "masculine", { value: "13", suffix: ".º", superscript: false, total: " de 14" }],
  ] as const)("devrait écrire le rang d'un astre parmi les quatorze, accordé à sa sorte (%s, %i, %s)", (locale, position, gender, rank) => {
    expect(SIZES_STRINGS[locale].rank(position, 14, gender)).toEqual(rank);
  });
});

describe("SIZES_STRINGS.lightYears", () => {
  it.each([
    ["fr", 548, "548 années-lumière"],
    ["fr", 4.2465, "4,2 années-lumière"],
    ["fr", 3820, "3\u202f820 années-lumière"],
    ["fr", 55e6, "55 millions d'années-lumière"],
    ["fr", 5.7e9, "5,7 milliards d'années-lumière"],
    ["en", 548, "548 light-years"],
    ["en", 4.2465, "4.2 light-years"],
    ["en", 55e6, "55 million light-years"],
    ["es", 548, "548 años luz"],
    ["es", 3820, "3820 años luz"],
    ["es", 5.7e9, "5,7 mil millones de años luz"],
  ] as const)("devrait écrire la distance en toutes lettres, une décimale sous 10 al, en mots au-delà du million (%s, %f)", (locale, distanceLy, expected) => {
    expect(SIZES_STRINGS[locale].lightYears(distanceLy)).toBe(expected);
  });
});

describe("SIZES_STRINGS.lightTravel", () => {
  it.each([
    ["fr", "lumière partie il y a 4,8 milliards d'années"],
    ["en", "light that set out 4.8 billion years ago"],
    ["es", "luz que partió hace 4,8 mil millones de años"],
  ] as const)("devrait dire depuis quand voyage la lumière d'un astre lointain (%s)", (locale, expected) => {
    expect(SIZES_STRINGS[locale].lightTravel(4.8e9)).toBe(expected);
  });
});

