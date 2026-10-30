import { STOP_ORDER, type StopKey } from "@/lib/journey/camera";
import { sectionRanges, type SectionBox, type SectionRange } from "@/lib/journey/sections";
import { prefersReducedMotion } from "@/lib/sim/reducedMotion";

/**
 * Plages de défilement des escales de la page, mesurées par son suivi du défilement. Les clés sont celles des
 * `data-stop` de la page (voyage ou Tailles) : goTo et holdAt visent n'importe laquelle, sans liste d'escales.
 */
let ranges: readonly SectionRange[] = [];

export function setSectionRanges(next: readonly SectionRange[]): void {
  ranges = next;
}

export function getSectionRanges(): readonly SectionRange[] {
  return ranges;
}

/** Escale du voyage. */
export function isStopKey(value: string | undefined): value is StopKey {
  return value !== undefined && (STOP_ORDER as readonly string[]).includes(value);
}

/**
 * L'élément appartient à la page affichée. Next 16 (`cacheComponents`) garde dans le DOM jusqu'à trois pages
 * quittées, masquées sous <Activity> par `display: none` : leurs sections ne comptent pas dans les plages de
 * défilement, ne reçoivent pas l'avancement du repos et leurs plaques ne cadrent pas la scène. Sans
 * `checkVisibility` (jsdom, Safari avant 17.4), on remonte les ancêtres à la recherche de `display: none`.
 */
export function isShown(element: Element): boolean {
  if (typeof element.checkVisibility === "function") return element.checkVisibility();
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).display === "none") return false;
  }
  return true;
}

/** Éléments de la page affichée qui répondent au sélecteur, dans l'ordre du document. */
export function shownElements<E extends Element = HTMLElement>(selector: string): E[] {
  return Array.from(document.querySelectorAll<E>(selector)).filter(isShown);
}

/**
 * Position de chaque `[data-stop]` non vide de la page affichée, convertie en plages de défilement.
 * Appelée par le suivi du défilement, et par une plaque qui vient de changer de hauteur.
 */
export function measureSections(): void {
  const boxes: SectionBox[] = [];
  for (const element of shownElements("[data-stop]")) {
    const key = element.dataset.stop;
    if (!key) continue;
    const rect = element.getBoundingClientRect();
    boxes.push({ key, top: rect.top + window.scrollY, height: rect.height });
  }
  setSectionRanges(sectionRanges(boxes, window.innerHeight));
}

/** Le prochain relevé du suivi prend le défilement tel quel, sans le lisser. */
let skipSmoothing = false;

/**
 * Défilement immédiat que la caméra ne doit pas suivre en vol : le suivi saute à la nouvelle
 * position au lieu de la rejoindre en douceur. Sans cela, sa position lissée, encore sur
 * l'ancienne, pourrait tomber hors de la plage de repos d'une section qui vient de raccourcir.
 * Interrompt aussi un défilement doux en cours.
 */
export function scrollInstantly(top: number): void {
  // Sans déplacement, l'appel interrompt seulement un défilement doux en cours : rien à sauter.
  if (Math.abs(top - window.scrollY) >= 1) skipSmoothing = true;
  window.scrollTo({ top, behavior: "instant" });
}

/** Lu par le suivi à chaque image : vrai une seule fois après `scrollInstantly`. */
export function takeSkipSmoothing(): boolean {
  const skip = skipSmoothing;
  skipSmoothing = false;
  return skip;
}

/** Écart toléré entre la position atteinte et la cible, en px. */
const SETTLE_TOLERANCE_PX = 2;
/** Repli si `scrollend` n'arrive pas (événement absent du navigateur, ou aucun défilement), en ms. */
const SETTLE_FALLBACK_MS = 1000;
/** Sans `scrollend` : défilement considéré comme fini après ce silence, en ms. */
const SCROLL_IDLE_MS = 200;
/** La page peut grandir plusieurs fois pendant le trajet (modules qui se remplissent). */
const MAX_CORRECTIONS = 3;
/** Gestes par lesquels la personne reprend la main : on ne la ramène pas de force. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

let cancelSettle: (() => void) | null = null;

/** Défilement d'arrivée sur l'escale : 2 px après son arrivée, caméra posée. */
function targetOf(key: string): number | null {
  const range = ranges.find((r) => r.key === key);
  return range ? Math.max(0, range.arrive + 2) : null;
}

/**
 * Après un défilement doux, recalcule la cible (les plages ont pu changer pendant le trajet)
 * et corrige si l'écart dépasse 2 px, sans quoi la caméra s'arrêterait en plein vol.
 */
function settleOn(key: string, correctionsLeft: number): void {
  cancelSettle?.();
  const hasScrollEnd = "onscrollend" in window;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(timer);
    window.removeEventListener("scrollend", finish);
    window.removeEventListener("scroll", onScroll);
    for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop);
    cancelSettle = null;
  };

  function finish(): void {
    stop();
    const target = targetOf(key);
    if (target === null || Math.abs(window.scrollY - target) <= SETTLE_TOLERANCE_PX) return;
    window.scrollTo({ top: target, behavior: "smooth" });
    if (correctionsLeft > 1) settleOn(key, correctionsLeft - 1);
  }

  // Chaque défilement repousse l'échéance : sans `scrollend`, elle tombe après un court silence.
  const onScroll = () => {
    clearTimeout(timer);
    timer = setTimeout(finish, hasScrollEnd ? SETTLE_FALLBACK_MS : SCROLL_IDLE_MS);
  };

  window.addEventListener("scrollend", finish);
  window.addEventListener("scroll", onScroll, { passive: true });
  for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { passive: true });
  timer = setTimeout(finish, SETTLE_FALLBACK_MS);
  cancelSettle = stop;
}

/**
 * Défile jusqu'à l'escale, en douceur sauf si les animations sont réduites, puis y place
 * le focus comme le ferait une ancre. Renvoie `false` tant que les sections ne sont pas
 * mesurées : l'ancre native prend alors le relais.
 */
export function goTo(key: string): boolean {
  const target = targetOf(key);
  if (target === null) return false;
  const smooth = !prefersReducedMotion();
  window.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
  document.querySelector<HTMLElement>(`[data-stop="${key}"]`)?.focus({ preventScroll: true });
  if (smooth) settleOn(key, MAX_CORRECTIONS);
  else cancelSettle?.();
  return true;
}

/**
 * Pose la caméra au repos sur l'escale, sans animation, avant l'exploration : coupe le recalage d'une navigation et
 * tout défilement doux en cours ; si le défilement est hors de [arrive, depart] de l'escale (vol en cours), saute à
 * arrive + 2 (avant) ou à max(arrive + 2, ⌊depart⌋) (après), sans que le suivi ne lisse le saut. Sans plages mesurées :
 * coupe seulement, à la position actuelle.
 */
export function holdAt(key: string): void {
  cancelSettle?.();
  const y = window.scrollY;
  const range = ranges.find((r) => r.key === key);
  if (!range) {
    scrollInstantly(y);
    return;
  }
  const low = range.arrive + 2;
  if (y < range.arrive) scrollInstantly(low);
  else if (y > range.depart) scrollInstantly(Math.max(low, Math.floor(range.depart)));
  else scrollInstantly(y);
}
