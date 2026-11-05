import { describe, expect, it } from "vitest";
import { getSizesContent } from "@/content/sizes/content";
import { LOCALES, type Locale } from "@/i18n/locales";
import { COMPARED_BLACK_HOLE_BY_KEY, COMPARED_BLACK_HOLES, M87_STELLAR_DYNAMICS_MASS_SOLAR } from "@/lib/astro/blackHoles";
import { SHADOW_RADIUS_RS, schwarzschildRadiusKm } from "@/lib/astro/schwarzschild";
import { COMPARED_STAR_BY_KEY, COMPARED_STARS } from "@/lib/astro/starSizes";
import { formatNumber } from "@/lib/format";
import { comparedRadiusSolar } from "@/lib/sizes/objects";

/*
 * Textes serveur de la page « Tailles » : complets dans les trois langues, traduits (pas recopiés du français), et
 * nombres écrits comme Intl les écrit dans chaque langue.
 */

/** Chaînes d'un contenu avec leur chemin (« stars.rigel.caveat ») : les échecs disent où regarder. */
function leaves(value: unknown, path = ""): (readonly [string, string])[] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
}

const FRENCH = new Map(leaves(getSizesContent("fr")));

describe("getSizesContent", () => {
  it.each([
    ["fr", "Rayon de l'horizon (sans rotation)"],
    ["en", "Event horizon radius (without rotation)"],
    ["es", "Radio del horizonte (sin rotación)"],
  ] as const)("devrait dire, dans la fiche de chaque trou noir, que l'horizon est celui d'un trou noir sans rotation (%s)", (locale, label) => {
    expect(getSizesContent(locale).facts.horizon).toBe(label);
  });

  it.each(LOCALES)("devrait donner un texte à chacune des dix étoiles du comparateur (%s)", (locale) => {
    expect(Object.keys(getSizesContent(locale).stars).sort()).toEqual(COMPARED_STARS.map((star) => star.key).sort());
  });

  // « TODO » en capitales seulement : l'espagnol dit « sobre todo ».
  it.each(LOCALES)("ne devrait laisser aucun texte vide ni à faire (%s)", (locale) => {
    const unfinished = leaves(getSizesContent(locale)).filter(([, text]) => text.trim() === "" || /\bTODO\b/.test(text));
    expect(unfinished).toEqual([]);
  });

  it.each(LOCALES)("devrait donner un texte à chacun des quatre trous noirs (%s)", (locale) => {
    expect(Object.keys(getSizesContent(locale).blackHoles).sort()).toEqual(COMPARED_BLACK_HOLES.map((hole) => hole.key).sort());
  });

  it.each(LOCALES)("devrait mettre en garde sur les seules masses débattues, celles qui ont une fourchette publiée (%s)", (locale) => {
    const cautioned = Object.entries(getSizesContent(locale).blackHoles).filter(([, text]) => text.caveat).map(([key]) => key);
    expect(cautioned.sort()).toEqual(COMPARED_BLACK_HOLES.filter((hole) => hole.massRange).map((hole) => hole.key).sort());
  });

  /* Jamais de mot qui donnerait l'image pour observée : la ligne de ce que la vue simplifie le dit d'abord. */
  it.each([
    ["fr", "Rendu calculé\u00a0: "],
    ["en", "Computed rendering: "],
    ["es", "Representación calculada: "],
  ] as const)("devrait dire d'abord que chaque trou noir est un rendu calculé (%s)", (locale, start) => {
    for (const text of Object.values(getSizesContent(locale).blackHoles)) expect(text.simplification.startsWith(start)).toBe(true);
  });

  it.each(LOCALES)("devrait dire en fausses couleurs les anneaux de Sagittarius A* et de M87*, vus en ondes radio (%s)", (locale) => {
    const falseColours = { fr: /fausses couleurs/, en: /false colours/, es: /falso color/ }[locale];
    const { blackHoles } = getSizesContent(locale);
    expect(blackHoles["sagittarius-a-star"].simplification).toMatch(falseColours);
    expect(blackHoles["m87-star"].simplification).toMatch(falseColours);
  });

  it.each(LOCALES)("devrait mettre en garde sur les seuls rayons débattus, ceux qui ont une fourchette publiée (%s)", (locale) => {
    const cautioned = Object.entries(getSizesContent(locale).stars).filter(([, text]) => text.caveat).map(([key]) => key);
    expect(cautioned.sort()).toEqual(COMPARED_STARS.filter((star) => star.radiusRange).map((star) => star.key).sort());
  });

  it.each(["en", "es"] as const)("devrait traduire chaque texte au lieu de recopier le français (%s)", (locale) => {
    const copied = leaves(getSizesContent(locale)).filter(([path, text]) => FRENCH.get(path) === text);
    expect(copied).toEqual([]);
  });

  it.each([
    ["fr", "Commencer par le plus petit", "Revenir au plus petit"],
    ["en", "Start with the smallest", "Back to the smallest"],
    ["es", "Empezar por el más pequeño", "Volver al más pequeño"],
  ] as const)("devrait proposer de commencer par le plus petit astre, et d'y revenir (%s : %s)", (locale, start, restart) => {
    expect(getSizesContent(locale).intro.start).toBe(start);
    expect(getSizesContent(locale).plate.restart).toBe(restart);
  });

  it.each([
    ["fr", "Étoiles et trous noirs, côte à côte."],
    ["en", "Stars and black holes, side by side."],
    ["es", "Estrellas y agujeros negros, en fila."],
  ] as const)("devrait titrer la page des étoiles et des trous noirs (%s : %s)", (locale, title) => {
    expect(getSizesContent(locale).intro.title).toBe(title);
  });

  it.each([
    ["fr", "Lire la fiche"],
    ["en", "Read the fact sheet"],
    ["es", "Leer la ficha"],
  ] as const)("devrait nommer le bouton de la fiche selon le glossaire du site (%s : %s)", (locale, story) => {
    expect(getSizesContent(locale).plate.story).toBe(story);
  });
});

