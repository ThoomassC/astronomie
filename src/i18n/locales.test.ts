import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_S,
  LOCALE_NAMES,
  LOCALES,
  OG_LOCALE,
  isLocale,
} from "@/i18n/locales";

describe("LOCALES", () => {
  it("devrait proposer le français, l'anglais et l'espagnol, dans l'ordre des menus", () => {
    expect(LOCALES).toEqual(["fr", "en", "es"]);
  });

  it("devrait parler français quand rien ne dit la langue", () => {
    expect(DEFAULT_LOCALE).toBe("fr");
  });
});

describe("isLocale", () => {
  it.each(["fr", "en", "es"])("devrait reconnaître la langue du site « %s »", (value) => {
    expect(isLocale(value)).toBe(true);
  });

  it.each([
    { label: "majuscules", value: "FR" },
    { label: "balise régionale", value: "fr-FR" },
    { label: "langue absente du site", value: "de" },
    { label: "espace autour", value: " fr" },
    { label: "chaîne vide", value: "" },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "nombre", value: 1 },
  ])("devrait refuser une valeur qui n'est pas une langue du site ($label)", ({ value }) => {
    expect(isLocale(value)).toBe(false);
  });
});

describe("tables par langue", () => {
  it("devrait donner à Intl l'anglais britannique (formats métriques, jour-mois-année)", () => {
    expect(INTL_LOCALE).toEqual({ fr: "fr-FR", en: "en-GB", es: "es-ES" });
  });

  it("devrait nommer chaque langue dans sa propre langue (menu des langues)", () => {
    expect(LOCALE_NAMES).toEqual({ fr: "Français", en: "English", es: "Español" });
  });

  it("devrait donner la locale Open Graph de chaque langue", () => {
    expect(OG_LOCALE).toEqual({ fr: "fr_FR", en: "en_GB", es: "es_ES" });
  });
});

describe("cookie de langue", () => {
  it("devrait s'appeler « lang » (posé par le menu des langues, lu par le proxy)", () => {
    expect(LOCALE_COOKIE).toBe("lang");
  });

  it("devrait garder la préférence un an", () => {
    expect(LOCALE_COOKIE_MAX_AGE_S).toBe(365 * 24 * 60 * 60);
  });
});
