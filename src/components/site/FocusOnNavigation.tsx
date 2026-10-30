"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { MAIN_ID } from "@/components/journey/ids";
import { isShown, shownElements } from "@/lib/site/shown";

/** Le focus est sur un élément de la page affichée : une page l'y a posé, il y reste. */
function focusIsOnShownPage(): boolean {
  const active = document.activeElement;
  return active !== null && active !== document.body && active.isConnected && isShown(active);
}

/** Suit l'adresse ; après chaque navigation côté client, place le focus sur le contenu de la page affichée. */
function MainFocus() {
  const pathname = usePathname();
  const focusedFor = useRef(pathname);

  useEffect(() => {
    // Premier chargement, ou rendu sans navigation : le focus reste où il est.
    if (pathname === focusedFor.current) return;
    focusedFor.current = pathname;
    if (focusIsOnShownPage()) return;
    // Sans défilement : Next règle lui-même la position de la page.
    shownElements(`main#${MAIN_ID}`)[0]?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

/**
 * Focus après une navigation côté client (onglet, marque, menu replié, retour arrière) : il rejoint le contenu de la
 * page affichée, `main#contenu` (tabIndex −1), d'où la tabulation et la lecture reprennent. Next 16 ne déplace pas le
 * focus, et l'élément choisi disparaît avec sa page, masquée sous <Activity> : le focus serait perdu. Next garde
 * jusqu'à trois pages quittées dans le DOM, chacune avec son `main#contenu` : seul celui de la page affichée compte.
 * Rien au premier chargement, ni quand une page a posé le focus sur l'un de ses éléments. Rien à l'écran.
 * Frontière <Suspense> de prudence : `usePathname` suspendrait le prérendu d'une adresse dont un paramètre n'est pas
 * connu au build (les trois langues le sont, `generateStaticParams`), sans bloquer le reste du layout.
 */
export function FocusOnNavigation() {
  return (
    <Suspense fallback={null}>
      <MainFocus />
    </Suspense>
  );
}
