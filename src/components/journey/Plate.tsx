"use client";

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { FIXED_CARD_QUERY } from "@/lib/journey/card";
import { clampToRest, restRange } from "@/lib/journey/sections";
import { prefersReducedMotion } from "@/lib/sim/reducedMotion";
import { useIsCurrentCard } from "./CardTrack";
import { cssVars } from "./cssVars";
import { JOURNEY_STRINGS } from "./journey.strings";
import { measureSections, scrollInstantly, shownElements } from "./navigation";
import { PlateIcon, type PlateIconName } from "./PlateIcon";

export interface PlateSection {
  key: string;
  /** Libellé du bouton qui déplie la section (téléphones) : nom accessible et infobulle, « Lire la fiche ». */
  label: string;
  /**
   * Lu après le libellé quand il revient à chaque escale (« Lire la fiche, Mars ») : le nom de l'astre distingue les
   * boutons de la page à l'oreille.
   */
  context?: string;
  /** Pictogramme du bouton, seul visible dans la plaque compacte. */
  icon: PlateIconName;
  content: ReactNode;
}

interface PlateProps {
  /** Identifiant de l'escale, préfixe des zones dépliables. */
  id: string;
  /**
   * Clé de l'escale (`data-stop`) dans son parcours (CardTrack) : sur téléphone, seule la plaque de l'escale courante se
   * voit, fixée en haut de l'écran (`data-current`).
   */
  stop?: string;
  /** Nom de l'astre, lu après « Replier » pour distinguer les plaques entre elles. */
  name: string;
  /** Couleur de l'astre : filet du haut et puce du rang. */
  color: string;
  /** Avant le nom, toujours visible : avertissement d'hypothèse (multivers), rang. */
  header?: ReactNode;
  /** Nom de l'astre, titre de l'escale (`h2`) : toujours visible. */
  title: ReactNode;
  /** Accroche, sous le nom ; masquée à l'œil dans la plaque compacte, où elle reste lue juste après lui. */
  hook?: string;
  sections: readonly PlateSection[];
  /**
   * Escales voisines (StopSteps), rendues deux fois, la feuille de style n'en montrant qu'une : de part et d'autre du
   * nom dans la plaque compacte (« ‹ Soleil › », sans rangée de plus, qui rognerait la bande libre de la scène),
   * lues après lui ; ailleurs (paysage bas, sans JavaScript), en pilules au bout de la rangée des titres-boutons.
   */
  steps?: ReactNode;
  /** Toujours visible, sous les sections. */
  footer?: ReactNode;
}

/** Air laissé entre le haut dégagé de l'écran et le bouton touché (ou la zone ouverte), en px. */
const BUTTON_GAP_PX = 12;

/**
 * Plaque compacte, avec JavaScript : la requête des blocs de globals.css qui réduisent les titres-boutons à leurs
 * pictogrammes et posent la zone ouverte sous leur rangée.
 */
const COMPACT_PLATE_QUERY =
  "(max-width: 640px) and (scripting: enabled), (max-width: 1100px) and (orientation: portrait) and (scripting: enabled)";

/**
 * Plaque compacte : ses sections s'excluent, comme des onglets. Lue au moment d'ouvrir, jamais au rendu ; faux sans
 * `matchMedia` (rendu serveur), où chaque section reste indépendante.
 */
function exclusiveSections(): boolean {
  return typeof matchMedia === "function" && matchMedia(COMPACT_PLATE_QUERY).matches;
}

/**
 * Carte fixe (globals.css) : la plaque est fixée en haut de l'écran, hors du flux, et son contenu défile en elle-même.
 * La déplier ou la replier ne change pas la hauteur de l'escale : la page ne défile pas. Lu au moment d'agir.
 */
function fixedCard(): boolean {
  return typeof matchMedia === "function" && matchMedia(FIXED_CARD_QUERY).matches;
}

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

/** Libellé d'un titre-bouton, suivi de ce qui le distingue à l'oreille : masqué à l'œil dans la plaque compacte. */
function ButtonLabel({ label, context }: { label: string; context?: string }) {
  return (
    <span className="more-label">
      {label}
      {context ? <span className="sr">, {context}</span> : null}
    </span>
  );
}

