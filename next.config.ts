import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 404 des adresses qu'aucune route ne sert (src/app/global-not-found.tsx) : le layout racine est sous [lang].
    globalNotFound: true,
  },
};

export default nextConfig;