/*
 * Rigel : à diamètre angulaire fixe (θ_LD = 2,606 mas, Baines et al. 2018), le rayon est proportionnel à la distance.
 * Si elle était à 1 170 al et non à 860, ses 74 R☉ deviendraient 74 × 1 170 / 860 ≈ 100,7 R☉.
 */
describe("mise en garde sur la distance de Rigel", () => {
  const rigel = COMPARED_STARS.find((star) => star.key === "rigel");
  const ALTERNATIVE_DISTANCE_LY = 1170;

  it("devrait tirer le rayon à 1 170 al du rayon et de la distance retenus : environ 101 R☉", () => {
    if (!rigel) throw new Error("Rigel absente du comparateur");
    expect(Math.round((rigel.radiusSolar * ALTERNATIVE_DISTANCE_LY) / rigel.distanceLy)).toBe(101);
  });

  it.each([
    ["fr", "environ 101 R☉"],
    ["en", "about 101 R☉"],
    ["es", "unos 101 R☉"],
  ] as const)("devrait l'écrire dans la mise en garde de la plaque (%s : « %s »)", (locale, radius) => {
    const caveat = getSizesContent(locale).stars.rigel.caveat ?? "";
    expect(caveat).toContain(radius);
    expect(caveat).not.toContain("106");
  });
});

/*
 * Typographie : les nombres des textes reprennent la sortie d'Intl (formatNumber) de leur langue. Les années (2012,
 * 2025) restent sans séparateur, d'où l'absence de règle sur les nombres de quatre chiffres en français et en anglais.
 */
