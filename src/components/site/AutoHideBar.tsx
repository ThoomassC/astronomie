"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { followScroll, shownBar } from "@/lib/site/barSlide";

interface AutoHideBarProps {
  /** Classes de la barre commune (`bar` et celle de son module). */
  className: string;
  /** Page affichée (`data-page`), qui règle la mise en page de la barre. */
  page: string;
  /** La barre porte des commandes propres à la page (`data-controls`). */
  controls: boolean;
  children?: ReactNode;
}

/**
 * Barre haute du Voyage et de Tailles (`data-autohide`), qui suit le défilement : elle glisse hors de l'écran quand on
 * descend et revient dès qu'on remonte (`data-concealed`, barSlide.ts). Elle revient aussi quand le focus y entre,
 * clavier ou programme (retour du focus au bouton « Tourner autour »), et quand la fenêtre change de taille. Le
 * défilement est borné à la page : le rebond du bas (iOS) ne la fait pas revenir. La feuille de style décide où elle
 * glisse vraiment (mise en page compacte, écran bas, là où il n'y a pas de fondus), sans animation en mouvement réduit,
 * et la garde tant qu'elle a le focus clavier ou un menu ouvert. Quand la page est masquée (<Activity>), la barre ne
 * suit plus rien et reviendra affichée. Le contenu reste rendu par le serveur (SiteHeader).
 */
export function AutoHideBar({ className, page, controls, children }: AutoHideBarProps) {
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const scrollTop = () => Math.min(Math.max(window.scrollY, 0), Math.max(0, root.scrollHeight - window.innerHeight));
    let state = shownBar(scrollTop());
    const write = () => bar.toggleAttribute("data-concealed", state.concealed);
    const reveal = () => {
      state = shownBar(scrollTop());
      write();
    };
    const onScroll = () => {
      const next = followScroll(state, scrollTop(), bar.offsetHeight);
      const changed = next.concealed !== state.concealed;
      state = next;
      if (changed) write();
    };
    reveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", reveal);
    bar.addEventListener("focusin", reveal);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", reveal);
      bar.removeEventListener("focusin", reveal);
      bar.removeAttribute("data-concealed");
    };
  }, []);

  return (
    <header
      ref={barRef}
      className={className}
      data-hide-on-explore=""
      data-autohide=""
      data-page={page}
      data-controls={controls ? "" : undefined}
    >
      {children}
    </header>
  );
}
