import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
} from "three";
import { sceneFromGalactic } from "@/lib/astro/galactic";
import { ROTATION } from "@/lib/astro/orientation";
import { SUN, type Planet, type PlanetKey } from "@/lib/astro/planets";
import { sceneRadius } from "@/lib/astro/scale";
import { rawColor } from "./color";
import {
  createAtmosphereMaterial,
  createCoronaMaterial,
  createRingMaterial,
  createSkyMaterial,
  createSunMaterial,
  createSurfaceMaterial,
  type AtmosphereUniforms,
  type CoronaUniforms,
  type Lighting,
  type SkyUniforms,
  type SurfaceUniforms,
  type Uniform,
} from "./materials";
import { TAU, clamp, lerp } from "./math";
import { SATURN_RING } from "./textureSet";
import { uranusRingTexture } from "./textures";

/** Construction des objets Three de la scène. */

/** Couleur des traits d'instrument (orbites). */
export const BRASS_HEX = 0xc2a36b;
/** Nombre de segments d'une orbite. */
export const ORBIT_SEGMENTS = 360;
/** Mouvement moyen à 1 UA (constante de Gauss), en radians par jour. */
const MEAN_MOTION_RAD_PER_DAY = 0.0172021;

// ---------- Ciel : Voie lactée et étoiles ----------

