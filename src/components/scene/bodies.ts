import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Color,
  type Texture,
} from "three";
import { SUN, type Planet, type PlanetKey } from "@/lib/astro/planets";
import { sceneRadius } from "@/lib/astro/scale";
import { rawColor } from "./color";
import { DEG, TAU, clamp, lerp } from "./math";
import { ATMOSPHERE_FRAGMENT, ATMOSPHERE_VERTEX, SUN_FRAGMENT, SUN_VERTEX } from "./shaders";
import { glowTexture, ringTexture, type GradientStop } from "./textures";

/** Construction des objets Three de la scène, reprise de la maquette. */

/** Couleur des traits d'instrument (orbites). */
export const BRASS_HEX = 0xc2a36b;
/** Nombre de segments d'une orbite. */
export const ORBIT_SEGMENTS = 360;
/** Mouvement moyen à 1 UA (constante de Gauss), en radians par jour. */
const MEAN_MOTION_RAD_PER_DAY = 0.0172021;

// ---------- Étoiles et Voie lactée ----------

const STAR_SPHERE_RADIUS = 2600;
const MILKY_WAY_AXIS = new Vector3(1, 0, 0.3).normalize();
const STAR_TINTS = {
  warm: [1, 0.78, 0.6],
  cool: [0.72, 0.82, 1],
  white: [1, 0.97, 0.92],
} as const;

function starLayer(count: number, size: number, band: boolean): Points<BufferGeometry, PointsMaterial> {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const v = new Vector3();
  for (let i = 0; i < count; i++) {
    if (band) {
      // Bande de la Voie lactée : un anneau épaissi, incliné sur l'écliptique.
      const angle = Math.random() * TAU;
      const offset = (Math.random() + Math.random() + Math.random() - 1.5) * 0.2;
      v.set(Math.cos(angle), offset, Math.sin(angle)).normalize().applyAxisAngle(MILKY_WAY_AXIS, 1.05);
    } else {
      const u = Math.random() * 2 - 1;
      const angle = Math.random() * TAU;
      const s = Math.sqrt(1 - u * u);
      v.set(s * Math.cos(angle), u, s * Math.sin(angle));
    }
    v.multiplyScalar(STAR_SPHERE_RADIUS);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    const t = Math.random();
    const tint = t < 0.12 ? STAR_TINTS.warm : t < 0.32 ? STAR_TINTS.cool : STAR_TINTS.white;
    const brightness = (band ? 0.22 : 0.35) + Math.pow(Math.random(), 3) * (band ? 0.5 : 0.85);
    colors[i * 3] = tint[0] * brightness;
    colors[i * 3 + 1] = tint[1] * brightness;
    colors[i * 3 + 2] = tint[2] * brightness;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return new Points(
    geometry,
    new PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }),
  );
}

/** Ciel étoilé, recentré sur la caméra à chaque image. */
export function createStarfield(): Group {
  const sky = new Group();
  sky.add(starLayer(2600, 1.25, false), starLayer(2400, 1.05, true), starLayer(160, 2.4, false));
  return sky;
}

// ---------- Soleil ----------

const INNER_GLOW: readonly GradientStop[] = [
  [0, "rgba(255,214,140,1)"],
  [0.18, "rgba(255,170,70,.75)"],
  [0.42, "rgba(255,120,40,.18)"],
  [1, "rgba(255,90,20,0)"],
];
const OUTER_GLOW: readonly GradientStop[] = [
  [0, "rgba(255,170,80,.35)"],
  [0.3, "rgba(255,140,60,.08)"],
  [1, "rgba(255,120,40,0)"],
];

export interface SunBody {
  mesh: Mesh<SphereGeometry, ShaderMaterial>;
  /** Uniforme du temps du shader, typé. */
  time: { value: number };
  innerGlow: Sprite;
  outerGlow: Sprite;
}

