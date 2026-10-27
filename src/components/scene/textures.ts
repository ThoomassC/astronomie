import type { PlanetKey } from "@/lib/astro/planets";
import { TAU, lerp, smoothstep } from "./math";
import { fbm, hash3 } from "./noise";

/**
 * Textures dessinées par le code (Canvas 2D), reprises de la maquette : cartes
 * équirectangulaires des planètes, nuages et Lune, halos du Soleil, anneaux.
 */

type Rgb = readonly [number, number, number];
/** Pixel en cours d'écriture : r, g, b, a de 0 à 255. */
type Pixel = [number, number, number, number];
/** Reçoit le point de la sphère unité (x, y, z), sa latitude et sa longitude (radians). */
type SpherePainter = (x: number, y: number, z: number, lat: number, lon: number, out: Pixel) => void;

export type GradientStop = readonly [offset: number, color: string];
export type TexturedPlanet = Exclude<PlanetKey, "earth">;

const rgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function put(out: Pixel, color: Rgb): void {
  out[0] = color[0];
  out[1] = color[1];
  out[2] = color[2];
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");
  return { canvas, ctx };
}

/** Peint une carte équirectangulaire pixel par pixel. */
function paintSphere(width: number, height: number, paint: SpherePainter): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(width, height);
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const pixel: Pixel = [0, 0, 0, 255];
  for (let j = 0; j < height; j++) {
    const lat = (0.5 - (j + 0.5) / height) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    for (let i = 0; i < width; i++) {
      const lon = ((i + 0.5) / width) * TAU - Math.PI;
      pixel[3] = 255;
      paint(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), lat, lon, pixel);
      const o = (j * width + i) * 4;
      data[o] = pixel[0];
      data[o + 1] = pixel[1];
      data[o + 2] = pixel[2];
      data[o + 3] = pixel[3];
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

const MERCURY = { dark: rgb("#5E5853"), light: rgb("#CFC6BA"), ray: rgb("#E4DCD0"), crater: rgb("#4A4541") };
const VENUS = { low: rgb("#C9A465"), high: rgb("#F4E5BE") };
const MARS = {
  dust: rgb("#D9844F"),
  rust: rgb("#B4502C"),
  dark: rgb("#6E2F1C"),
  bright: rgb("#E9A272"),
  ice: rgb("#F4EEE8"),
};
const JUPITER = {
  belt: rgb("#A26E49"),
  zone: rgb("#EFE2C8"),
  orange: rgb("#D99A5E"),
  pole: rgb("#9A8D80"),
  spot: rgb("#C35A3A"),
};
const SATURN = { belt: rgb("#C29A5E"), zone: rgb("#F2E3BC"), pole: rgb("#A8A27A") };
const URANUS = { low: rgb("#86C9D1"), high: rgb("#B9E8EA") };
const NEPTUNE = { deep: rgb("#2F4CC0"), light: rgb("#5D82EA"), cloud: rgb("#E6EEFF"), spot: rgb("#1B2C80") };
const MOON = { dark: rgb("#55565A"), light: rgb("#C4C1BB") };

const PLANET_PAINTERS: Record<TexturedPlanet, () => HTMLCanvasElement> = {
  mercury: () =>
    paintSphere(256, 128, (x, y, z, lat, lon, out) => {
      const n = fbm(x * 3, y * 3, z * 3, 5, 3);
      const k = fbm(x * 11, y * 11, z * 11, 3, 9);
      let c = mix(MERCURY.dark, MERCURY.light, n);
      if (k > 0.62) c = mix(c, MERCURY.ray, smoothstep(0.62, 0.7, k) * 0.6);
      if (k < 0.3) c = mix(c, MERCURY.crater, 0.4);
      put(out, c);
    }),
  venus: () =>
    paintSphere(256, 128, (x, y, z, lat, lon, out) => {
      const n = fbm(x * 2.2, y * 2.2, z * 2.2, 5, 4);
      const t = 0.5 + 0.5 * Math.sin(lat * 7 + n * 5);
      put(out, mix(VENUS.low, VENUS.high, t * 0.6 + n * 0.4));
    }),
  mars: () =>
    paintSphere(256, 128, (x, y, z, lat, lon, out) => {
      const n = fbm(x * 2.6, y * 2.6, z * 2.6, 5, 5);
      const m = fbm(x * 9, y * 9, z * 9, 3, 2);
      let c = mix(MARS.dust, MARS.rust, smoothstep(0.42, 0.58, n));
      c = mix(c, MARS.dark, smoothstep(0.56, 0.7, n) * 0.85);
      c = mix(c, MARS.bright, smoothstep(0.6, 0.8, m) * 0.25);
      // Calottes polaires, au bord irrégulier.
      if (Math.abs(lat) > 1.32) c = mix(c, MARS.ice, smoothstep(1.32, 1.42, Math.abs(lat) + (n - 0.5) * 0.2));
      put(out, c);
    }),
  jupiter: () =>
    paintSphere(512, 256, (x, y, z, lat, lon, out) => {
      const turbulence = fbm(x * 3, y * 9, z * 3, 4, 6) - 0.5;
      const b = lat + turbulence * 0.09;
      const t1 = 0.5 + 0.5 * Math.sin(b * 14.5);
      const t2 = 0.5 + 0.5 * Math.sin(b * 31 + 1.3);
      let c = mix(JUPITER.belt, JUPITER.zone, t1 * 0.75 + t2 * 0.25);
      c = mix(c, JUPITER.orange, smoothstep(0.6, 0.9, t2) * 0.35 * (Math.abs(lat) < 0.6 ? 1 : 0.4));
      if (Math.abs(lat) > 1.1) c = mix(c, JUPITER.pole, smoothstep(1.1, 1.4, Math.abs(lat)) * 0.6);
      // Grande Tache rouge.
      const dl = (lon - 0.7) / 0.3;
      const dt = (lat + 0.38) / 0.1;
      const spot = dl * dl + dt * dt;
      if (spot < 1.6) c = mix(c, JUPITER.spot, smoothstep(1.6, 0.2, spot) * 0.9);
      put(out, c);
    }),
  saturn: () =>
    paintSphere(512, 256, (x, y, z, lat, lon, out) => {
      const turbulence = fbm(x * 3, y * 10, z * 3, 3, 8) - 0.5;
      const b = lat + turbulence * 0.03;
      const t = 0.5 + 0.5 * Math.sin(b * 12);
      const t2 = 0.5 + 0.5 * Math.sin(b * 37);
      let c = mix(SATURN.belt, SATURN.zone, t * 0.7 + t2 * 0.3);
      if (Math.abs(lat) > 1.05) c = mix(c, SATURN.pole, smoothstep(1.05, 1.45, Math.abs(lat)) * 0.5);
      put(out, c);
    }),
  uranus: () =>
    paintSphere(256, 128, (x, y, z, lat, lon, out) => {
      const t = 0.5 + 0.5 * Math.sin(lat * 9 + fbm(x * 2, y * 6, z * 2, 3, 12) * 2);
      put(out, mix(URANUS.low, URANUS.high, t * 0.5 + 0.25));
    }),
  neptune: () =>
    paintSphere(256, 128, (x, y, z, lat, lon, out) => {
      const n = fbm(x * 2.5, y * 7, z * 2.5, 4, 14);
      const t = 0.5 + 0.5 * Math.sin(lat * 8 + n * 3);
      let c = mix(NEPTUNE.deep, NEPTUNE.light, t);
      if (n > 0.66) c = mix(c, NEPTUNE.cloud, smoothstep(0.66, 0.78, n) * 0.7);
      // Grande Tache sombre.
      const dl = (lon + 1.1) / 0.28;
      const dt = (lat + 0.38) / 0.1;
      if (dl * dl + dt * dt < 1) c = mix(c, NEPTUNE.spot, 0.8);
      put(out, c);
    }),
};

export function planetTexture(key: TexturedPlanet): HTMLCanvasElement {
  return PLANET_PAINTERS[key]();
}

export function moonTexture(): HTMLCanvasElement {
  return paintSphere(128, 64, (x, y, z, lat, lon, out) => {
    put(out, mix(MOON.dark, MOON.light, smoothstep(0.3, 0.7, fbm(x * 2.5, y * 2.5, z * 2.5, 5, 21))));
  });
}

/** Nuages terrestres : blanc, opacité portée par le bruit. */
export function cloudTexture(): HTMLCanvasElement {
  return paintSphere(512, 256, (x, y, z, lat, lon, out) => {
    const n = fbm(x * 3, y * 4.2, z * 3, 5, 41);
    out[0] = 255;
    out[1] = 255;
    out[2] = 255;
    out[3] = 255 * smoothstep(0.5, 0.74, n) * 0.9;
  });
}

/** Contours simplifiés des continents, en paires (longitude, latitude). */
const LANDS: readonly (readonly number[])[] = [
  [
    -165, 65, -150, 71, -125, 70, -95, 73, -80, 68, -75, 62, -62, 58, -56, 52, -66, 44, -71, 41, -76, 35, -81, 31, -80, 25,
    -83, 29, -90, 30, -97, 27, -97, 22, -92, 18, -87, 21, -83, 15, -78, 8, -80, 7, -86, 12, -92, 15, -105, 20, -110, 23,
    -115, 30, -118, 34, -124, 40, -124, 48, -133, 56, -150, 60, -160, 58, -165, 62,
  ],
  [-55, 60, -43, 60, -22, 70, -18, 80, -35, 83, -60, 82, -72, 78, -60, 70],
  [
    -80, 8, -72, 12, -62, 10, -50, 0, -35, -5, -38, -14, -41, -22, -48, -28, -58, -38, -65, -42, -68, -52, -74, -52, -73,
    -40, -71, -30, -70, -18, -76, -14, -81, -6, -80, 0,
  ],
  [
    -10, 36, -9, 43, -2, 44, -4, 48, 2, 51, 8, 54, 10, 58, 5, 62, 14, 67, 25, 71, 40, 68, 60, 70, 80, 73, 100, 77, 120, 73,
    140, 72, 160, 70, 180, 68, 180, 64, 170, 60, 160, 55, 142, 52, 140, 45, 130, 42, 126, 38, 122, 31, 121, 25, 110, 20,
    106, 10, 104, 1, 100, 7, 98, 16, 92, 22, 88, 22, 80, 15, 77, 8, 72, 20, 67, 25, 58, 25, 57, 20, 52, 16, 45, 13, 43, 15,
    35, 28, 32, 31, 35, 36, 28, 37, 26, 40, 22, 37, 16, 38, 18, 40, 12, 44, 8, 44, 3, 43, 0, 39, -6, 37,
  ],
  [
    -17, 21, -16, 12, -10, 6, -5, 5, 5, 6, 9, 4, 10, -2, 12, -6, 13, -12, 12, -18, 15, -27, 18, -34, 20, -35, 25, -34, 30,
    -31, 33, -26, 35, -20, 40, -15, 40, -10, 39, -5, 42, 0, 48, 5, 51, 12, 44, 11, 38, 18, 35, 25, 33, 31, 25, 32, 20, 31,
    11, 33, 10, 37, 3, 37, -6, 36, -10, 30, -13, 27,
  ],
  [
    113, -22, 115, -34, 123, -34, 131, -31, 138, -35, 141, -38, 147, -38, 150, -37, 153, -28, 153, -25, 146, -19, 142, -11,
    136, -12, 136, -15, 130, -12, 125, -15, 120, -20,
  ],
  [-5, 50, 2, 51, 0, 58, -6, 58],
  [130, 31, 136, 34, 141, 41, 142, 45, 140, 40, 135, 35],
  [95, 5, 106, -6, 103, -5],
  [109, -2, 118, 1, 119, -4, 110, -4],
  [131, -1, 150, -6, 143, -9],
  [44, -25, 50, -15, 48, -13],
  [167, -46, 174, -41, 178, -38, 172, -35],
  [-24, 64, -14, 66, -16, 63],
  [-85, 22, -74, 20, -78, 22],
];

/** Teintes des terres selon la latitude : glaces, toundra, forêts, déserts, tropiques. */
const LAND_BANDS: readonly (readonly [lat: number, color: string])[] = [
  [90, "#f2f4f5"],
  [72, "#9aa08d"],
  [58, "#3f5f34"],
  [42, "#6f7a45"],
  [28, "#c9a86c"],
  [16, "#b89a62"],
  [6, "#2f6a2c"],
  [-8, "#2e6a2c"],
  [-22, "#a98f5a"],
  [-34, "#7d8450"],
  [-50, "#4c6a3c"],
  [-64, "#e9eef0"],
  [-90, "#f5f7f8"],
];

/** Carte de la Terre : océans, continents par bandes de latitude, glaces, relief bruité. */
export function earthTexture(): HTMLCanvasElement {
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = createCanvas(width, height);
  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  const sea = ctx.createLinearGradient(0, 0, 0, height);
  sea.addColorStop(0, "#1d3f66");
  sea.addColorStop(0.5, "#123f7a");
  sea.addColorStop(1, "#1d3f66");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, width, height);

  const land = ctx.createLinearGradient(0, 0, 0, height);
  for (const [lat, color] of LAND_BANDS) land.addColorStop((90 - lat) / 180, color);
  ctx.fillStyle = land;
  for (const outline of LANDS) {
    ctx.beginPath();
    for (let i = 0; i < outline.length; i += 2) {
      const x = toX(outline[i]);
      const y = toY(outline[i + 1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#eef2f4";
  ctx.fillRect(0, toY(-70), width, height - toY(-70));
  ctx.fillStyle = "rgba(238,242,244,.75)";
  ctx.fillRect(0, 0, width, toY(80));

  const relief = paintSphere(256, 128, (x, y, z, lat, lon, out) => {
    const v = fbm(x * 6, y * 6, z * 6, 4, 77) * 255;
    out[0] = v;
    out[1] = v;
    out[2] = v;
  });
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(relief, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  return canvas;
}

/** Halo radial (Soleil). */
export function glowTexture(stops: readonly GradientStop[]): HTMLCanvasElement {
  const size = 256;
  const { canvas, ctx } = createCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Profil radial des anneaux (u = 0 au bord intérieur, 1 au bord extérieur). */
export function ringTexture(kind: "saturn" | "uranus"): HTMLCanvasElement {
  const width = 1024;
  const { canvas, ctx } = createCanvas(width, 4);
  for (let i = 0; i < width; i++) {
    const u = i / (width - 1);
    let alpha: number;
    let color: string;
    if (kind === "saturn") {
      // Rayon en rayons de Saturne : anneau C, anneau B, division de Cassini, anneau A et division d'Encke.
      const r = 1.24 + u * (2.27 - 1.24);
      if (r < 1.53) alpha = 0.22 + 0.1 * Math.sin(r * 90);
      else if (r < 1.95) alpha = 0.8 + 0.12 * Math.sin(r * 140);
      else if (r < 2.03) alpha = 0.06;
      else if (r > 2.205 && r < 2.218) alpha = 0.05;
      else alpha = 0.58 + 0.08 * Math.sin(r * 120);
      alpha *= 0.85 + 0.15 * hash3(i, 0, 0, 5);
      color = r < 1.53 ? "150,135,112" : r < 1.95 ? "232,214,176" : "210,192,158";
    } else {
      // Uranus : quelques anneaux fins et sombres.
      alpha = (u > 0.1 && u < 0.14) || (u > 0.55 && u < 0.58) || u > 0.93 ? 0.55 : 0.04;
      color = "200,225,230";
    }
    ctx.fillStyle = `rgba(${color},${alpha.toFixed(3)})`;
    ctx.fillRect(i, 0, 1, 4);
  }
  return canvas;
}
