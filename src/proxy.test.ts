// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { config, proxy } from "@/proxy";
import nextConfig from "../next.config";

/** Origine des requêtes simulées : la redirection doit rester sur ce site. */
const ORIGIN = "https://astro.example";

/** Requête GET vers `path` (chemin et requête), avec les en-têtes donnés. */
function request(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, { headers });
}

/**
 * Vrai si le proxy s'exécute pour ce chemin : le matcher est compilé comme au build (path-to-regexp, avec la
 * configuration du projet) et appliqué comme par le serveur. La documentation de Next 16 nomme cet utilitaire
 * `unstable_doesProxyMatch`, mais la version installée (16.4.3) ne l'exporte que sous son ancien nom.
 */
function runsOn(url: string): boolean {
  return unstable_doesMiddlewareMatch({ config, nextConfig, url });
}

describe("proxy", () => {
  it("devrait rediriger la racine vers la langue de l'en-tête Accept-Language, en 307", () => {
    const response = proxy(request("/", { "accept-language": "en-GB,en;q=0.9,fr;q=0.8" }));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(`${ORIGIN}/en`);
  });

  it("devrait préférer la langue du cookie à celle de l'en-tête", () => {
    const response = proxy(request("/", { cookie: "lang=es", "accept-language": "en" }));
    expect(response?.headers.get("location")).toBe(`${ORIGIN}/es`);
  });

  it("devrait garder le chemin et la requête derrière la langue, en français quand rien n'en indique une", () => {
    const response = proxy(request("/voyage?x=1"));
    expect(response?.headers.get("location")).toBe(`${ORIGIN}/fr/voyage?x=1`);
  });

  it("devrait dire aux caches que la redirection dépend de la langue de l'en-tête et du cookie (Vary)", () => {
    const vary = proxy(request("/"))?.headers.get("vary") ?? "";
    expect(vary.split(",").map((name) => name.trim())).toEqual(
      expect.arrayContaining(["Accept-Language", "Cookie"]),
    );
  });

  it("ne devrait jamais poser de cookie : seul le menu des langues le fait, sur action de la personne", () => {
    expect(proxy(request("/tailles", { cookie: "lang=en" }))?.headers.get("set-cookie")).toBeNull();
  });

  it("devrait laisser passer un chemin qui commence par une langue, sans réponse propre", () => {
    expect(proxy(request("/fr/voyage", { cookie: "lang=es", "accept-language": "en" }))).toBeUndefined();
  });
});

describe("matcher du proxy", () => {
  it.each(["/", "/voyage", "/tailles", "/a-propos", "/franc", "/de/voyage"])(
    "devrait faire passer « %s » par le proxy : aucune langue en tête",
    (path) => {
      expect(runsOn(path)).toBe(true);
    },
  );

  it.each(["/icon.svg", "/_next/static/chunks/a.js", "/textures/1k/earth.jpg"])(
    "ne devrait pas faire passer « %s » par le proxy : fichier ou ressource interne",
    (path) => {
      expect(runsOn(path)).toBe(false);
    },
  );

  it.each(LOCALES)(
    "ne devrait pas faire passer les pages en « %s » par le proxy : elles restent statiques",
    (locale) => {
      expect(runsOn(`/${locale}`)).toBe(false);
      expect(runsOn(`/${locale}/voyage`)).toBe(false);
    },
  );
});
