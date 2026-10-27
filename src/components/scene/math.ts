export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Transition d'Hermite entre `edge0` et `edge1` (les bornes peuvent être inversées). */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Facteur d'un lissage exponentiel indépendant de la cadence : 1 − e^(−taux·dt). */
export const easeFactor = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);
