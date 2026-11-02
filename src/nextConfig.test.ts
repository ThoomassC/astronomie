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
