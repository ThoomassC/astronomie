import { describe, expect, it } from "vitest";
import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { LOCALES } from "@/i18n/locales";
import { LOCAL_GROUP_KEYS } from "@/lib/astro/localGroup";
import { NEARBY_STARS } from "@/lib/astro/stars";

/*
 * Chaînes du ciel profond : noms officiels (données v2, § 6) des étoiles voisines et des galaxies, textes des
 * étiquettes de la scène, distances et tailles. Les nombres sont ceux qu'écrit Intl : espace fine insécable (U+202F)
 * dès 4 chiffres en français, virgule en anglais, point dès 5 chiffres en espagnol ; l'unité suit une espace ordinaire.
 */

describe("DEEP_SKY_STRINGS.starNames", () => {
  it.each(LOCALES)("devrait nommer chacune des étoiles de la carte (%s)", (locale) => {
    const names = DEEP_SKY_STRINGS[locale].starNames;
    expect(NEARBY_STARS.filter((star) => !names[star.key]?.trim()).map((star) => star.key)).toEqual([]);
  });

  it("devrait reprendre en français les noms des données, tels qu'affichés aujourd'hui", () => {
    expect(NEARBY_STARS.map((star) => DEEP_SKY_STRINGS.fr.starNames[star.key])).toEqual(NEARBY_STARS.map((star) => star.name));
  });

  it.each([
    ["en", "proxima-centauri", "Proxima Centauri"],
    ["es", "proxima-centauri", "Próxima Centauri"],
    ["en", "alpha-centauri", "Alpha Centauri A and B"],
    ["es", "alpha-centauri", "Alfa Centauri A y B"],
    ["en", "barnard", "Barnard's Star"],
    ["es", "barnard", "Estrella de Barnard"],
    ["es", "sirius", "Sirio"],
    ["es", "epsilon-eridani", "Épsilon Eridani"],
    ["en", "61-cygni", "61 Cygni"],
    ["en", "altair", "Altair"],
    ["es", "epsilon-indi", "Épsilon Indi"],
  ] as const)("devrait donner le nom officiel (%s, %s → %s)", (locale, key, name) => {
    expect(DEEP_SKY_STRINGS[locale].starNames[key]).toBe(name);
  });
});

describe("DEEP_SKY_STRINGS.galaxyNames", () => {
  it.each(LOCALES)("devrait nommer chacune des galaxies du Groupe local (%s)", (locale) => {
    const names = DEEP_SKY_STRINGS[locale].galaxyNames;
    expect(LOCAL_GROUP_KEYS.filter((key) => !names[key]?.trim())).toEqual([]);
  });

  it.each([
    ["fr", ["Voie lactée", "Galaxie d'Andromède", "Galaxie du Triangle", "Grand Nuage de Magellan", "Petit Nuage de Magellan"]],
    ["en", ["Milky Way", "Andromeda Galaxy", "Triangulum Galaxy", "Large Magellanic Cloud", "Small Magellanic Cloud"]],
    ["es", ["Vía Láctea", "Galaxia de Andrómeda", "Galaxia del Triángulo", "Gran Nube de Magallanes", "Pequeña Nube de Magallanes"]],
  ] as const)("devrait donner les noms officiels des cinq galaxies principales (%s)", (locale, names) => {
    const keys = ["milky-way", "andromeda", "triangulum", "large-magellanic-cloud", "small-magellanic-cloud"] as const;
    expect(keys.map((key) => DEEP_SKY_STRINGS[locale].galaxyNames[key])).toEqual(names);
  });

  it.each([
    ["fr", "Galaxie de Barnard", "Galaxie naine du Sagittaire"],
    ["en", "Barnard's Galaxy", "Sagittarius Dwarf Spheroidal Galaxy"],
    ["es", "Galaxia de Barnard", "Galaxia enana elíptica de Sagitario"],
  ] as const)("devrait nommer aussi les naines selon l'usage officiel (%s)", (locale, barnard, sagittarius) => {
    expect(DEEP_SKY_STRINGS[locale].galaxyNames["ngc-6822"]).toBe(barnard);
    expect(DEEP_SKY_STRINGS[locale].galaxyNames["sagittarius-dwarf"]).toBe(sagittarius);
  });
});

