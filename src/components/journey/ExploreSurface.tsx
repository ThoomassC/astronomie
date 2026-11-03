"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { exploreStore } from "@/lib/journey/explore";
import { dragToRotation, pinchToZoom, wheelToZoom } from "@/lib/journey/orbit";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";

interface Point {
  x: number;
  y: number;
}

/**
 * Déplacement cumulé du milieu des deux doigts, en px, au-delà duquel un pincement fait aussi tourner : en dessous,
 * c'est un zoom pur, qui garde « vu depuis la Terre ».
 */
const PINCH_ROTATE_THRESHOLD_PX = 6;
/** Le milieu des doigts est lu juste avant la scène, qui consomme les gestes dans la même image. */
const PINCH_FRAME_ORDER = FRAME_ORDER.scene - 1;

interface Pinch {
  /** Milieu des deux doigts à la dernière lecture. */
  middle: Point;
  /** Déplacement du milieu cumulé tant que la rotation n'a pas démarré. */
  drift: Point;
  /** Le milieu a dépassé le seuil : il fait tourner l'astre, comme un glisser. */
  rotating: boolean;
}

/** Les deux doigts d'un pincement, ou null s'il n'y a qu'un pointeur (la surface n'en suit jamais plus de deux). */
function pairOf(pointers: ReadonlyMap<number, Point>): readonly [Point, Point] | null {
  if (pointers.size < 2) return null;
  const [a, b] = pointers.values();
  return [a, b];
}

/** Écart entre les deux doigts, en px ; 0 sans pincement. */
function spanOf(pointers: ReadonlyMap<number, Point>): number {
  const pair = pairOf(pointers);
  return pair ? Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y) : 0;
}

/** Milieu des deux doigts, ou null sans pincement. */
function middleOf(pointers: ReadonlyMap<number, Point>): Point | null {
  const pair = pairOf(pointers);
  return pair ? { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 } : null;
}

/** Fait tourner l'astre d'un glisser de (dx, dy) px. */
function rotateBy(dx: number, dy: number): void {
  const { azim, elev } = dragToRotation(dx, dy, window.innerHeight);
  exploreStore.rotate(azim, elev);
}

/**
 * Surface de gestes plein écran, sous les commandes d'exploration. Un doigt (ou la souris) fait tourner l'astre, qui
 * suit le doigt ; deux doigts qui s'écartent ou se rapprochent changent la distance, et leur milieu fait tourner
 * au-delà d'un petit seuil ; la molette change la distance. Masquée aux technologies d'assistance : le pavé et le
 * clavier font la même chose. Les gestes vont au store, que le moteur lit une fois par image.
 */
export function ExploreSurface() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  /** Pointeurs pressés sur la surface, et leur dernière position. */
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);

  // Écouteur posé à la main : celui de React est passif, et preventDefault n'y empêcherait pas la page de défiler
  // (ni, avec Ctrl, de se zoomer : c'est ainsi qu'arrive le pincement d'un pavé tactile).
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      exploreStore.zoom(wheelToZoom(event.deltaY, event.deltaMode, window.innerHeight));
    };
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => surface.removeEventListener("wheel", onWheel);
  }, []);

  // Chaque doigt a son propre événement : pendant un pincement pur, le milieu oscille d'un doigt à l'autre.
  // Lu une fois par image, après les deux, il ne garde que le déplacement commun.
  useFrame(() => {
    const current = pinch.current;
    if (!current) return;
    const middle = middleOf(pointers.current);
    if (!middle) return;
    const dx = middle.x - current.middle.x;
    const dy = middle.y - current.middle.y;
    current.middle = middle;
    if (current.rotating) {
      rotateBy(dx, dy);
      return;
    }
    current.drift.x += dx;
    current.drift.y += dy;
    if (Math.hypot(current.drift.x, current.drift.y) < PINCH_ROTATE_THRESHOLD_PX) return;
    current.rotating = true;
    rotateBy(current.drift.x, current.drift.y);
  }, PINCH_FRAME_ORDER);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const tracked = pointers.current;
    // Un troisième doigt, ou un autre bouton que le principal de la souris (menu contextuel), ne fait rien.
    if (tracked.size >= 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    // La surface garde le pointeur même quand il passe sur une commande ou sort de la fenêtre (absent de jsdom).
    event.currentTarget.setPointerCapture?.(event.pointerId);
    tracked.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.toggleAttribute("data-dragging", true);
    const middle = middleOf(tracked);
    if (middle) pinch.current = { middle, drift: { x: 0, y: 0 }, rotating: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const tracked = pointers.current;
    const previous = tracked.get(event.pointerId);
    // Souris survolée sans bouton pressé, ou pointeur déjà relâché.
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    if (tracked.size === 1) {
      tracked.set(event.pointerId, next);
      rotateBy(next.x - previous.x, next.y - previous.y);
      return;
    }
    const span = spanOf(tracked);
    tracked.set(event.pointerId, next);
    exploreStore.zoom(pinchToZoom(span, spanOf(tracked)));
  };

  /** Pointeur relâché, annulé ou perdu : oublié. Le doigt qui reste reprend la rotation d'où il est. */
  const release = (event: PointerEvent<HTMLDivElement>) => {
    const tracked = pointers.current;
    if (!tracked.delete(event.pointerId)) return;
    pinch.current = null;
    if (tracked.size === 0) event.currentTarget.removeAttribute("data-dragging");
  };

  return (
    <div
      ref={surfaceRef}
      className="explore-surface"
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    />
  );
}
