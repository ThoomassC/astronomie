import { describe, expect, it } from "vitest";
import { routeRequest } from "@/i18n/routing";

describe("routeRequest", () => {
  it("devrait rediriger la racine vers la langue de l'en-tête, en 307", () => {
    expect(routeRequest({ pathname: "/", search: "" }, { acceptLanguage: "en" })).toEqual({
      kind: "redirect",
      location: "/en",
      status: 307,
    });
  });

  it("devrait garder le chemin et la requête derrière la langue, en français par défaut", () => {
    expect(routeRequest({ pathname: "/voyage", search: "?x=1" }, {})).toEqual({
      kind: "redirect",
      location: "/fr/voyage?x=1",
      status: 307,
    });
  });

  it("devrait préférer la langue du cookie à celle de l'en-tête", () => {
    expect(routeRequest({ pathname: "/tailles", search: "" }, { cookie: "es", acceptLanguage: "en" })).toEqual({
      kind: "redirect",
      location: "/es/tailles",
      status: 307,
    });
  });

  it.each(["/fr/voyage", "/en", "/es/", "/fr/inconnu"])(
    "devrait laisser passer un chemin qui commence par une langue (« %s »)",
    (pathname) => {
      expect(routeRequest({ pathname, search: "" }, { cookie: "es", acceptLanguage: "en" })).toEqual({ kind: "next" });
    },
  );

  it("devrait préfixer un chemin à langue inconnue, sans la remplacer", () => {
    expect(routeRequest({ pathname: "/de/voyage", search: "" }, { cookie: "es" })).toEqual({
      kind: "redirect",
      location: "/es/de/voyage",
      status: 307,
    });
  });

  it("devrait distinguer une langue d'un segment qui commence comme elle (« /franc »)", () => {
    expect(routeRequest({ pathname: "/franc", search: "" }, {})).toEqual({
      kind: "redirect",
      location: "/fr/franc",
      status: 307,
    });
  });

  it("devrait toujours viser un chemin du site, jamais une autre origine (« //exemple.org »)", () => {
    // Préfixé par la langue, « //exemple.org » devient un chemin et non une URL relative au protocole.
    expect(routeRequest({ pathname: "//exemple.org", search: "" }, {})).toEqual({
      kind: "redirect",
      location: "/fr//exemple.org",
      status: 307,
    });
  });
});
