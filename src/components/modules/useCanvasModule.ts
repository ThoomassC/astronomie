import { useEffect, useRef, useState, type RefObject } from "react";
import { getClock } from "@/lib/sim/clock";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { createPainter, FALLBACK_FONT_FAMILY, type Painter } from "./paint";

/** Taille de référence du canvas (attributs width/height de la maquette) et ratio en largeur étroite. */
export interface CanvasSize {
  width: number;
  height: number;
  /** Rapport hauteur / largeur quand le canvas mesure moins de `NARROW_WIDTH` px de large. */
  narrow?: number;
}

/** Ce que reçoit le dessin d'un module. Dimensions en px CSS. */
export interface CanvasFrame {
  p: Painter;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** Largeur inférieure à `NARROW_WIDTH` : mise en page étroite. */
  narrow: boolean;
  /** Secondes écoulées depuis l'image précédente ; 0 pour un redessin ponctuel. */
  dt: number;
}

export type DrawFn = (frame: CanvasFrame) => void;

/** À passer tel quel à `ModuleCanvas`. */
export interface CanvasModule {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  size: CanvasSize;
  /** Contexte 2D absent ou dessin en erreur : le module affiche un repli. */
  failed: boolean;
}

export interface CanvasModuleOptions {
  /** Une animation est en cours : la boucle d'images tourne, tant que le canvas est visible. */
  animating: boolean;
  /** Redessiner à chaque notification de l'horloge du site (module qui suit la date). */
  redrawOnClock?: boolean;
}

export interface CanvasModuleHandle {
  canvas: CanvasModule;
  /** Redessine tout de suite, après un changement qui ne passe pas par un rendu React. */
  invalidate: () => void;
}

/** Largeur sous laquelle les modules passent en mise en page étroite, en px CSS. */
export const NARROW_WIDTH = 420;
const MAX_DPR = 2;
const VISIBILITY_MARGIN = "120px";
/** Largeur supposée si le canvas n'est pas encore mis en page (comme la maquette). */
const FALLBACK_WIDTH = 300;

interface CanvasState {
  painter: Painter | null;
  w: number;
  h: number;
  narrow: boolean;
  /** Valeur posée en ligne pour `aspect-ratio`. */
  aspect: string;
  visible: boolean;
  animating: boolean;
  failed: boolean;
  onError: ((error: unknown) => void) | null;
}

/**
 * Dessine une image. Une erreur est interceptée : sinon elle remonterait dans la boucle
 * requestAnimationFrame partagée et figerait toute la page (scène, horloge, autres modules).
 */
function paint(state: CanvasState, draw: DrawFn, dt: number): void {
  const { painter } = state;
  if (!painter || state.failed || state.w <= 0) return;
  try {
    draw({ p: painter, ctx: painter.ctx, w: state.w, h: state.h, narrow: state.narrow, dt });
  } catch (error) {
    state.failed = true;
    state.onError?.(error);
  }
}

/**
 * Canvas d'un module explicatif : net en devicePixelRatio (plafonné à 2), largeur suivie par
 * ResizeObserver, hauteur = largeur × ratio (ratio étroit sous 420 px), police lue sur le canvas.
 *
 * Quand dessiner :
 * - à chaque image, seulement si `animating` et si le canvas est visible (IntersectionObserver, 120 px) ;
 * - une fois au montage, même hors de l'écran (les lignes de lecture calculées par le dessin sont prêtes) ;
 * - une fois après chaque rendu React, et à chaque notification de l'horloge si `redrawOnClock`,
 *   quand le canvas est visible ;
 * - sur `invalidate()`.
 * `draw` porte aussi l'avance de l'animation (avec `dt`) ; le plus récent est toujours utilisé.
 */