describe("nombres des textes de la page « Tailles »", () => {
  it.each([
    ["fr", "milliers séparés par une espace ordinaire ou insécable (Intl : espace fine U+202F)", /\d[ \u00a0]\d{3}(?!\d)/],
    ["fr", "point décimal (Intl : virgule)", /\d\.\d/],
    ["en", "milliers séparés par une espace (Intl : virgule)", /\d[ \u00a0\u202f]\d{3}(?!\d)/],
    ["en", "virgule décimale (Intl : point)", /\d,\d{1,2}(?!\d)/],
    ["es", "milliers séparés par une espace (Intl : point)", /\d[ \u00a0\u202f]\d{3}(?!\d)/],
    ["es", "point dans un nombre de quatre chiffres (Intl ne groupe qu'à partir de cinq)", /(?<![\d.])\d\.\d{3}(?![\d.])/],
    ["es", "point décimal (Intl : virgule)", /\d\.\d{1,2}(?!\d)/],
    ["fr", "nombre de cinq chiffres ou plus sans séparateur", /\d{5,}/],
    ["en", "nombre de cinq chiffres ou plus sans séparateur", /\d{5,}/],
    ["es", "nombre de cinq chiffres ou plus sans séparateur", /\d{5,}/],
  ] as const)("devrait écrire les nombres comme Intl, sans %s (%s)", (locale, _rule, pattern) => {
    expect(leaves(getSizesContent(locale)).filter(([, text]) => pattern.test(text))).toEqual([]);
  });
});

/*
 * Chaque nombre écrit dans les textes des trous noirs vient des données, ou est recalculé ici depuis elles : une masse
 * corrigée dans blackHoles.ts fait échouer le texte qui la recopierait.
 */