/** Infobulle d'un titre-bouton : son nom accessible entier, pour qu'elle ne s'y ajoute pas en description. */
const tooltip = (label: string, context?: string) => (context ? `${label}, ${context}` : label);

function Chevron() {
  return (
    <svg className="more-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
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
 * accordéon), « Replier » referme tout. Dans la plaque compacte, où la zone ouverte passe sous la
 * rangée des pictogrammes, une seule section s'ouvre à la fois (comme des onglets) : le DOM ne change
 * pas, chaque zone suit son bouton. Un dépliage amène le bouton touché (plaque compacte : sa zone)
 * sous la barre sans quitter la plage de repos de l'escale ; un repli ne déplace jamais la caméra. Les boutons sont rendus dès
 * le serveur, pour que la page ne change pas de hauteur à l'hydratation. Sur grand écran, ou sans
 * JavaScript, tout est visible et les boutons sont masqués (globals.css). « Replier » est dans la
 * langue de la page ; les libellés des sections viennent de qui rend la plaque.
 */
export function Plate({ id, stop, name, color, header, title, hook, sections, steps, footer }: PlateProps) {
  const t = JOURNEY_STRINGS[useLocale()];
  const current = useIsCurrentCard(stop);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const articleRef = useRef<HTMLElement>(null);
  const pending = useRef<ScrollRequest | null>(null);
  const expanded = open.size > 0;
  const zoneIdOf = (key: string) => `${id}-${key}`;

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
    const stops = shownElements("[data-stop]");
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
    const exclusive = exclusiveSections();
    if (fixedCard()) {
      pending.current = null;
    } else {
      const before = open.has(key) ? beforeFold(articleRef.current) : null;
      // Plaque compacte : la zone s'ouvre sous la rangée des boutons, c'est elle qu'on amène à l'écran.
      const zone = exclusive ? document.getElementById(zoneIdOf(key)) : null;
      pending.current = before ? { before, focusFirst: false } : { reveal: zone ?? button };
    }
    setOpen((current) => {
      if (current.has(key)) {
        const next = new Set(current);
        next.delete(key);
        return next;
      }
      return exclusive ? new Set([key]) : new Set(current).add(key);
    });
  };

  const foldAll = () => {
    const before = fixedCard() ? null : beforeFold(articleRef.current);
    pending.current = before ? { before, focusFirst: true } : null;
    if (!before) articleRef.current?.querySelector<HTMLElement>(".more-btn")?.focus({ preventScroll: true });
    setOpen(new Set());
  };

  // Le focus arrive dans une zone fermée (passage du grand écran au téléphone) : elle s'ouvre, seule en plaque compacte.
  const openOnFocus = (key: string) => {
    if (open.has(key)) return;
    const exclusive = exclusiveSections();
    setOpen((current) => (exclusive ? new Set([key]) : new Set(current).add(key)));
  };

  return (
    <article
      ref={articleRef}
      className="plate"
      style={cssVars({ "--c": color })}
      data-expanded={expanded || undefined}
      data-current={current || undefined}
    >
      {header}
      {/*
       * L'accroche suit le nom : masquée à l'œil dans la plaque compacte (posée hors de la grille du nom), elle y est lue
       * juste après lui, avant les escales voisines.
       */}
      <div className="plate-title">
        {title}
        {hook ? <p className="hook">{hook}</p> : null}
        {steps}
      </div>
      {/* Sur téléphone, les titres-boutons se rangent sur une ligne quand ils y tiennent (globals.css). */}
      <div className="plate-sections">
        {sections.map((section) => {
          const zoneId = zoneIdOf(section.key);
          const isOpen = open.has(section.key);
          return (
            <Fragment key={section.key}>
              <h3 className="more-heading">
                <button
                  type="button"
                  className="more-btn"
                  aria-expanded={isOpen}
                  aria-controls={zoneId}
                  title={tooltip(section.label, section.context)}
                  onClick={(event) => toggle(event.currentTarget, section.key)}
                >
                  <PlateIcon name={section.icon} />
                  <ButtonLabel label={section.label} context={section.context} />
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
          <button type="button" className="more-btn more-fold" title={tooltip(t.fold, name)} onClick={foldAll}>
            <PlateIcon name="fold" />
            <ButtonLabel label={t.fold} context={name} />
            <Chevron />
          </button>
        )}
        {steps}
      </div>
      {footer}
    </article>
  );
}
