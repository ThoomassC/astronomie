"use client";

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { clampToRest, restRange } from "@/lib/journey/sections";
import { prefersReducedMotion } from "@/lib/sim/reducedMotion";
import { useFixedCard, useIsCurrentCard } from "./CardTrack";
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
  /**
   * Nom de l'astre, titre de l'escale (`h2`), toujours visible ; sur la carte fixe du téléphone, le bouton qui la déplie.
   * Lu aussi après « Replier », pour distinguer les plaques entre elles.
   */
  name: string;
  /** Identifiant du titre, qui nomme la section de l'escale (`aria-labelledby`). */
  titleId: string;
  /** Couleur de l'astre : filet du haut et puce du rang. */
  color: string;
  /** Avant le nom, toujours visible : avertissement d'hypothèse (multivers), rang. */
  header?: ReactNode;
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

/** Aucune section ouverte. */
const NO_SECTION: ReadonlySet<string> = new Set();

function Chevron({ className = "more-chevron" }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
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
 * Nom de l'astre dans son bouton, suivi du chevron décoratif : le dernier mot et le chevron ne se séparent pas, un nom
 * long passe à la ligne entre ses mots sans laisser le chevron seul.
 */
function NameLabel({ name }: { name: string }) {
  const cut = name.lastIndexOf(" ") + 1;
  return (
    <span>
      {name.slice(0, cut)}
      <span className="plate-name-end">
        {name.slice(cut)}
        <Chevron className="plate-name-chevron" />
      </span>
    </span>
  );
}

/**
 * Plaque de lecture d'une escale. Sur téléphone (carte fixe, ADR 0007), seule celle de l'escale courante se voit,
 * fixée en haut de l'écran, repliée au rang et au nom : le nom est le bouton qui la déplie (motif accordéon,
 * `h2 > button[aria-expanded][aria-controls]`). Dépliée, la rangée des pictogrammes paraît, la première section
 * ouverte ; une seule section s'ouvre à la fois (comme des onglets), son contenu défile dans la carte, la page ne
 * bouge pas. « Replier » ou un second toucher sur le nom replient tout, le focus revient au nom ; la carte d'une escale
 * qu'on quitte se replie. Ailleurs, dans la plaque compacte qui suit la page (paysage bas), chaque titre-bouton déplie
 * sa section juste en dessous de lui, « Replier » referme tout ; un dépliage amène le bouton touché (plaque compacte :
 * sa zone) sous la barre sans quitter la plage de repos de l'escale ; un repli ne déplace jamais la caméra. Les
 * titres-boutons sont rendus dès le serveur, pour que la page ne change pas de hauteur à l'hydratation ; le nom n'y
 * devient un bouton qu'après, en carte fixe, où la plaque est hors du flux. Sur grand écran, ou sans JavaScript, tout
 * est visible, le nom est un simple titre et les boutons sont masqués (globals.css). « Replier » est dans la langue de
 * la page ; les libellés des sections viennent de qui rend la plaque.
 */
export function Plate({ id, stop, name, titleId, color, header, hook, sections, steps, footer }: PlateProps) {
  const t = JOURNEY_STRINGS[useLocale()];
  const current = useIsCurrentCard(stop);
  const fixed = useFixedCard();
  const [open, setOpen] = useState<ReadonlySet<string>>(NO_SECTION);
  /** Carte fixe dépliée : rangée des pictogrammes et pied affichés. */
  const [unfolded, setUnfolded] = useState(false);
  const [wasCurrent, setWasCurrent] = useState(current);
  const articleRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLButtonElement>(null);
  const pending = useRef<ScrollRequest | null>(null);
  const expanded = open.size > 0;
  const zoneIdOf = (key: string) => `${id}-${key}`;
  const sectionsId = `${id}-sections`;

  // La carte fixe d'une escale qu'on quitte se replie : la suivante arrive repliée, et celle-ci aussi quand on y revient.
  if (current !== wasCurrent) {
    setWasCurrent(current);
    if (!current && fixed) {
      setUnfolded(false);
      setOpen(NO_SECTION);
    }
  }

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
    if (fixed) {
      // Carte fixe : la page ne défile pas, le contenu de la carte repart de son haut, sous la rangée des pictogrammes.
      pending.current = null;
      const scroller = articleRef.current?.querySelector<HTMLElement>(".plate-sections");
      if (scroller) scroller.scrollTop = 0;
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

  /** Carte fixe : tout replier, le focus au nom (le bouton touché, ou « Replier », qui disparaît). */
  const foldCard = () => {
    pending.current = null;
    setUnfolded(false);
    setOpen(NO_SECTION);
    nameRef.current?.focus({ preventScroll: true });
  };

  const foldAll = () => {
    if (fixed) {
      foldCard();
      return;
    }
    const before = beforeFold(articleRef.current);
    pending.current = before ? { before, focusFirst: true } : null;
    setOpen(NO_SECTION);
  };

  // Carte fixe : le nom déplie la carte, sa première section ouverte ; un second toucher replie tout.
  const toggleCard = () => {
    if (unfolded) {
      foldCard();
      return;
    }
    pending.current = null;
    setUnfolded(true);
    setOpen(sections.length > 0 ? new Set([sections[0].key]) : NO_SECTION);
  };

  // Le focus arrive dans une zone fermée (passage du grand écran au téléphone) : elle s'ouvre, seule en plaque compacte.
  const openOnFocus = (key: string) => {
    if (fixed) setUnfolded(true);
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
      data-unfolded={unfolded || undefined}
    >
      {header}
      {/*
       * L'accroche suit le nom : masquée à l'œil dans la plaque compacte (posée hors de la grille du nom), elle y est lue
       * juste après lui, avant les escales voisines.
       */}
      <div className="plate-title">
        <h2 id={titleId}>
          {fixed ? (
            <button
              ref={nameRef}
              type="button"
              className="plate-name"
              aria-expanded={unfolded}
              aria-controls={sectionsId}
              onClick={toggleCard}
            >
              <NameLabel name={name} />
            </button>
          ) : (
            name
          )}
        </h2>
        {hook ? <p className="hook">{hook}</p> : null}
        {steps}
      </div>
      {/* Sur téléphone, les titres-boutons se rangent sur une ligne quand ils y tiennent (globals.css). */}
      <div id={sectionsId} className="plate-sections">
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
        {(expanded || unfolded) && (
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
