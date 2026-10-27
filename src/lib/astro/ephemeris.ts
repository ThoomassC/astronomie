import { DAY_MS, J2000_JD, type Vec3 } from "@/lib/astro/constants";
import type { Planet } from "@/lib/astro/planets";

const D2R = Math.PI / 180;

/** Éléments orbitaux à une date, angles en radians. */
export interface OrbitalElements {
  /** Demi-grand axe, en UA. */
  a: number;
  e: number;
  inclination: number;
  /** Longitude du nœud ascendant Ω. */
  node: number;
  /** Argument du périhélie ω = ϖ − Ω. */
  argPerihelion: number;
  /** Anomalie moyenne M, ramenée dans [−π, π]. */
  meanAnomaly: number;
}

/** Jour julien d'un instant donné en millisecondes Unix (1970-01-01T00:00Z = 2440587,5). */
export function julianDate(ms: number): number {
  return ms / DAY_MS + 2440587.5;
}

/**
 * Éléments de la planète au jour julien `jd`, avec T = (jd − J2000) / 36525 siècles :
 * chaque élément vaut `elements[i] + rates[i] × T` (degrés convertis en radians).
 */
export function elementsAt(planet: Planet, jd: number): OrbitalElements {
  const t = (jd - J2000_JD) / 36525;
  const [a0, e0, i0, l0, w0, n0] = planet.elements;
  const [a1, e1, i1, l1, w1, n1] = planet.rates;
  const meanLongitude = l0 + l1 * t;
  const perihelion = w0 + w1 * t;
  const node = (n0 + n1 * t) * D2R;
  return {
    a: a0 + a1 * t,
    e: e0 + e1 * t,
    inclination: (i0 + i1 * t) * D2R,
    node,
    argPerihelion: perihelion * D2R - node,
    meanAnomaly: ((((meanLongitude - perihelion) % 360) + 540) % 360 - 180) * D2R,
  };
}

/** Anomalie excentrique E telle que E − e·sin E = M (Newton, précision < 1e-9 rad pour e < 0,3). */
export function solveKepler(meanAnomaly: number, e: number): number {
  let E = meanAnomaly + e * Math.sin(meanAnomaly);
  for (let i = 0; i < 12; i++) {
    const step = (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-13) break;
  }
  return E;
}

/**
 * Position héliocentrique écliptique J2000 (UA) pour une anomalie excentrique E :
 * x' = a(cos E − e), y' = a√(1−e²) sin E, puis rotations ω, i, Ω.
 */
export function positionAt(el: OrbitalElements, eccentricAnomaly: number): Vec3 {
  const xp = el.a * (Math.cos(eccentricAnomaly) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(eccentricAnomaly);
  const cw = Math.cos(el.argPerihelion), sw = Math.sin(el.argPerihelion);
  const cn = Math.cos(el.node), sn = Math.sin(el.node);
  const ci = Math.cos(el.inclination), si = Math.sin(el.inclination);
  return {
    x: (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    y: (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    z: sw * si * xp + cw * si * yp,
  };
}

/** Position héliocentrique écliptique J2000 de la planète au jour julien `jd`, en UA. */
export function heliocentric(planet: Planet, jd: number): Vec3 {
  const el = elementsAt(planet, jd);
  return positionAt(el, solveKepler(el.meanAnomaly, el.e));
}

/** Longitude écliptique d'un vecteur, en degrés dans [0, 360[. */
export function eclipticLongitudeDeg(v: Vec3): number {
  const deg = (Math.atan2(v.y, v.x) / D2R) % 360;
  const wrapped = deg < 0 ? deg + 360 : deg;
  // Un angle infinitésimalement négatif s'arrondit à 360 : on le ramène à 0.
  return wrapped >= 360 ? 0 : wrapped;
}

/** Distance euclidienne entre deux points (même unité que les entrées). */
export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