export function useCanvasModule(size: CanvasSize, draw: DrawFn, options: CanvasModuleOptions): CanvasModuleHandle {
  const { animating, redrawOnClock = false } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<CanvasState>({
    painter: null,
    w: 0,
    h: 0,
    narrow: false,
    aspect: "",
    visible: false,
    animating: false,
    failed: false,
    onError: null,
  });
  const drawRef = useRef(draw);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  const { width, height, narrow } = size;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = stateRef.current;
    state.onError = (error) => {
      console.error("Module explicatif : dessin interrompu.", error);
      setFailed(true);
    };
    const ctx = canvas.getContext("2d");
    const painter = ctx ? createPainter(ctx) : null;
    state.painter = painter;

    const redrawIfVisible = () => {
      if (state.visible) paint(state, drawRef.current, 0);
    };
    const resize = (cssWidth: number) => {
      if (!painter) return;
      const w = cssWidth > 0 ? cssWidth : FALLBACK_WIDTH;
      const isNarrow = w < NARROW_WIDTH;
      const ratio = isNarrow && narrow !== undefined ? narrow : height / width;
      const h = w * ratio;
      // Le script fait foi pour le ratio : la requête de conteneur du CSS ne sert qu'au premier
      // rendu (et manque aux navigateurs qui ne la connaissent pas, comme Safari 15).
      const aspect = `1 / ${ratio}`;
      if (state.aspect !== aspect) {
        state.aspect = aspect;
        canvas.style.aspectRatio = aspect;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const bitmapW = Math.round(w * dpr);
      const bitmapH = Math.round(h * dpr);
      // Réaffecter width/height efface le canvas : seulement si la taille du bitmap change.
      if (canvas.width !== bitmapW) canvas.width = bitmapW;
      if (canvas.height !== bitmapH) canvas.height = bitmapH;
      painter.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.w = w;
      state.h = h;
      state.narrow = isNarrow;
    };
    // Police du canvas (nom haché par next/font) : lue au montage, relue une fois les polices prêtes.
    const readFont = () => {
      if (painter) painter.family = getComputedStyle(canvas).fontFamily || FALLBACK_FONT_FAMILY;
    };

    readFont();
    resize(canvas.getBoundingClientRect().width);
    paint(state, drawRef.current, 0);

    let active = true;
    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        if (!active) return;
        readFont();
        redrawIfVisible();
      });
    }

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (!entry) return;
            resize(entry.contentRect.width);
            // Le rappel arrive après l'image de la boucle : sans redessin, le canvas resterait vide.
            redrawIfVisible();
          })
        : null;
    resizeObserver?.observe(canvas);

    const intersectionObserver =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[entries.length - 1];
              if (!entry) return;
              state.visible = entry.isIntersecting;
              setVisible(entry.isIntersecting);
              if (entry.isIntersecting && !state.painter) state.onError?.(new Error("Contexte 2D indisponible."));
            },
            { rootMargin: VISIBILITY_MARGIN },
          )
        : null;
    intersectionObserver?.observe(canvas);

    return () => {
      active = false;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      state.painter = null;
      state.visible = false;
      state.onError = null;
    };
  }, [width, height, narrow]);

  // Après chaque rendu : dernier dessin connu, puis un redessin si le canvas est visible
  // (un changement d'état du module, ou le canvas qui devient visible).
  useEffect(() => {
    drawRef.current = draw;
    const state = stateRef.current;
    state.animating = animating;
    if (state.visible) paint(state, draw, 0);
  });

  useEffect(() => {
    if (!redrawOnClock) return;
    const unsubscribe = getClock().subscribe(() => {
      const state = stateRef.current;
      if (state.visible && !state.animating) paint(state, drawRef.current, 0);
    });
    return () => {
      unsubscribe();
    };
  }, [redrawOnClock]);

  useFrame(
    (dt) => paint(stateRef.current, drawRef.current, dt),
    FRAME_ORDER.modules,
    visible && !failed && animating,
  );

  const invalidate = () => paint(stateRef.current, drawRef.current, 0);
  return { canvas: { canvasRef, size, failed }, invalidate };
}
