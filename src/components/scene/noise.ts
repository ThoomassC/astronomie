/** Hachage entier 3D avec graine, ramené dans [0, 1[. */
export function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Bruit de valeur 3D, interpolation lissée entre les huit coins de la cellule. */
export function valueNoise(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  let u = x - xi;
  let v = y - yi;
  let w = z - zi;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  w = w * w * (3 - 2 * w);
  const a = hash3(xi, yi, zi, seed);
  const b = hash3(xi + 1, yi, zi, seed);
  const c = hash3(xi, yi + 1, zi, seed);
  const d = hash3(xi + 1, yi + 1, zi, seed);
  const e = hash3(xi, yi, zi + 1, seed);
  const f = hash3(xi + 1, yi, zi + 1, seed);
  const g = hash3(xi, yi + 1, zi + 1, seed);
  const h = hash3(xi + 1, yi + 1, zi + 1, seed);
  const x1 = a + (b - a) * u;
  const x2 = c + (d - c) * u;
  const x3 = e + (f - e) * u;
  const x4 = g + (h - g) * u;
  const y1 = x1 + (x2 - x1) * v;
  const y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}

/** Somme de `octaves` bruits de fréquence croissante (×2,03), normalisée dans [0, 1]. */
export function fbm(x: number, y: number, z: number, octaves: number, seed: number): number {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    total += amplitude * valueNoise(x * frequency, y * frequency, z * frequency, seed + i * 31);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / norm;
}