describe("nombres des textes des trous noirs", () => {
  const n = (value: number, locale: Locale, digits = 0) => formatNumber(value, digits, locale);
  const text = (locale: Locale, key: keyof ReturnType<typeof getSizesContent>["blackHoles"]) => {
    const { hook, lede, caveat = "" } = getSizesContent(locale).blackHoles[key];
    return `${hook} ${lede} ${caveat}`;
  };

  it("devrait tirer des données l'ombre, 2,6 fois l'horizon, que l'introduction annonce", () => {
    expect(n(SHADOW_RADIUS_RS, "fr", 1)).toBe("2,6");
    for (const locale of LOCALES) expect(getSizesContent(locale).intro.text).toContain(n(SHADOW_RADIUS_RS, locale, 1));
  });

  /*
   * Cygnus X-1 : 21,2 M☉ en 2021, de 12,7 à 17,8 M☉ selon l'étude de 2025 ; fourchette retenue, de 12,7 à 23,4 M☉. Les
   * textes disent ce qui reste vrai sur toute la fourchette, et que l'horizon est celui d'un trou noir sans rotation
   * (un trou noir qui tourne a un horizon plus petit).
   */
  describe("Cygnus X-1, sur toute la fourchette publiée de sa masse", () => {
    const [low, high] = COMPARED_BLACK_HOLE_BY_KEY["cygnus-x-1"].massRange ?? [Number.NaN, Number.NaN];
    const horizonKm = (mass: number) => 2 * schwarzschildRadiusKm(mass);
    const SAYINGS = {
      fr: { mass: "Environ 15 à 20 fois", horizon: "horizon (sans rotation)", hundred: "une centaine de kilomètres" },
      en: { mass: "About 15 to 20 times", horizon: "horizon (without rotation)", hundred: "about a hundred kilometres" },
      es: { mass: "Entre 15 y 20 veces", horizon: "horizonte (sin rotación)", hundred: "un centenar de kilómetros" },
    } as const;

    it("devrait donner une masse de 15 à 20 fois le Soleil, dans la fourchette publiée", () => {
      expect(low).toBeLessThanOrEqual(15);
      expect(high).toBeGreaterThanOrEqual(20);
      for (const locale of LOCALES) expect(getSizesContent(locale).blackHoles["cygnus-x-1"].hook).toContain(SAYINGS[locale].mass);
    });

    it("devrait donner à son ombre quelques centaines de kilomètres de diamètre", () => {
      expect(SHADOW_RADIUS_RS * horizonKm(low)).toBeGreaterThan(100);
      expect(SHADOW_RADIUS_RS * horizonKm(high)).toBeLessThan(1000);
    });

    it("devrait donner à son horizon, sans rotation, une centaine de kilomètres de diamètre, la Terre environ cent fois plus large", () => {
      expect(horizonKm(low)).toBeGreaterThan(50);
      expect(horizonKm(high)).toBeLessThan(150);
      expect(12_742 / horizonKm(high)).toBeGreaterThan(80);
      expect(12_742 / horizonKm(low)).toBeLessThan(200);
      for (const locale of LOCALES) {
        expect(text(locale, "cygnus-x-1")).toContain(SAYINGS[locale].horizon);
        expect(text(locale, "cygnus-x-1")).toContain(SAYINGS[locale].hundred);
        expect(text(locale, "cygnus-x-1")).not.toMatch(/125 km|vingt|twenty|veinte/);
      }
    });
  });

  it("devrait comparer l'ombre de Sagittarius A* à Aldébaran, à peine plus petite, et écrire sa masse et sa distance", () => {
    const hole = COMPARED_BLACK_HOLE_BY_KEY["sagittarius-a-star"];
    const ratio = comparedRadiusSolar(hole) / COMPARED_STAR_BY_KEY.aldebaran.radiusSolar;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(1.1);
    for (const locale of LOCALES) {
      expect(text(locale, "sagittarius-a-star")).toContain(n(hole.massSolar / 1e6, locale, 1));
      expect(text(locale, "sagittarius-a-star")).toContain(n(hole.distanceLy, locale));
    }
  });

  it("devrait écrire que M87* pèse environ 1 500 fois Sagittarius A*, et les deux masses de sa mise en garde", () => {
    const hole = COMPARED_BLACK_HOLE_BY_KEY["m87-star"];
    const ratio = hole.massSolar / COMPARED_BLACK_HOLE_BY_KEY["sagittarius-a-star"].massSolar;
    expect(Math.round(ratio / 100) * 100).toBe(1500);
    // La mise en garde oppose la masse de l'anneau à celle de la dynamique stellaire, gardée à part (pas le bas de la fourchette).
    const dynamics = Math.round(M87_STELLAR_DYNAMICS_MASS_SOLAR / 1e8) * 1e8;
    for (const locale of LOCALES) {
      expect(text(locale, "m87-star")).toContain(n(1500, locale));
      // En espagnol, les milliards se disent en milliers de millions : « 6500 millones ».
      const scale = locale === "es" ? 1e6 : 1e9;
      const digits = locale === "es" ? 0 : 1;
      expect(text(locale, "m87-star")).toContain(n(hole.massSolar / scale, locale, digits));
      expect(text(locale, "m87-star")).toContain(n(dynamics / scale, locale, digits));
    }
  });

  it("devrait écrire la masse du Fer à cheval cosmique, plus de 8 000 fois Sagittarius A*, et le trajet de sa lumière", () => {
    const hole = COMPARED_BLACK_HOLE_BY_KEY["cosmic-horseshoe"];
    expect(hole.massSolar / COMPARED_BLACK_HOLE_BY_KEY["sagittarius-a-star"].massSolar).toBeGreaterThan(8000);
    expect(Math.round((hole.lightTravelYears ?? 0) / 1e9)).toBe(5);
    // Le nombre et son mot : « 5 » seul se trouverait partout.
    const BILLIONS = { fr: "milliards", en: "billion", es: "millones" } as const;
    for (const locale of LOCALES) {
      const scale = locale === "es" ? 1e6 : 1e9;
      const billions = (value: number) => `${n(value / scale, locale)} ${BILLIONS[locale]}`;
      expect(text(locale, "cosmic-horseshoe")).toContain(billions(hole.massSolar));
      expect(text(locale, "cosmic-horseshoe")).toContain(n(8000, locale));
      expect(text(locale, "cosmic-horseshoe")).toContain(billions(5e9));
    }
  });
});