const STAR_SPHERE_RADIUS = 2600;
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
      // Étoiles serrées dans le plan de la Galaxie, plus denses vers son centre (Sagittaire).
      const l = Math.random() < 0.5 ? Math.random() * 360 : Math.pow(Math.random() * 2 - 1, 3) * 120;
      const b = (Math.random() + Math.random() + Math.random() - 1.5) * 9;
      sceneFromGalactic(l, b, v);
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
    new PointsMaterial({
      size,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

export interface SkyBody {
  /** Recentré sur la caméra à chaque image. */
  group: Group;
  /** Sphère de la Voie lactée, orientée en coordonnées galactiques. */
  milkyWay: Mesh<SphereGeometry, ShaderMaterial>;
  uniforms: SkyUniforms;
}

/**
 * Oriente la sphère pour que ses UV lisent la carte galactique telle quelle (u = 0,5 − l/360°,
 * v = 0,5 − b/180°). Repère de SphereGeometry : u = 0,5 en +X, u = 0,25 en +Z, v = 1 en +Y.
 * D'où le centre galactique en +X, l = 90° en +Z et le pôle sud galactique en +Y (sud en haut).
 */
function orientMilkyWay(sphere: Mesh): void {
  const center = new Vector3();
  const south = new Vector3();
  const l90 = new Vector3();
  sceneFromGalactic(0, 0, center);
  sceneFromGalactic(0, -90, south);
  sceneFromGalactic(90, 0, l90);
  sphere.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(center, south, l90));
}

/** Ciel : la Voie lactée photographiée (lueur diffuse) sous des étoiles ponctuelles, nettes à tout grossissement. */
export function createSky(placeholder: Texture): SkyBody {
  // Carte de 256 × 128 lue presque à son plein niveau : les étoiles s'y fondent, la bande reste.
  const { material, uniforms } = createSkyMaterial(placeholder, 0.2, 1.1);
  const milkyWay = new Mesh(new SphereGeometry(STAR_SPHERE_RADIUS * 1.05, 64, 32), material);
  orientMilkyWay(milkyWay);
  // Dessinée après les astres opaques : la profondeur écarte les pixels qu'ils cachent.
  milkyWay.renderOrder = 1;
  const group = new Group();
  group.add(milkyWay, starLayer(2600, 1.25, false), starLayer(1800, 1.05, true), starLayer(160, 2.4, false));
  return { group, milkyWay, uniforms };
}

// ---------- Soleil ----------

/** Demi-côté du panneau de la couronne, en échelle compressée puis réelle. */
const CORONA_SIZE = [95, 30] as const;

export interface SunBody {
  mesh: Mesh<SphereGeometry, ShaderMaterial>;
  /** Uniforme du temps, partagé par la surface et la couronne. */
  time: Uniform<number>;
  corona: Mesh<RingGeometry, ShaderMaterial>;
  coronaUniforms: CoronaUniforms;
}

export function createSun(): SunBody {
  const time = { value: 0 };
  const { material, uniforms } = createCoronaMaterial(time, CORONA_SIZE[0], SUN.displayRadius);
  // Disque plutôt que carré : les coins, invisibles, ne coûtent plus rien. 256 secteurs pour les jets.
  const corona = new Mesh(new RingGeometry(0.01, 1, 256, 1), material);
  // Disque orienté dans le shader : sa sphère englobante ne dit rien de sa taille réelle.
  corona.frustumCulled = false;
  return {
    mesh: new Mesh(new SphereGeometry(SUN.displayRadius, 64, 40), createSunMaterial(time)),
    time,
    corona,
    coronaUniforms: uniforms,
  };
}

/** Taille du Soleil et de sa couronne pour une échelle donnée (0 compressée, 1 réelle). */
export function scaleSun(sun: SunBody, realScale: number): void {
  const shrink = lerp(1, 0.05, realScale);
  sun.mesh.scale.setScalar(shrink);
  sun.coronaUniforms.uSunRadius.value = SUN.displayRadius * shrink;
  sun.coronaUniforms.uSize.value = lerp(CORONA_SIZE[0], CORONA_SIZE[1], realScale);
}

// ---------- Planètes ----------

interface PlanetLook {
  lighting: Lighting;
  /** Exposant de Minnaert : 1 = Lambert, au-delà le bord s'assombrit. */
  minnaert: number;
  /** Rayon polaire / rayon équatorial (Jupiter et Saturne sont nettement aplaties). */
  polarRatio: number;
  /** Brume du bord du disque : couleur et intensité. */
  haze?: readonly [color: string, strength: number];
  /** Halo au-delà du bord : épaisseur (en rayons), couleur de jour, couleur du couchant, intensité. */
  atmosphere?: { thickness: number; day: string; twilight: string; strength: number };
}

const LOOKS: Record<PlanetKey, PlanetLook> = {
  mercury: { lighting: "airless", minnaert: 1, polarRatio: 1 },
  venus: {
    lighting: "venus",
    minnaert: 1,
    polarRatio: 1,
    haze: ["#FFE7BF", 0.3],
    atmosphere: { thickness: 0.05, day: "#FFDDA8", twilight: "#FF9446", strength: 1.1 },
  },
  earth: {
    lighting: "earth",
    minnaert: 1,
    polarRatio: 0.9966,
    haze: ["#5C9DFF", 0.5],
    atmosphere: { thickness: 0.028, day: "#4D8BFF", twilight: "#FF7438", strength: 1.6 },
  },
  mars: {
    lighting: "rocky",
    minnaert: 0.96,
    polarRatio: 0.9941,
    haze: ["#EBB592", 0.16],
    // Les couchers de soleil martiens sont bleus : la poussière diffuse le bleu vers l'avant.
    atmosphere: { thickness: 0.014, day: "#E8A07A", twilight: "#7AA2E8", strength: 0.7 },
  },
  jupiter: { lighting: "gas", minnaert: 1.08, polarRatio: 0.9351, haze: ["#DDB88E", 0.1] },
  saturn: { lighting: "gas", minnaert: 1.08, polarRatio: 0.902, haze: ["#E8D2A2", 0.1] },
  uranus: {
    lighting: "gas",
    minnaert: 0.98,
    polarRatio: 0.9771,
    haze: ["#BDF0F2", 0.25],
    atmosphere: { thickness: 0.03, day: "#A2E6EC", twilight: "#5E9EC4", strength: 0.8 },
  },
  neptune: {
    lighting: "gas",
    minnaert: 0.98,
    polarRatio: 0.9829,
    haze: ["#94ABFF", 0.25],
    atmosphere: { thickness: 0.03, day: "#7290FF", twilight: "#4458C4", strength: 0.8 },
  },
};

interface MoonSpec {
  radius: number;
  distance: number;
  /** Période en jours ; négative = rétrograde (Triton). */
  periodDays: number;
  color: string;
  /** Carte photographique (la Lune) ; sinon couleur unie. */
  textured?: true;
  /** Orbite dans le plan de l'équateur de la planète (sinon dans l'écliptique, comme la Lune). */
  equatorial?: true;
}

/** Lunes principales (tailles et distances de scène, périodes réelles). */
const MOONS: Partial<Record<PlanetKey, readonly MoonSpec[]>> = {
  earth: [{ radius: 0.28, distance: 2.4, periodDays: 27.32, color: "#BDB9B2", textured: true }],
  mars: [
    { radius: 0.07, distance: 1.3, periodDays: 0.319, color: "#8C7B6E", equatorial: true },
    { radius: 0.05, distance: 1.75, periodDays: 1.263, color: "#9C8C80", equatorial: true },
  ],
  jupiter: [
    { radius: 0.2, distance: 4.9, periodDays: 1.769, color: "#E8D27A", equatorial: true },
    { radius: 0.17, distance: 5.9, periodDays: 3.551, color: "#D9CDBA", equatorial: true },
    { radius: 0.27, distance: 7.2, periodDays: 7.155, color: "#A79B8C", equatorial: true },
    { radius: 0.25, distance: 8.6, periodDays: 16.689, color: "#7D7268", equatorial: true },
  ],
  neptune: [{ radius: 0.16, distance: 3.1, periodDays: -5.877, color: "#D6C9C2", equatorial: true }],
};

/** Anneaux d'Uranus, en rayons de la planète. */
const URANUS_RING = { inner: 1.6, outer: 2.05, opacity: 0.5 } as const;

export interface MoonBody {
  mesh: Mesh<SphereGeometry, ShaderMaterial>;
  surface: SurfaceUniforms;
  distance: number;
  periodDays: number;
  phase: number;
}

export interface PlanetBody {
  planet: Planet;
  /** Position orbitale et réduction en échelle réelle. */
  group: Group;
  /** Repère de l'axe de rotation (pôle UAI), orienté par le moteur. */
  tilt: Group;
  /** Surface, en rotation sur son axe. */
  mesh: Mesh<SphereGeometry, ShaderMaterial>;
  surface: SurfaceUniforms;
  atmosphere: AtmosphereUniforms | null;
  /** Vitesse de rotation affichée, en radians par seconde, négative pour une rotation rétrograde. */
  spin: number;
  /** Position de scène, mise à jour à chaque image. */
  position: Vector3;
  /** Couleur de l'astre, sans conversion (orbite mise en avant). */
  color: Color;
  moons: MoonBody[];
  orbit: Line<BufferGeometry, LineBasicMaterial>;
  orbitPositions: BufferAttribute;
}

/** Saturne : anneaux éclairés, ombrés par la planète (shader), texture et repère partagés avec la surface. */
function createSaturnRing(planet: Planet, surface: SurfaceUniforms, polarRatio: number): Mesh<RingGeometry, ShaderMaterial> {
  const radius = planet.displayRadius;
  const ring = new Mesh(
    new RingGeometry(radius * SATURN_RING.inner, radius * SATURN_RING.outer, 256, 1),
    createRingMaterial(surface, radius, polarRatio),
  );
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function createUranusRing(planet: Planet): Mesh<RingGeometry, MeshBasicMaterial> {
  const radius = planet.displayRadius;
  const geometry = new RingGeometry(radius * URANUS_RING.inner, radius * URANUS_RING.outer, 160, 1);
  // UV radiales : u suit la distance au centre, pour lire le profil de la texture.
  const uv = geometry.getAttribute("uv");
  const position = geometry.getAttribute("position");
  for (let i = 0; i < uv.count; i++) {
    const r = Math.hypot(position.getX(i), position.getY(i));
    uv.setXY(i, (r / radius - URANUS_RING.inner) / (URANUS_RING.outer - URANUS_RING.inner), 0.5);
  }
  const ring = new Mesh(
    geometry,
    new MeshBasicMaterial({
      map: new CanvasTexture(uranusRingTexture()),
      transparent: true,
      side: DoubleSide,
      forceSinglePass: true,
      depthWrite: false,
      opacity: URANUS_RING.opacity,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function createMoon(spec: MoonSpec, placeholder: Texture): MoonBody {
  const { material, uniforms } = createSurfaceMaterial(
    { lighting: "airless", minnaert: 1, baseColor: new Color(spec.color), haze: new Color(0, 0, 0), ringShadow: false },
    placeholder,
  );
  return {
    mesh: new Mesh(new SphereGeometry(spec.radius, 32, 24), material),
    surface: uniforms,
    distance: spec.distance,
    periodDays: spec.periodDays,
    phase: Math.random() * TAU,
  };
}

export function createPlanet(planet: Planet, placeholder: Texture): PlanetBody {
  const look = LOOKS[planet.key];
  const group = new Group();
  const tilt = new Group();
  group.add(tilt);

  const { material, uniforms: surface } = createSurfaceMaterial(
    {
      lighting: look.lighting,
      minnaert: look.minnaert,
      baseColor: new Color(planet.color),
      haze: look.haze ? new Color(look.haze[0]).multiplyScalar(look.haze[1]) : new Color(0, 0, 0),
      ringShadow: planet.key === "saturn",
    },
    placeholder,
  );
  const mesh = new Mesh(new SphereGeometry(planet.displayRadius, 64, 40), material);
  mesh.scale.y = look.polarRatio;
  tilt.add(mesh);

  let atmosphere: AtmosphereUniforms | null = null;
  if (look.atmosphere) {
    const { thickness, day, twilight, strength } = look.atmosphere;
    const shell = createAtmosphereMaterial({ thickness, day: new Color(day), twilight: new Color(twilight), strength });
    tilt.add(new Mesh(new SphereGeometry(planet.displayRadius * (1 + thickness), 48, 32), shell.material));
    atmosphere = shell.uniforms;
  }
  if (planet.key === "saturn") tilt.add(createSaturnRing(planet, surface, look.polarRatio));
  if (planet.key === "uranus") tilt.add(createUranusRing(planet));

  const specs = MOONS[planet.key] ?? [];
  const moons = specs.map((spec) => createMoon(spec, placeholder));
  specs.forEach((spec, i) => (spec.equatorial ? tilt : group).add(moons[i].mesh));

  const orbitPositions = new BufferAttribute(new Float32Array((ORBIT_SEGMENTS + 1) * 3), 3);
  const orbitGeometry = new BufferGeometry();
  orbitGeometry.setAttribute("position", orbitPositions);
  const orbit = new Line(
    orbitGeometry,
    new LineBasicMaterial({
      color: rawColor(BRASS_HEX),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  // Les orbites changent de rayon avec l'échelle : pas de test de visibilité sur une sphère figée.
  orbit.frustumCulled = false;

  return {
    planet,
    group,
    tilt,
    mesh,
    surface,
    atmosphere,
    spin: Math.sign(ROTATION[planet.key].w[1]) * clamp((0.25 * 24) / planet.rotationHours, 0.03, 0.6),
    position: new Vector3(),
    color: rawColor(planet.color),
    moons,
    orbit,
    orbitPositions,
  };
}

/** Lune texturée de la planète (la Lune de la Terre), s'il y en a une. */
export function texturedMoon(body: PlanetBody): MoonBody | null {
  const specs = MOONS[body.planet.key] ?? [];
  const index = specs.findIndex((spec) => spec.textured);
  return index >= 0 ? body.moons[index] : null;
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
      toneMapped: false,
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
