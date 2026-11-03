import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

/*
 * Next sert le dossier public en `Cache-Control: public, max-age=0` : sans règle, chaque visite redemande les cartes
 * photographiques de la scène (plusieurs Mo en 2K).
 */
describe("next.config, en-têtes HTTP", () => {
  it("devrait garder les textures une semaine en cache, puis les revalider en arrière-plan pendant un jour", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules).toContainEqual({
      source: "/textures/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
    });
  });

  it("ne devrait jamais déclarer immuable un fichier au nom non versionné : une carte remplacée garde son nom", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const values = rules.flatMap((rule) => rule.headers.map((header) => header.value));
    expect(values.filter((value) => value.includes("immutable"))).toEqual([]);
  });
});

/*
 * L'accueil, prérendu, dessine son planétaire aux positions du jour où il a été construit : cette heure est fixée une
 * fois, quand Next charge la configuration au début du build, puis inscrite dans le code compilé (`env`).
 */
describe("next.config, heure du build", () => {
  it("devrait fixer BUILD_TIME, une date ISO en temps universel, à l'instant où la configuration est chargée", () => {
    const builtAt = nextConfig.env?.BUILD_TIME ?? "";
    expect(builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Math.abs(Date.parse(builtAt) - Date.now())).toBeLessThan(60_000);
  });
});
