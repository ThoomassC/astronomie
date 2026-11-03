import { useId, type ReactNode } from "react";
import type { HomeCardPage } from "@/content/home/types";
import { PLANET_BY_KEY, SUN, type PlanetKey } from "@/lib/astro/planets";
import { COMPARED_STAR_BY_KEY, type SizeStarKey } from "@/lib/astro/starSizes";

/**
 * Illustrations des trois cartes de l'accueil, dans le monde du planétaire : ciel de nuit (le fond de leur cadre), traits
 * de laiton de 1 px quelle que soit la taille (`currentColor` : la couleur vient du cadre), astres aux couleurs du site.
 * Même rapport pour les trois, 12:5 (viewBox de 240 × 100) ; décoratives (`aria-hidden`) : le titre de la carte dit
 * tout. Rendues par le serveur, sans script ni animation.
 */

/** Couleurs du MASTER qui ne sont pas des astres : texte ivoire, plaque, nuit, interaction. */
const IVORY = "#ECE5D3";
const PLATE = "#0B1430";
const NIGHT = "#060B18";
const SOLEIL = "#FFB547";
/** Étoiles du fond : voisines (blanc bleuté), G, K et B (corps noir de leur classe). */
const STAR_COLORS = { near: "#CFDCFF", g: "#FFF4EA", k: "#FFD2A1", b: "#AABFFF" } as const;
/** Voie lactée (lavande) : la galaxie au loin du Voyage. */
const GALAXY = "#B3A4EE";

/** Trait fin : 1 px à l'écran, que le dessin mesure 288 ou 700 px de large. */
const HAIRLINE = { fill: "none", stroke: "currentColor", strokeWidth: 1, vectorEffect: "non-scaling-stroke" } as const;

type BackgroundStar = readonly [x: number, y: number, r: number, color: keyof typeof STAR_COLORS, opacity: number];

/** Semis d'étoiles du fond : de simples points, plus ou moins vifs. */
function Stars({ stars }: { stars: readonly BackgroundStar[] }) {
  return (
    <g>
      {stars.map(([x, y, r, color, opacity]) => (
        <circle key={`${x}:${y}`} cx={x} cy={y} r={r} fill={STAR_COLORS[color]} fillOpacity={opacity} />
      ))}
    </g>
  );
}

/** Le cadre commun : rapport 12:5, centré sans rogner, caché aux lecteurs d'écran. */
function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 240 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* ---------- Voyage : le Soleil, ses orbites, puis une trajectoire qui file vers les étoiles ---------- */

/** Le Soleil, coupé par le bord gauche : ses orbites ne montrent que des arcs. */
const SUN_AT = { x: 22, y: 56 } as const;

/** Orbites de Mercure à Saturne (rayon, en unités du dessin) et place de chaque planète sur la sienne (°, y vers le bas). */
const VOYAGE_PLANETS: readonly { key: PlanetKey; orbit: number; angle: number; radius: number }[] = [
  { key: "mercury", orbit: 14, angle: -62, radius: 1.5 },
  { key: "venus", orbit: 20, angle: 38, radius: 2 },
  { key: "earth", orbit: 27, angle: -24, radius: 2.2 },
  { key: "mars", orbit: 35, angle: 57, radius: 1.8 },
  { key: "jupiter", orbit: 52, angle: -31, radius: 4.2 },
  { key: "saturn", orbit: 70, angle: 21, radius: 3.4 },
];

const VOYAGE_PLACED = VOYAGE_PLANETS.map((planet) => {
  const angle = (planet.angle * Math.PI) / 180;
  return {
    ...planet,
    x: Number((SUN_AT.x + planet.orbit * Math.cos(angle)).toFixed(2)),
    y: Number((SUN_AT.y + planet.orbit * Math.sin(angle)).toFixed(2)),
  };
});

