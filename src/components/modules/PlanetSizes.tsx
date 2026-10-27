"use client";

import { useRef, useState, type PointerEvent } from "react";
import { PLANET_BY_KEY, PLANETS, SUN, type Planet } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { useReducedMotion } from "@/lib/sim/reducedMotion";
import { ModuleCanvas } from "./ModuleCanvas";
import { clamp, INK, lerp, smooth, TAU } from "./paint";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useCanvasModule, type CanvasFrame, type CanvasSize } from "./useCanvasModule";
import styles from "./modules.module.css";

const SIZE: CanvasSize = { width: 560, height: 250 };

const EARTH = PLANET_BY_KEY.earth;
const LARGEST_KM = Math.max(...PLANETS.map((planet) => planet.diameterKm));
const JUPITER_INDEX = PLANETS.findIndex((planet) => planet.key === "jupiter");
/** Mercure, Vénus, la Terre et Mars : trop petites pour une étiquette chacune. */
const INNER_COUNT = 4;
const GAP = 8;
/** Terres alignées sur le diamètre de Jupiter, et leur cadence d'apparition (par seconde). */
const EARTHS = 11;
const EARTHS_PER_S = 9;
const HINT_ID = "sizes-planet-hint";

/** Place occupée au sol : les anneaux de Saturne débordent de son diamètre. */
const footprint = (planet: Planet) => (planet.key === "saturn" ? planet.diameterKm * 1.75 : planet.diameterKm);
const TOTAL_FOOTPRINT = PLANETS.reduce((sum, planet) => sum + footprint(planet), 0);

/** Rapport au diamètre de la Terre, avec deux décimales sous 1. */
const earthRatio = (planet: Planet) => {
  const ratio = planet.diameterKm / EARTH.diameterKm;
  return formatNumber(ratio, ratio < 1 ? 2 : 1);
};

const describe = (planet: Planet) =>
  `${planet.name} : ${formatNumber(planet.diameterKm)} km, ${earthRatio(planet)} fois la Terre.`;

const MODES = [
  { value: 0, label: "Les planètes" },
  { value: 1, label: "Avec le Soleil" },
] as const;
type Mode = (typeof MODES)[number]["value"];

const EARTHS_READOUT = "11 Terres côte à côte couvrent presque le diamètre de Jupiter (11,2 exactement).";

/** Équivalent textuel du canvas : les huit diamètres et leur rapport à la Terre. */
function canvasLabel(mode: Mode, earthsShown: boolean): string {
  const planets = PLANETS.map((planet) => {
    const size = `${planet.name}, ${formatNumber(planet.diameterKm)} km`;
    if (planet.key === EARTH.key) return size;
    const many = planet.diameterKm / EARTH.diameterKm >= 2;
    return `${size} (${earthRatio(planet)} ${many ? "Terres" : "Terre"})`;
  }).join(" ; ");
  const sun = mode === 1 ? ` Le Soleil est dessiné à côté : ${formatNumber(SUN.diameterKm)} km, 109 Terres.` : "";
  const earths = earthsShown && mode === 0 ? " 11 Terres sont alignées sur le diamètre de Jupiter." : "";
  return `Les huit planètes dessinées à la même échelle : ${planets}.${sun}${earths}`;
}

interface Spot {
  x: number;
  y: number;
  r: number;
}

/** État d'animation, hors React. */
interface SizesView {
  /** Cadrage animé : 0 = les planètes, 1 = avec le Soleil. */
  k: number;
  earths: number;
  /** Zones de survol de la dernière image (px CSS). */
  spots: Spot[];
}

