"use client";

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PLATE_MORE } from "@/content/site";
import { clampToRest, restRange } from "@/lib/journey/camera";
import { prefersReducedMotion } from "@/lib/sim/reducedMotion";
import { cssVars } from "./cssVars";
import { measureSections, scrollInstantly } from "./navigation";

export interface PlateSection {
  key: string;
  /** Libellé du bouton qui déplie la section (téléphones). */
  label: ReactNode;
  content: ReactNode;
}

interface PlateProps {
  /** Identifiant de l'escale, préfixe des zones dépliables. */
  id: string;
  /** Nom de l'astre, lu après « Replier » pour distinguer les plaques entre elles. */
  name: string;
  /** Couleur de l'astre : filet du haut et puce du rang. */
  color: string;
  /** Rang, nom, accroche : toujours visibles. */
  header: ReactNode;
  sections: readonly PlateSection[];
  /** Toujours visible, sous les sections. */
  footer?: ReactNode;
}

/** Air laissé entre le haut dégagé de l'écran et le bouton touché, en px. */
const BUTTON_GAP_PX = 12;

/** Juste avant un repli : défilement, plage de repos et hauteur de l'escale encore dépliée. */
interface BeforeFold {
  scrollY: number;
  arrive: number;
  depart: number;
  height: number;
}

/** Après le rendu : amener ce bouton en haut de l'écran (dépliage), ou garder la caméra où elle est (repli). */
type ScrollRequest = { reveal: HTMLElement } | { before: BeforeFold; focusFirst: boolean };

/** Haut de l'écran libre de la barre et de la note d'échelle : le `scroll-padding-top` de la page. */
function topClearance(): number {
  return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
}

/** Escale de la plaque, et sa boîte dans le document. */
function measureStop(article: HTMLElement | null) {
  const section = article?.closest<HTMLElement>("[data-stop]");
  if (!section) return null;
  const rect = section.getBoundingClientRect();
  return { section, box: { top: rect.top + window.scrollY, height: rect.height } };
}

function beforeFold(article: HTMLElement | null): BeforeFold | null {
  const stop = measureStop(article);
  if (!stop) return null;
  return { scrollY: window.scrollY, ...restRange(stop.box, window.innerHeight), height: stop.box.height };
}

function Chevron() {
  return (
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
  );
}

/**
 * Plaque de lecture d'une escale. Sur téléphone, elle reste compacte et collée en bas de l'écran
 * pour laisser voir l'astre : chaque titre-bouton déplie sa section juste en dessous de lui (motif
 * accordéon), « Replier » referme tout. Un dépliage amène le bouton touché sous la barre sans quitter
 * la plage de repos de l'escale ; un repli ne déplace jamais la caméra. Les boutons sont rendus dès
 * le serveur, pour que la page ne change pas de hauteur à l'hydratation. Sur grand écran, ou sans
 * JavaScript, tout est visible et les boutons sont masqués (globals.css).
 */
export function Plate({ id, name, color, header, sections, footer }: PlateProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const articleRef = useRef<HTMLElement>(null);
  const pending = useRef<ScrollRequest | null>(null);
  const expanded = open.size > 0;


  useLayoutEffect(() => {
    const request = pending.current;
    pending.current = null;
    const stop = measureStop(articleRef.current);
    if (!request || !stop) return;
    // La plaque vient de changer de hauteur : les plages du voyage aussi, avant tout défilement.
    measureSections();
    const { section, box } = stop;
    if ("reveal" in request) {
      const wanted = request.reveal.getBoundingClientRect().top + window.scrollY - topClearance() - BUTTON_GAP_PX;
      const top = clampToRest(wanted, box, window.innerHeight);
      if (Math.abs(top - window.scrollY) >= 1) {
        window.scrollTo({ top, behavior: prefersReducedMotion() ? "instant" : "smooth" });
      }
      return;
    }
    const { scrollY, arrive, depart, height } = request.before;
    const stops = document.querySelectorAll("[data-stop]");
    const last = stops[stops.length - 1] === section;
    let top = scrollY;
    if (scrollY > depart) {
      // En vol vers l'escale suivante : tout ce qui suit a remonté d'autant, le vol garde son avancement.
      top = scrollY - (height - box.height);
    } else if (scrollY >= arrive && !last) {
      // Au repos : l'escale a pu raccourcir sous la position, on reste dans sa plage de repos.
      top = clampToRest(scrollY, box, window.innerHeight);
    }
    // Toujours un défilement immédiat : il interrompt aussi un défilement doux de dépliage en cours.
    scrollInstantly(top);
    if (request.focusFirst) {
      articleRef.current?.querySelector<HTMLElement>(".more-btn")?.focus({ preventScroll: true });
    }
  }, [open]);

  const toggle = (button: HTMLElement, key: string) => {
    const before = open.has(key) ? beforeFold(articleRef.current) : null;
    pending.current = before ? { before, focusFirst: false } : { reveal: button };
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const foldAll = () => {
    const before = beforeFold(articleRef.current);
    pending.current = before ? { before, focusFirst: true } : null;
    setOpen(new Set());
  };

  // Le focus arrive dans une zone fermée (passage du grand écran au téléphone) : elle s'ouvre.
  const openOnFocus = (key: string) => {
    if (!open.has(key)) setOpen((current) => new Set(current).add(key));
  };

  return (
    <article
      ref={articleRef}
      className="plate"
      style={cssVars({ "--c": color })}
      data-expanded={expanded || undefined}
    >
      {header}
      {sections.map((section) => {
        const zoneId = `${id}-${section.key}`;
        const isOpen = open.has(section.key);
        return (
          <Fragment key={section.key}>
            <h3 className="more-heading">
              <button
                type="button"
                className="more-btn"
                aria-expanded={isOpen}
                aria-controls={zoneId}
                onClick={(event) => toggle(event.currentTarget, section.key)}
              >
                <span>{section.label}</span>
                <Chevron />
              </button>
            </h3>
            <div
              id={zoneId}
              className="more-zone"
              data-open={isOpen || undefined}
              onFocus={() => openOnFocus(section.key)}
            >
              {section.content}
            </div>
          </Fragment>
        );
      })}
      {expanded && (
        <button type="button" className="more-btn more-fold" onClick={foldAll}>
          <span>
            {PLATE_MORE.fold}
            <span className="sr">, {name}</span>
          </span>
          <Chevron />
        </button>
      )}
      {footer}
    </article>
  );
}