/** Étoiles vers lesquelles file la trajectoire, plus denses à droite. */
const VOYAGE_STARS: readonly BackgroundStar[] = [
  [92, 20, 0.4, "g", 0.45],
  [100, 6, 0.5, "near", 0.5],
  [110, 92, 0.5, "g", 0.5],
  [120, 14, 0.6, "g", 0.7],
  [134, 70, 0.5, "near", 0.6],
  [146, 46, 0.4, "g", 0.5],
  [148, 24, 0.8, "near", 0.9],
  [158, 88, 0.6, "k", 0.7],
  [166, 52, 0.5, "g", 0.6],
  [176, 8, 0.6, "b", 0.8],
  [184, 40, 0.9, "g", 0.9],
  [192, 82, 0.5, "near", 0.6],
  [200, 30, 0.6, "k", 0.7],
  [212, 50, 0.7, "near", 0.8],
  [218, 92, 0.6, "g", 0.6],
  [226, 58, 0.4, "k", 0.6],
  [232, 40, 0.5, "b", 0.7],
  [234, 72, 0.8, "near", 0.9],
];

function VoyageArt() {
  const id = useId();
  const glow = `${id}-lueur`;
  const path = `${id}-trajet`;
  const galaxy = `${id}-galaxie`;
  return (
    <Art>
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor={SUN.color} stopOpacity={0.45} />
          <stop offset="1" stopColor={SUN.color} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={path} x1="0" x2="1">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="1" stopColor={IVORY} />
        </linearGradient>
        <radialGradient id={galaxy}>
          <stop offset="0" stopColor={GALAXY} stopOpacity={0.75} />
          <stop offset="1" stopColor={GALAXY} stopOpacity={0} />
        </radialGradient>
      </defs>
      <Stars stars={VOYAGE_STARS} />
      <ellipse cx="204" cy="68" rx="11" ry="3.4" transform="rotate(-16 204 68)" fill={`url(#${galaxy})`} />
      <circle cx="204" cy="68" r="0.9" fill={STAR_COLORS.g} />
      <g {...HAIRLINE} strokeOpacity={0.55}>
        {VOYAGE_PLANETS.map(({ key, orbit }) => (
          <circle key={key} cx={SUN_AT.x} cy={SUN_AT.y} r={orbit} />
        ))}
      </g>
      <circle cx={SUN_AT.x} cy={SUN_AT.y} r="19" fill={`url(#${glow})`} />
      <circle cx={SUN_AT.x} cy={SUN_AT.y} r="6.5" fill={SUN.color} />
      {VOYAGE_PLACED.map(({ key, x, y, radius }) => (
        <g key={key}>
          {key === "saturn" ? (
            <ellipse
              {...HAIRLINE}
              cx={x}
              cy={y}
              rx="7"
              ry="2.1"
              transform={`rotate(-20 ${x} ${y})`}
              stroke={PLANET_BY_KEY.saturn.color}
            />
          ) : null}
          <circle
            cx={x}
            cy={y}
            r={radius}
            fill={PLANET_BY_KEY[key].color}
            stroke={NIGHT}
            strokeWidth="1.5"
            paintOrder="stroke"
            vectorEffect="non-scaling-stroke"
          />
          {key === "earth" ? <circle {...HAIRLINE} cx={x} cy={y} r="4" stroke={SOLEIL} strokeWidth="1.25" /> : null}
        </g>
      ))}
      <path
        {...HAIRLINE}
        d="M30 54.5 C 70 53, 112 47, 142 39 S 198 21, 220 17"
        stroke={`url(#${path})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1 5"
      />
      <circle cx="226" cy="16" r="3.5" fill={STAR_COLORS.near} fillOpacity={0.18} />
      <path
        d="M226 10.5 L227.1 14.9 L231.5 16 L227.1 17.1 L226 21.5 L224.9 17.1 L220.5 16 L224.9 14.9 Z"
        fill={STAR_COLORS.near}
      />
    </Art>
  );
}

/* ---------- Tailles : des astres de plus en plus grands sur une même ligne de sol, puis un trou noir ---------- */

/** Ligne de sol, graduée comme la règle des tailles. */
const GROUND = 88;

/** Un astre de la rangée : son rayon dans l'illustration (pas à l'échelle) et l'écart qui le précède. */
interface RowBody {
  radius: number;
  gap: number;
}

/**
 * Rangée des étoiles, de la minuscule à l'immense : Proxima du Centaure, le Soleil, Sirius A, Arcturus, Rigel, VY
 * Canis Majoris, aux couleurs de l'onglet Tailles (corps noir) ; l'écart qui précède chacune grandit avec elle.
 */
const SIZE_STARS: readonly (RowBody & { key: SizeStarKey })[] = [
  { key: "proxima-centauri", radius: 1.3, gap: 0 },
  { key: "sun", radius: 2.6, gap: 4.5 },
  { key: "sirius-a", radius: 4.2, gap: 4.5 },
  { key: "arcturus", radius: 8, gap: 5 },
  { key: "rigel", radius: 14.5, gap: 6 },
  { key: "vy-canis-majoris", radius: 30, gap: 7 },
];

/** Puis un trou noir, le dernier et le plus grand : l'onglet Tailles va en accueillir. */
const BLACK_HOLE: RowBody = { radius: 34, gap: 8 };

/** Centres des astres posés côte à côte sur la ligne de sol, de gauche à droite à partir de x = 10. */
function rowCentres(bodies: readonly RowBody[]): number[] {
  let right = 10;
  return bodies.map(({ radius, gap }) => {
    const centre = right + gap + radius;
    right = centre + radius;
    return Number(centre.toFixed(2));
  });
}

const ROW_CENTRES = rowCentres([...SIZE_STARS, BLACK_HOLE]);

const SIZES_STARS: readonly BackgroundStar[] = [
  [20, 14, 0.5, "g", 0.6],
  [30, 52, 0.4, "g", 0.5],
  [44, 30, 0.6, "near", 0.7],
  [60, 40, 0.5, "near", 0.6],
  [70, 10, 0.5, "k", 0.6],
  [96, 22, 0.7, "g", 0.8],
  [112, 6, 0.4, "near", 0.5],
  [150, 12, 0.6, "b", 0.7],
  [168, 8, 0.5, "g", 0.6],
  [236, 10, 0.5, "near", 0.6],
];

/** Graduations de la ligne de sol : une tous les 6, plus longue toutes les quatre. */
const GROUND_TICKS = Array.from({ length: 38 }, (_, index) => ({ x: 10 + 6 * index, major: index % 4 === 0 }));

function SizesArt() {
  const id = useId();
  const hole = `${id}-trou`;
  const giant = `${id}-geante`;
  const blue = `${id}-bleue`;
  const holeX = ROW_CENTRES[SIZE_STARS.length];
  const holeY = GROUND - BLACK_HOLE.radius;
  const disk = BLACK_HOLE.radius * 0.67;
  return (
    <Art>
      <defs>
        {/* Trou noir : ombre noire, anneau lumineux, lueur qui s'éteint au-delà. */}
        <radialGradient id={hole}>
          <stop offset="0" stopColor="#000" />
          <stop offset="0.55" stopColor="#000" />
          <stop offset="0.6" stopColor="#5A2A0E" />
          <stop offset="0.67" stopColor={SUN.color} />
          <stop offset="0.78" stopColor="#E8762A" stopOpacity={0.5} />
          <stop offset="1" stopColor="#E8762A" stopOpacity={0} />
        </radialGradient>
        {/* VY Canis Majoris : assombrissement du bord, comme une sphère. */}
        <radialGradient id={giant} cx="0.42" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#FFE2BD" />
          <stop offset="0.7" stopColor={COMPARED_STAR_BY_KEY["vy-canis-majoris"].color} />
          <stop offset="1" stopColor="#E9A25E" />
        </radialGradient>
        <radialGradient id={blue}>
          <stop offset="0.6" stopColor={COMPARED_STAR_BY_KEY.rigel.color} stopOpacity={0.35} />
          <stop offset="1" stopColor={COMPARED_STAR_BY_KEY.rigel.color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <Stars stars={SIZES_STARS} />
      <line {...HAIRLINE} x1="6" y1={GROUND} x2="236" y2={GROUND} strokeOpacity={0.7} />
      <g {...HAIRLINE} strokeOpacity={0.5}>
        {GROUND_TICKS.map(({ x, major }) => (
          <line key={x} x1={x} y1={GROUND} x2={x} y2={GROUND + (major ? 3.5 : 2)} />
        ))}
      </g>
      {SIZE_STARS.map(({ key, radius }, index) => {
        const x = ROW_CENTRES[index];
        const y = GROUND - radius;
        return (
          <g key={key}>
            {key === "rigel" ? <circle cx={x} cy={y} r={radius * 1.35} fill={`url(#${blue})`} /> : null}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={key === "vy-canis-majoris" ? `url(#${giant})` : COMPARED_STAR_BY_KEY[key].color}
            />
          </g>
        );
      })}
      <circle cx={holeX} cy={holeY} r={BLACK_HOLE.radius} fill={`url(#${hole})`} />
      {/* Anneau de photons, net, au bord de l'ombre ; le bas du disque, plus brillant (il vient vers nous). */}
      <circle {...HAIRLINE} cx={holeX} cy={holeY} r={BLACK_HOLE.radius * 0.575} stroke="#FFE9C4" strokeOpacity={0.95} />
      <path
        {...HAIRLINE}
        d={`M${holeX - disk} ${holeY} A ${disk} ${disk} 0 0 0 ${holeX + disk} ${holeY}`}
        stroke="#FFD089"
        strokeOpacity={0.55}
        strokeWidth="2.5"
      />
    </Art>
  );
}

