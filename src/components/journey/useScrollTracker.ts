import { useEffect, useRef } from "react";
import { restProgress, scrollState } from "@/lib/journey/sections";
import type { StopStore } from "@/lib/journey/store";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { useReducedMotion } from "@/lib/sim/reducedMotion";
import { getSectionRanges, measureSections, setSectionRanges, shownElements, takeSkipSmoothing } from "./navigation";

/** Plaque d'une escale, et dernier avancement du repos écrit (au millième). */
interface PlateRest {
  element: HTMLElement;
  rest: number;
}

/** Écrit l'avancement du repos sur la plaque, seulement s'il a changé (au millième). */
function setRest<K extends string>(plates: ReadonlyMap<K, PlateRest>, key: K, value: number): void {
  const plate = plates.get(key);
  const rest = Math.round(value * 1000) / 1000;
  if (!plate || plate.rest === rest) return;
  plate.rest = rest;
  plate.element.style.setProperty("--rest", String(rest));
}

/** Délai avant de remesurer après un redimensionnement, en ms. */
const RESIZE_DEBOUNCE_MS = 120;
/** Taux du lissage exponentiel du défilement, par seconde. */
const SCROLL_SMOOTHING_RATE = 5;

/**
 * Suit le défilement d'une page à escales (voyage, Tailles) et publie le vol en cours dans `store`. Aucun rendu.
 * - Mesure les `[data-stop]` de la page : au montage, 120 ms après un redimensionnement, quand son <main> change de
 *   hauteur (ResizeObserver), une fois les polices chargées. Seulement la page affichée : Next garde dans le DOM,
 *   masquées, des pages quittées, chacune avec son <main>.
 * - Lisse la position à chaque image (taux 5/s) ; saute directement à la position après un défilement immédiat
 *   (`takeSkipSmoothing`) ou en mouvement réduit ; se pose dessus à moins de 0,5 px.
 * - Écrit l'avancement du repos (`--rest`, de 0 à 1, au millième) sur la plaque de l'escale (`[data-stop] > .plate`) :
 *   sur téléphone, son filet de couleur se remplit jusqu'au départ de la caméra.
 * - Ne publie que si (from, to, t) change : la scène compare ces valeurs pour sauter les images inutiles. Une section
 *   dont `isKey` refuse la clé n'est pas publiée.
 * - Au démontage, rend le parcours à son état initial (`store.reset()`) et oublie les plages mesurées : la page
 *   suivante repart du haut. De même quand la page est masquée (<Activity>) ; à son retour, le lissage repart de la
 *   position du défilement, que Next a remis en haut : la caméra ne balaie pas les escales depuis celle d'avant.
 * `store` et `isKey` sont stables (définis au niveau du module) : en changer remesure tout et remet le parcours au
 * départ.
 */
export function useScrollTracker<K extends string>(
  store: StopStore<K>,
  isKey: (value: string | undefined) => value is K,
): void {
  const reducedMotion = useReducedMotion();
  const smoothedY = useRef<number | null>(null);
  /** Plaque de chaque escale, et dernier avancement écrit (au millième). */
  const plates = useRef(new Map<K, PlateRest>());

  useEffect(() => {
    // Ref gardé quand la page est masquée puis affichée de nouveau : le premier relevé prend le défilement tel quel.
    smoothedY.current = null;
    for (const element of shownElements("[data-stop] > .plate")) {
      const key = element.parentElement?.dataset.stop;
      if (isKey(key)) plates.current.set(key, { element, rest: -1 });
    }
    measureSections();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(measureSections, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(() => measureSections());
    const [main] = shownElements("main");
    if (main) observer.observe(main);
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) measureSections();
    });
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      store.reset();
      setSectionRanges([]);
    };
  }, [store, isKey]);

  useFrame((dt) => {
    const y = window.scrollY;
    const previous = smoothedY.current ?? y;
    const jump = takeSkipSmoothing() || reducedMotion;
    let next = jump ? y : previous + (y - previous) * (1 - Math.exp(-dt * SCROLL_SMOOTHING_RATE));
    if (Math.abs(y - next) < 0.5) next = y;
    smoothedY.current = next;
    const ranges = getSectionRanges();
    if (ranges.length === 0) return;
    const { from, to, t } = scrollState(ranges, next);
    const state = store.get();
    const fromKey = ranges[from].key;
    const toKey = ranges[to].key;
    // Section étrangère au parcours : rien à publier.
    if (!isKey(fromKey) || !isKey(toKey)) return;
    // En vol, la plaque quittée est pleine et celle qui arrive vide ; au repos, elle suit le défilement.
    setRest(plates.current, fromKey, from === to ? restProgress(ranges[from], next) : 1);
    if (to !== from) setRest(plates.current, toKey, 0);
    // Au repos, pas de nouvel état : la scène compare ces valeurs pour sauter les images inutiles.
    if (state.from === fromKey && state.to === toKey && state.t === t) return;
    store.update(fromKey, toKey, t);
  }, FRAME_ORDER.journey);
}
