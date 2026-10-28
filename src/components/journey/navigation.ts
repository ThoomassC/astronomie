import { STOP_ORDER, sectionRanges, type SectionBox, type SectionRange, type StopKey } from "@/lib/journey/camera";
import { prefersReducedMotion } from "@/lib/sim/reducedMotion";

/** Plages de défilement des escales, mesurées par le suivi du voyage. */
let ranges: readonly SectionRange[] = [];

export function setSectionRanges(next: readonly SectionRange[]): void {
  ranges = next;
}

export function getSectionRanges(): readonly SectionRange[] {
  return ranges;
}

export function isStopKey(value: string | undefined): value is StopKey {
  return value !== undefined && (STOP_ORDER as readonly string[]).includes(value);
}

/**
 * Position de chaque `[data-stop]` dans le document, convertie en plages de défilement.
 * Appelée par le suivi du voyage, et par une plaque qui vient de changer de hauteur.
 */
export function measureSections(): void {
  const boxes: SectionBox[] = [];
  for (const element of document.querySelectorAll<HTMLElement>("[data-stop]")) {
    const key = element.dataset.stop;
    if (!isStopKey(key)) continue;
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
function targetOf(key: StopKey): number | null {
  const range = ranges.find((r) => r.key === key);
  return range ? Math.max(0, range.arrive + 2) : null;
}

/**
 * Après un défilement doux, recalcule la cible (les plages ont pu changer pendant le trajet)
 * et corrige si l'écart dépasse 2 px, sans quoi la caméra s'arrêterait en plein vol.
 */
function settleOn(key: StopKey, correctionsLeft: number): void {
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
export function goTo(key: StopKey): boolean {
  const target = targetOf(key);
  if (target === null) return false;
  const smooth = !prefersReducedMotion();
  window.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
  document.querySelector<HTMLElement>(`[data-stop="${key}"]`)?.focus({ preventScroll: true });
  if (smooth) settleOn(key, MAX_CORRECTIONS);
  else cancelSettle?.();
  return true;
}