/* ---------- À propos : un réglet gradué et des fiches de sources ---------- */

/** Lignes de la fiche : la pastille de l'astre dont parle la source, le texte (un trait), un lien vers un autre site. */
const SOURCE_LINES: readonly { color: string; end: number; external: boolean }[] = [
  { color: SUN.color, end: 160, external: true },
  { color: PLANET_BY_KEY.earth.color, end: 150, external: false },
  { color: STAR_COLORS.near, end: 168, external: true },
];

/** Réglet : de x = 20 à 220, graduations tous les 4, moyennes tous les 20, grandes tous les 40. */
const RULER = { left: 20, right: 220, top: 80, bottom: 93 } as const;
const RULER_TICKS = Array.from({ length: 49 }, (_, index) => ({
  x: RULER.left + 4 + 4 * index,
  length: index % 10 === 0 ? 6 : index % 5 === 0 ? 4.2 : 2.6,
}));

const ABOUT_STARS: readonly BackgroundStar[] = [
  [14, 12, 0.5, "g", 0.6],
  [28, 62, 0.4, "g", 0.5],
  [36, 40, 0.6, "near", 0.7],
  [52, 8, 0.4, "k", 0.5],
  [200, 10, 0.6, "g", 0.7],
  [212, 58, 0.4, "b", 0.5],
  [226, 30, 0.5, "near", 0.6],
  [232, 62, 0.6, "k", 0.6],
];

