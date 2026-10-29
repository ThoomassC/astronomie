"use client";

import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";

/** Escale de la liste : un lien vers sa section. */
export interface StopsMenuItem {
  /** Clé `data-stop` de la section de l'escale. */
  key: string;
  /** Ancre de la section (lien natif sans JavaScript). */
  href: `#${string}`;
  name: string;
  /** Précision sous le nom (distance au Soleil, rayon). */
  sub: string;
  /** Couleur de la pastille. */
  color: string;
}

export interface StopsMenuViewProps {
  /** Escales, dans l'ordre de la page. */
  items: readonly StopsMenuItem[];
  /** Escale affichée (`aria-current="location"` dans la liste). */
  current: string;
  /** Escale d'accueil, absente de la liste : le bouton dit alors ce qu'il ouvre. */
  homeKey: string;
  /** Nom et couleur de l'escale affichée, sur le bouton hors de l'accueil. */
  currentName: string;
  currentColor: string;
  /**
   * Nom du <nav> ; texte du bouton à l'accueil ; complément lu après le texte du bouton, sans ponctuation, selon
   * qu'aucune escale n'est encore affichée (`choose`) ou qu'une l'est (`change`).
   */
  labels: { nav: string; home: string; choose: string; change: string };
}

/**
 * Le nom de l'escale en cours, dans la barre haute, ouvre la liste des escales, avec de grandes
 * cibles tactiles : il remplace la règle là où elle n'a plus que des pastilles sans nom
 * (globals.css). Ailleurs, la règle reste et ce menu est masqué. Échap, un choix, un toucher
 * hors du menu ou un focus qui en sort le referment.
 */
export function StopsMenuView({ items, current, homeKey, currentName, currentColor, labels }: StopsMenuViewProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  // L'accueil n'est pas une escale de la liste : le bouton dit ce qu'il ouvre.
  const atHome = current === homeKey;

  useEffect(() => {
    if (!open) return;
    // L'escale en cours reste visible à l'ouverture, même quand la liste défile (écran court).
    listRef.current?.querySelector<HTMLElement>('[aria-current="location"]')?.scrollIntoView?.({ block: "nearest" });
    // Menu masqué par la mise en page (fenêtre élargie, rotation) : il n'intercepte plus rien.
    const hidden = () => !rootRef.current || getComputedStyle(rootRef.current).display === "none";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (hidden()) return;
      // En capture, avant la note d'échelle : un seul appui ne ferme qu'une couche.
      event.preventDefault();
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onResize = () => {
      if (hidden()) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Le focus sort du menu (Tab après le dernier lien) : la liste ne doit pas masquer ce qu'il atteint.
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <nav ref={rootRef} className="stops-menu" aria-label={labels.nav} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className="stops-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        {atHome ? null : <i aria-hidden="true" style={{ background: currentColor }} />}
        <b>{atHome ? labels.home : currentName}</b>
        <span className="sr">{`, ${atHome ? labels.choose : labels.change}`}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {/* Un choix referme la liste ; le lien fait défiler jusqu'à l'escale et y place le focus. */}
      <ul ref={listRef} id={listId} className="stops-list" hidden={!open} onClick={() => setOpen(false)}>
        {items.map(({ key, href, name, sub, color }) => (
          <li key={key}>
            <GoToLink href={href} stop={key} aria-current={key === current ? "location" : undefined}>
              <i aria-hidden="true" style={cssVars({ "--lc": color })} />
              <b>{name}</b>
              <small>{sub}</small>
            </GoToLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