function glowSprite(size: number, stops: readonly GradientStop[], opacity: number): Sprite {
  const material = new SpriteMaterial({
    map: new CanvasTexture(glowTexture(stops)),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity,
  });
  const sprite = new Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

export function createSun(): SunBody {
  const time = { value: 0 };
  const material = new ShaderMaterial({ uniforms: { uTime: time }, vertexShader: SUN_VERTEX, fragmentShader: SUN_FRAGMENT });
  return {
    mesh: new Mesh(new SphereGeometry(SUN.displayRadius, 64, 40), material),
    time,
    innerGlow: glowSprite(46, INNER_GLOW, 1),
    outerGlow: glowSprite(190, OUTER_GLOW, 0.9),
  };
}

// ---------- Planètes ----------

interface MoonSpec {
  radius: number;
  distance: number;
  /** Période en jours ; négative = rétrograde (Triton). */
  periodDays: number;
  color: string;
}

/** Lunes principales (tailles et distances de scène, périodes réelles). */
const MOONS: Partial<Record<PlanetKey, readonly MoonSpec[]>> = {
  earth: [{ radius: 0.28, distance: 2.4, periodDays: 27.32, color: "#BDB9B2" }],
  mars: [
    { radius: 0.07, distance: 1.3, periodDays: 0.319, color: "#8C7B6E" },
    { radius: 0.05, distance: 1.75, periodDays: 1.263, color: "#9C8C80" },
  ],
  jupiter: [
    { radius: 0.2, distance: 4.9, periodDays: 1.769, color: "#E8D27A" },
    { radius: 0.17, distance: 5.9, periodDays: 3.551, color: "#D9CDBA" },
    { radius: 0.27, distance: 7.2, periodDays: 7.155, color: "#A79B8C" },
    { radius: 0.25, distance: 8.6, periodDays: 16.689, color: "#7D7268" },
  ],
  neptune: [{ radius: 0.16, distance: 3.1, periodDays: -5.877, color: "#D6C9C2" }],
};

/** Couleur du halo d'atmosphère. */
const ATMOSPHERES: Partial<Record<PlanetKey, string>> = {
  venus: "#F5E2B5",
  earth: "#78B0FF",
  mars: "#E39A72",
  uranus: "#B4F0F4",
  neptune: "#7D97FF",
};

interface RingSpec {
  kind: "saturn" | "uranus";
  /** Rayons intérieur et extérieur, en rayons de la planète. */
  inner: number;
  outer: number;
  opacity: number;
}

const RINGS: Partial<Record<PlanetKey, RingSpec>> = {
  saturn: { kind: "saturn", inner: 1.24, outer: 2.27, opacity: 1 },
  uranus: { kind: "uranus", inner: 1.6, outer: 2.05, opacity: 0.5 },
};

export interface MoonBody {
  mesh: Mesh<SphereGeometry, MeshLambertMaterial>;
  distance: number;
  periodDays: number;
  phase: number;
}

export type SurfaceMaterial = MeshLambertMaterial | MeshPhongMaterial;

export interface PlanetBody {
  planet: Planet;
  /** Position orbitale et réduction en échelle réelle. */
  group: Group;
  /** Inclinaison de l'axe. */
  tilt: Group;
  /** Surface, en rotation sur son axe. */
  mesh: Mesh<SphereGeometry, SurfaceMaterial>;
  /** Vitesse de rotation affichée, en radians par seconde. */
  spin: number;
  /** Position de scène, mise à jour à chaque image. */
  position: Vector3;
  /** Couleur de l'astre, sans conversion (orbite mise en avant). */
  color: Color;
  moons: MoonBody[];
  clouds: Mesh<SphereGeometry, MeshLambertMaterial> | null;
  orbit: Line<BufferGeometry, LineBasicMaterial>;
  orbitPositions: BufferAttribute;
}

function createAtmosphere(planet: Planet, color: string): Mesh<SphereGeometry, ShaderMaterial> {
  const scale = planet.key === "mars" ? 1.025 : 1.06;
  const material = new ShaderMaterial({
    uniforms: { uColor: { value: rawColor(color) } },
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: ATMOSPHERE_FRAGMENT,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new Mesh(new SphereGeometry(planet.displayRadius * scale, 48, 32), material);
}

function createRing(planet: Planet, spec: RingSpec): Mesh<RingGeometry, MeshBasicMaterial> {
  const radius = planet.displayRadius;
  const geometry = new RingGeometry(radius * spec.inner, radius * spec.outer, 160, 1);
  // UV radiales : u suit la distance au centre, pour lire le profil de la texture.
  const uv = geometry.getAttribute("uv");
  const position = geometry.getAttribute("position");
  for (let i = 0; i < uv.count; i++) {
    const r = Math.hypot(position.getX(i), position.getY(i));
    uv.setXY(i, (r / radius - spec.inner) / (spec.outer - spec.inner), 0.5);
  }
  const material = new MeshBasicMaterial({
    map: new CanvasTexture(ringTexture(spec.kind)),
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    opacity: spec.opacity,
  });
  const ring = new Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function createMoon(spec: MoonSpec): MoonBody {
  const material = new MeshLambertMaterial({ color: rawColor(spec.color) });
  return {
    mesh: new Mesh(new SphereGeometry(spec.radius, 24, 16), material),
    distance: spec.distance,
    periodDays: spec.periodDays,
    phase: Math.random() * TAU,
  };
}

export function createPlanet(planet: Planet): PlanetBody {
  const group = new Group();
  const tilt = new Group();
  tilt.rotation.z = planet.tiltDeg * DEG;
  group.add(tilt);

  const color = rawColor(planet.color);
  const material: SurfaceMaterial =
    planet.key === "earth"
      ? new MeshPhongMaterial({ color, shininess: 14, specular: rawColor(0x1a2a3a) })
      : new MeshLambertMaterial({ color });
  const mesh = new Mesh(new SphereGeometry(planet.displayRadius, 64, 40), material);
  tilt.add(mesh);

  const atmosphere = ATMOSPHERES[planet.key];
  if (atmosphere) tilt.add(createAtmosphere(planet, atmosphere));
  const ring = RINGS[planet.key];
  if (ring) tilt.add(createRing(planet, ring));

  const moons = (MOONS[planet.key] ?? []).map(createMoon);
  for (const moon of moons) group.add(moon.mesh);

  const orbitPositions = new BufferAttribute(new Float32Array((ORBIT_SEGMENTS + 1) * 3), 3);
  const orbitGeometry = new BufferGeometry();
  orbitGeometry.setAttribute("position", orbitPositions);
  const orbit = new Line(
    orbitGeometry,
    new LineBasicMaterial({ color: rawColor(BRASS_HEX), transparent: true, opacity: 0.3, depthWrite: false }),
  );
  // Les orbites changent de rayon avec l'échelle : pas de test de visibilité sur une sphère figée.
  orbit.frustumCulled = false;

  return {
    planet,
    group,
    tilt,
    mesh,
    spin: clamp((0.25 * 24) / planet.rotationHours, 0.03, 0.6),
    position: new Vector3(),
    color,
    moons,
    clouds: null,
    orbit,
    orbitPositions,
  };
}

/** Couche de nuages de la Terre, légèrement au-dessus de la surface. */
export function createClouds(planet: Planet, map: Texture): Mesh<SphereGeometry, MeshLambertMaterial> {
  return new Mesh(
    new SphereGeometry(planet.displayRadius * 1.015, 64, 40),
    new MeshLambertMaterial({ map, transparent: true, depthWrite: false }),
  );
}

// ---------- Ceintures ----------

export interface BeltSpec {
  count: number;
  /** Demi-grands axes extrêmes, en UA. */
  inner: number;
  outer: number;
  size: number;
  color: number;
  opacity: number;
  /** Épaisseur relative de la ceinture. */
  spread: number;
}

export const ASTEROID_BELT: BeltSpec = {
  count: 2600,
  inner: 2.15,
  outer: 3.3,
  size: 1.15,
  color: 0xa89c88,
  opacity: 0.55,
  spread: 0.12,
};

export const KUIPER_BELT: BeltSpec = {
  count: 2200,
  inner: 30.5,
  outer: 50,
  size: 1.05,
  color: 0x7f93b5,
  opacity: 0.32,
  spread: 0.25,
};

export interface BeltBody {
  points: Points<BufferGeometry, PointsMaterial>;
  positions: Float32Array;
  attribute: BufferAttribute;
  /** Par corps, précalculés : angle à J2000 (rad), vitesse angulaire (rad/jour), hauteur relative. */
  startAngles: Float32Array;
  angularSpeeds: Float32Array;
  heights: Float32Array;
  /** Rayons de scène en échelle compressée et réelle : l'échelle courante les interpole. */
  compressedRadii: Float32Array;
  realRadii: Float32Array;
  /** Dernier état calculé, pour ne rien refaire quand ni le temps ni l'échelle ne bougent. */
  lastDays: number;
  lastScale: number;
}

export function createBelt(spec: BeltSpec): BeltBody {
  const startAngles = new Float32Array(spec.count);
  const angularSpeeds = new Float32Array(spec.count);
  const heights = new Float32Array(spec.count);
  const compressedRadii = new Float32Array(spec.count);
  const realRadii = new Float32Array(spec.count);
  for (let i = 0; i < spec.count; i++) {
    const a = lerp(spec.inner, spec.outer, Math.pow(Math.random(), 0.8));
    startAngles[i] = Math.random() * TAU;
    heights[i] = (Math.random() - 0.5) * spec.spread;
    // Mouvement képlérien : la vitesse angulaire décroît en a^−1,5.
    angularSpeeds[i] = MEAN_MOTION_RAD_PER_DAY / Math.pow(a, 1.5);
    compressedRadii[i] = sceneRadius(a, 0);
    realRadii[i] = sceneRadius(a, 1);
  }
  const positions = new Float32Array(spec.count * 3);
  const attribute = new BufferAttribute(positions, 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", attribute);
  const points = new Points(
    geometry,
    new PointsMaterial({
      size: spec.size,
      sizeAttenuation: false,
      color: rawColor(spec.color),
      transparent: true,
      opacity: spec.opacity,
      depthWrite: false,
    }),
  );
  points.frustumCulled = false;
  return {
    points,
    positions,
    attribute,
    startAngles,
    angularSpeeds,
    heights,
    compressedRadii,
    realRadii,
    lastDays: Number.NaN,
    lastScale: Number.NaN,
  };
}

/** Place chaque corps à la date et à l'échelle courantes ; ne fait rien si aucune des deux n'a changé. */
export function updateBelt(belt: BeltBody, daysSinceJ2000: number, realScale: number): void {
  if (daysSinceJ2000 === belt.lastDays && realScale === belt.lastScale) return;
  belt.lastDays = daysSinceJ2000;
  belt.lastScale = realScale;
  const { positions, startAngles, angularSpeeds, heights, compressedRadii, realRadii } = belt;
  for (let i = 0, j = 0; i < startAngles.length; i++, j += 3) {
    const angle = startAngles[i] + angularSpeeds[i] * daysSinceJ2000;
    const r = compressedRadii[i] + (realRadii[i] - compressedRadii[i]) * realScale;
    positions[j] = Math.cos(angle) * r;
    positions[j + 1] = heights[i] * r * 0.06;
    positions[j + 2] = -Math.sin(angle) * r;
  }
  belt.attribute.needsUpdate = true;
}
