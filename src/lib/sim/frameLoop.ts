import { useEffect, useRef } from "react";

/** Reçoit le temps écoulé depuis l'image précédente, en secondes (borné à 0,05). */
export type FrameCallback = (dt: number) => void;

interface Entry {
  cb: FrameCallback;
  order: number;
}

const entries: Entry[] = [];
let raf = 0;
let last = 0;

function tick(now: number) {
  // Écrans à plus de 95 Hz (ProMotion 120 Hz) : une image sur deux, pour rester vers 60 i/s.
  // Un seuil fixe à 1000/60 ferait tomber un écran à 75 Hz à 37 i/s.
  if (last && now - last < 10.5) {
    raf = requestAnimationFrame(tick);
    return;
  }
  const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0;
  last = now;
  for (const e of [...entries]) {
    try {
      e.cb(dt);
    } catch (error) {
      // Un rappel en erreur est retiré seul : la boucle continue pour le reste de la page.
      const i = entries.indexOf(e);
      if (i >= 0) entries.splice(i, 1);
      console.error("Animation arrêtée après une erreur :", error);
    }
  }
  raf = entries.length ? requestAnimationFrame(tick) : 0;
  if (!raf) last = 0;
}

/**
 * Une seule boucle requestAnimationFrame pour toute la page. Les rappels s'exécutent
 * par `order` croissant (horloge, puis voyage, puis scène, puis modules).
 * La boucle s'arrête d'elle-même quand plus personne ne l'écoute.
 */
export function onFrame(cb: FrameCallback, order = 0): () => void {
  const entry = { cb, order };
  entries.push(entry);
  entries.sort((a, b) => a.order - b.order);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => {
    const i = entries.indexOf(entry);
    if (i >= 0) entries.splice(i, 1);
    if (!entries.length && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
  };
}

/**
 * Ordres d'exécution conventionnels. Le suivi du voyage lit `scrollY` en premier,
 * avant que l'horloge n'écrive dans le DOM (date du dock) : pas de mise en page forcée.
 */
export const FRAME_ORDER = { journey: -30, clock: -20, scene: 0, ui: 10, modules: 20 } as const;

/** Abonne un composant à la boucle tant que `enabled` est vrai ; le rappel le plus récent est toujours utilisé. */
export function useFrame(cb: FrameCallback, order = 0, enabled = true): void {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });
  useEffect(() => {
    if (!enabled) return;
    return onFrame((dt) => ref.current(dt), order);
  }, [order, enabled]);
}