/** 6. Les tailles à l'échelle (Jupiter) : les huit planètes au même rapport, avec ou sans le Soleil. */
export function PlanetSizes() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>(0);
  const [showEarths, setShowEarths] = useState(false);
  /** Planète détaillée : choisie au survol, au toucher ou par les boutons radio. */
  const [selected, setSelected] = useState(JUPITER_INDEX);
  /** Cadrage ou alignement des Terres en cours d'animation. */
  const [transitioning, setTransitioning] = useState(false);
  const [readout, setReadout] = useState(() => describe(PLANETS[JUPITER_INDEX]));
  const { message, announce } = useAnnouncer();
  const view = useRef<SizesView>({ k: 0, earths: 0, spots: [] });

  const draw = ({ p, ctx: c, w, h, dt }: CanvasFrame) => {
    const v = view.current;
    v.k += (mode - v.k) * (1 - Math.exp(-dt * (reduced ? 60 : 3)));
    if (Math.abs(mode - v.k) < 1e-3) v.k = mode;
    if (showEarths) v.earths = reduced ? EARTHS : Math.min(EARTHS, v.earths + dt * EARTHS_PER_S);
    const base = h - 34;
    const k = smooth(clamp(v.k, 0, 1));
    const fitAll = Math.min((w - 32 - GAP * 7) / TOTAL_FOOTPRINT, (base - 18) / LARGEST_KM);
    const withSun = (w * 0.62 - GAP * 7) / TOTAL_FOOTPRINT;
    const scale = Math.max(0, lerp(fitAll, withSun, k));
    const x0 = lerp(16, w * 0.36, k);
    c.clearRect(0, 0, w, h);

    if (k > 0.01) {
      const sr = (SUN.diameterKm / 2) * scale;
      const sx = x0 - 14 - sr;
      const glow = c.createRadialGradient(sx, base - sr, sr * 0.7, sx, base - sr, sr);
      glow.addColorStop(0, "#FFC25C");
      glow.addColorStop(1, "#F07A1E");
      c.globalAlpha = k;
      c.fillStyle = glow;
      c.beginPath();
      c.arc(sx, base - sr, sr, 0, TAU);
      c.fill();
      p.text("Soleil", 14, 24, { weight: 700, size: 13, color: INK.nuit });
      c.globalAlpha = 1;
    }
    c.strokeStyle = "rgba(194,163,107,.5)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, base + 0.5);
    c.lineTo(w, base + 0.5);
    c.stroke();

    let x = x0;
    const spots: Spot[] = [];
    PLANETS.forEach((planet, i) => {
      const r = (planet.diameterKm / 2) * scale;
      const fw = footprint(planet) * scale;
      const cx = x + fw / 2;
      const cy = base - r;
      const ringed = planet.key === "saturn";
      if (ringed) {
        c.strokeStyle = "rgba(226,201,143,.75)";
        c.lineWidth = Math.max(1, r * 0.22);
        c.beginPath();
        c.ellipse(cx, cy, r * 1.85, r * 0.42, -0.2, Math.PI, TAU);
        c.stroke();
      }
      p.dot(cx, cy, Math.max(r, 0.6), planet.color);
      if (ringed) {
        c.beginPath();
        c.ellipse(cx, cy, r * 1.85, r * 0.42, -0.2, 0, Math.PI);
        c.stroke();
      }
      const highlighted = i === selected;
      if (highlighted) {
        c.strokeStyle = INK.ivoire;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(cx, cy, Math.max(r, 2) + 4, 0, TAU);
        c.stroke();
      }
      if (r >= 6 || highlighted) {
        p.text(planet.name, cx, base + 18, {
          align: "center",
          size: 11.5,
          color: highlighted ? INK.ivoire : INK.brume,
          weight: highlighted ? 700 : 400,
        });
      } else if (i === 0 && selected >= INNER_COUNT) {
        p.text("Mercure à Mars", cx - 2, base + 18, { size: 11, color: INK.brume });
      }
      spots.push({ x: cx, y: cy, r: Math.max(r, 7) });
      x += fw + GAP;
    });
    v.spots = spots;

    if (showEarths && mode === 0) {
      const jupiter = spots[JUPITER_INDEX];
      const er = (EARTH.diameterKm / 2) * scale;
      for (let i = 0; i < Math.floor(v.earths); i++) {
        p.dot(jupiter.x - jupiter.r + er + i * er * 2, jupiter.y, er, EARTH.color);
      }
    }

    const settled = v.k === mode && (!showEarths || v.earths >= EARTHS);
    if (settled && transitioning) setTransitioning(false);
  };
  const { canvas } = useCanvasModule(SIZE, draw, { animating: transitioning });

  /** Met à jour la ligne de lecture (non annoncée) et l'annonce une fois le geste terminé. */
  const show = (text: string) => {
    setReadout(text);
    announce(text);
  };

  const select = (index: number) => {
    setSelected(index);
    show(describe(PLANETS[index]));
  };

  // Survol et toucher du canvas choisissent aussi la planète (le bouton radio suit).
  const pick = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const index = view.current.spots.findIndex((spot) => Math.hypot(x - spot.x, y - spot.y) <= Math.max(spot.r, 8));
    if (index >= 0 && index !== selected) select(index);
  };

  const chooseMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setTransitioning(true);
    show(
      next === 1
        ? `Le Soleil mesure ${formatNumber(SUN.diameterKm)} km : 109 Terres, ou presque 10 Jupiter.`
        : describe(PLANETS[selected]),
    );
  };

  const toggleEarths = () => {
    const next = !showEarths;
    view.current.earths = 0;
    setShowEarths(next);
    if (next) {
      setTransitioning(true);
      show(EARTHS_READOUT);
    } else {
      show(describe(PLANETS[selected]));
    }
  };

  return (
    <>
      <ModuleCanvas
        {...canvas}
        label={canvasLabel(mode, showEarths)}
        onPointerMove={pick}
        onPointerDown={pick}
      />
      <fieldset className={styles.picker} aria-describedby={HINT_ID}>
        <legend className={styles.legend}>Planète détaillée</legend>
        <p id={HINT_ID} className={styles.pickerHint}>
          {"Ou choisissez-la ici ; au clavier, avec les flèches."}
        </p>
        <div className={styles.options}>
          {PLANETS.map((planet, i) => (
            <label key={planet.key} className={styles.option}>
              <input
                type="radio"
                name="sizes-planet"
                id={`sizes-planet-${planet.key}`}
                value={planet.key}
                checked={selected === i}
                onChange={() => select(i)}
              />
              <span>{planet.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="ctrls">
        <div className="seg" role="group" aria-label="Cadrage">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => chooseMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          className="chip"
          type="button"
          id="sizes-earths"
          aria-pressed={showEarths}
          disabled={mode === 1}
          onClick={toggleEarths}
        >
          Aligner 11 Terres
        </button>
      </div>
      <p className={`readout ${styles.reserve}`} id="sizes-readout" aria-live="off">
        {readout}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