function AboutArt() {
  return (
    <Art>
      <Stars stars={ABOUT_STARS} />
      <rect
        {...HAIRLINE}
        x="66"
        y="13"
        width="100"
        height="54"
        rx="5"
        transform="rotate(-5 116 40)"
        fill={PLATE}
        strokeOpacity={0.45}
      />
      <g transform="rotate(3 140 47)">
        <rect {...HAIRLINE} x="88" y="19" width="104" height="56" rx="5" fill={PLATE} />
        <line {...HAIRLINE} x1="99" y1="31" x2="146" y2="31" stroke={IVORY} strokeWidth="1.6" strokeLinecap="round" />
        {SOURCE_LINES.map(({ color, end, external }, index) => {
          const y = 42 + 10 * index;
          return (
            <g key={color}>
              <circle cx="101" cy={y} r="1.9" fill={color} />
              <line {...HAIRLINE} x1="107" y1={y} x2={end} y2={y} strokeOpacity={0.8} strokeLinecap="round" />
              {external ? (
                <path
                  {...HAIRLINE}
                  d={`M${end + 4} ${y + 2} L${end + 8} ${y - 2} M${end + 5} ${y - 2} L${end + 8} ${y - 2} L${end + 8} ${y + 1}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </g>
          );
        })}
      </g>
      <rect
        {...HAIRLINE}
        x={RULER.left}
        y={RULER.top}
        width={RULER.right - RULER.left}
        height={RULER.bottom - RULER.top}
        rx="2.5"
        fill={PLATE}
      />
      <g {...HAIRLINE}>
        {RULER_TICKS.map(({ x, length }) => (
          <line key={x} x1={x} y1={RULER.top} x2={x} y2={RULER.top + length} />
        ))}
      </g>
    </Art>
  );
}

/** Illustration de la carte d'une page. */
export function CardArt({ page }: { page: HomeCardPage }) {
  if (page === "voyage") return <VoyageArt />;
  if (page === "sizes") return <SizesArt />;
  return <AboutArt />;
}
