import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 404 des adresses qu'aucune route ne sert (src/app/global-not-found.tsx) : le layout racine est sous [lang].
    globalNotFound: true,
  },
  /**
   * Heure du build, fixée une fois au chargement de la configuration et inscrite par Next dans le code compilé
   * (`process.env.BUILD_TIME`) : l'accueil, prérendu, y date son planétaire sans lire l'horloge au rendu (Cache
   * Components le refuse ; `connection()` ou `use cache` rendraient la page dynamique ou régénérée).
   */
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  /**
   * Cartes photographiques de la scène (public/textures) : une semaine en cache, puis revalidées en arrière-plan
   * pendant un jour, au lieu du `max-age=0` que Next donne au dossier public. Leurs noms ne sont pas versionnés (une
   * carte remplacée garde son nom) : pas d'`immutable` d'un an.
   */
  headers() {
    return [
      {
        source: "/textures/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
