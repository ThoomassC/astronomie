"use client";

import { useEffect, useRef } from "react";
import { cssVars } from "@/components/journey/cssVars";
import { RAIL_ID } from "@/components/journey/ids";
import { goTo, isStopKey } from "@/components/journey/navigation";
import { useRealScale } from "@/components/journey/realScale";
import { PLANETS, SUN } from "@/lib/astro/planets";
import type { StopKey } from "@/lib/journey/camera";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { createSolarScene, type BodyKey, type SolarScene as SceneEngine } from "./engine";
import { setSceneFallback } from "./fallback";

const LABELS: readonly { key: BodyKey; name: string; color: string }[] = [
  { key: "sun", name: SUN.name, color: SUN.color },
  ...PLANETS.map((planet) => ({ key: planet.key, name: planet.name, color: planet.color })),
];

const isBodyKey = (value: string | undefined): value is BodyKey => LABELS.some((label) => label.key === value);

/**
 * Scène 3D en fond fixe et étiquettes des astres. Chargée uniquement dans le navigateur
 * (voir SceneMount) ; le moteur Three vit hors de React et rend dans la boucle commune.
 */
export default function SolarScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const realScale = useRealScale();

  useEffect(() => {
    const canvas = canvasRef.current;
    const labelLayer = labelsRef.current;
    if (!canvas || !labelLayer) return;
    const labels = new Map<BodyKey, HTMLElement>();
    for (const element of labelLayer.querySelectorAll<HTMLElement>("[data-body]")) {
      const key = element.dataset.body;
      if (isBodyKey(key)) labels.set(key, element);
    }
    const plates = new Map<StopKey, HTMLElement>();
    for (const plate of document.querySelectorAll<HTMLElement>("[data-stop] > .plate")) {
      const key = plate.parentElement?.dataset.stop;
      if (isStopKey(key)) plates.set(key, plate);
    }
    const rail = document.getElementById(RAIL_ID);
    const engine = createSolarScene({
      canvas,
      labels,
      obstacles: rail ? [rail] : [],
      plates,
      bar: document.querySelector(".bar"),
      note: document.querySelector<HTMLElement>(".scale-note"),
      onPick: goTo,
    });
    if (engine) engineRef.current = engine;
    else setSceneFallback("webgl", true);
    return () => {
      engineRef.current = null;
      engine?.dispose();
      setSceneFallback("webgl", false);
      setSceneFallback("runtime", false);
    };
  }, []);

  useFrame((dt) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      engine.frame(dt);
    } catch (error) {
      // La scène s'arrête seule et passe au repli CSS ; le reste de la page continue.
      engineRef.current = null;
      engine.dispose();
      setSceneFallback("runtime", true);
      console.error("Scène 3D arrêtée", error);
    }
  }, FRAME_ORDER.scene);

  return (
    <>
      <canvas id="sky" ref={canvasRef} aria-hidden="true" />
      {/*
        Raccourcis pour la souris et le doigt, hors de l'ordre de tabulation et du lecteur
        d'écran : la règle des distances offre la même navigation au clavier.
        Masquées (visibility) jusqu'à leur premier placement par le moteur.
      */}
      <div id="labels" ref={labelsRef} className={realScale ? "real" : undefined} aria-hidden="true">
        {LABELS.map(({ key, name, color }) => (
          <button
            key={key}
            type="button"
            tabIndex={-1}
            className="lbl"
            data-body={key}
            style={cssVars({ "--lc": color })}
            onClick={() => goTo(key)}
          >
            <i />
            <span>{name}</span>
          </button>
        ))}
      </div>
    </>
  );
}
