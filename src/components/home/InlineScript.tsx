"use client";

/**
 * Script en ligne que le navigateur exécute en analysant la page, avant la première peinture : rendu par le serveur en
 * `text/javascript`. Quand React le rend lui-même (navigation sans rechargement), il passe en `text/plain` : React
 * n'exécute jamais un script qu'il insère, et un script inerte ne lui fait pas lever son avertissement de
 * développement. L'écart de type entre serveur et client est voulu (`suppressHydrationWarning`) : procédé du guide Next
 * « Preventing flash before hydration ».
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