describe("DEEP_SKY_STRINGS.labels", () => {
  it.each([
    ["fr", "Vous êtes ici", "Centre de la Galaxie"],
    ["en", "You are here", "Galactic Centre"],
    ["es", "Estás aquí", "Centro de la Galaxia"],
  ] as const)("devrait marquer notre place et le centre galactique (%s)", (locale, here, center) => {
    expect(DEEP_SKY_STRINGS[locale].labels.here).toBe(here);
    expect(DEEP_SKY_STRINGS[locale].labels.center).toBe(center);
  });

  it.each([
    ["fr", "Toile cosmique", "Fond diffus cosmologique", "Notre univers observable"],
    ["en", "Cosmic web", "Cosmic microwave background", "Our observable Universe"],
    ["es", "Red cósmica", "Fondo cósmico de microondas", "Nuestro universo observable"],
  ] as const)("devrait nommer la toile, le fond diffus et notre univers (%s)", (locale, web, cmb, ours) => {
    const { labels } = DEEP_SKY_STRINGS[locale];
    expect([labels.web, labels.cmb, labels.ourUniverse]).toEqual([web, cmb, ours]);
  });

  it.each([
    ["fr", "hypothèse"],
    ["en", "hypothesis"],
    ["es", "hipótesis"],
  ] as const)("devrait présenter les autres univers comme une hypothèse, dans l'étiquette même (%s)", (locale, word) => {
    expect(DEEP_SKY_STRINGS[locale].labels.otherUniverses).toContain(word);
  });

  it("devrait poser les signes de la question espagnole", () => {
    expect(DEEP_SKY_STRINGS.es.labels.otherUniverses).toMatch(/^¿.+\?/);
  });
});

describe("DEEP_SKY_STRINGS : distances et tailles", () => {
  it.each([
    ["fr", "5 al"],
    ["en", "5 ly"],
    ["es", "5 al"],
  ] as const)("devrait nommer un cercle de distance de 5 al (%s → %s)", (locale, expected) => {
    expect(DEEP_SKY_STRINGS[locale].ring(5)).toBe(expected);
  });

  it.each([
    ["fr", " · 4,2 al"],
    ["en", " · 4.2 ly"],
    ["es", " · 4,2 al"],
  ] as const)("devrait écrire la distance d'une étoile après son nom, au dixième (%s → « %s »)", (locale, expected) => {
    expect(DEEP_SKY_STRINGS[locale].starDistance(4.2465)).toBe(expected);
  });

  it.each([
    ["fr", 0.027, "27\u202f000 al"],
    ["en", 0.027, "27,000 ly"],
    ["es", 0.027, "27.000 al"],
    ["fr", 0.1617, "160\u202f000 al"],
    ["es", 0.2037, "200.000 al"],
    ["fr", 1.5, "1,5 million d'al"],
    ["fr", 2.48, "2,5 millions d'al"],
    ["en", 2.48, "2.5 million ly"],
    ["es", 2.48, "2,5 millones de al"],
    ["fr", 3, "3 millions d'al"],
    ["en", 2.74, "2.7 million ly"],
  ] as const)("devrait écrire la distance d'une galaxie à deux chiffres significatifs (%s, %f Mal → %s)", (locale, distanceMly, expected) => {
    expect(DEEP_SKY_STRINGS[locale].galaxyDistance(distanceMly)).toBe(expected);
  });

  it.each([
    ["fr", 152_000, "152\u202f000 al"],
    ["en", 152_000, "152,000 ly"],
    ["es", 152_000, "152.000 al"],
    ["fr", 5000, "5\u202f000 al"],
    ["en", 5000, "5,000 ly"],
    ["es", 5000, "5000 al"],
  ] as const)("devrait écrire le diamètre d'une galaxie tel que publié (%s, %i → %s)", (locale, diameterLy, expected) => {
    expect(DEEP_SKY_STRINGS[locale].galaxySize(diameterLy)).toBe(expected);
  });
});
