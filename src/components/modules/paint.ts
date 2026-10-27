/** Couleurs de dessin de la maquette (constantes du monde sombre). */
export const INK = {
  ivoire: "#ECE5D3",
  brume: "#959EB5",
  laiton: "#C2A36B",
  soleil: "#FFB547",
  nuit: "#060B18",
} as const;

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Courbe 6t⁵ − 15t⁴ + 10t³, t supposé déjà borné à [0, 1]. */
export function smooth(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Familles de secours, le temps de lire la police calculée du canvas. */
export const FALLBACK_FONT_FAMILY = "system-ui, sans-serif";

export interface TextStyle {
  /** Graisse, 400 par défaut. */
  weight?: number;
  /** Taille en px CSS, 12 par défaut. */
  size?: number;
  /** Couleur, ivoire par défaut. */
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

/** Petits outils de dessin partagés par les modules (équivalents de `txt` et `dot` dans la maquette). */
export interface Painter {
  readonly ctx: CanvasRenderingContext2D;
  /** Familles de police appliquées au texte : celles calculées pour le canvas (`var(--f-text)`). */
  family: string;
  /** Applique graisse et taille au contexte (utile avant `measureText`). */
  setFont(weight: number, size: number): void;
  text(value: string, x: number, y: number, style?: TextStyle): void;
  /** Disque plein. */
  dot(x: number, y: number, r: number, color: string): void;
}

export function createPainter(ctx: CanvasRenderingContext2D): Painter {
  const painter: Painter = {
    ctx,
    family: FALLBACK_FONT_FAMILY,
    setFont(weight, size) {
      ctx.font = `${weight} ${size}px ${painter.family}`;
    },
    text(value, x, y, style = {}) {
      painter.setFont(style.weight ?? 400, style.size ?? 12);
      ctx.fillStyle = style.color ?? INK.ivoire;
      ctx.textAlign = style.align ?? "left";
      ctx.textBaseline = style.baseline ?? "alphabetic";
      ctx.fillText(value, x, y);
    },
    dot(x, y, r, color) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
    },
  };
  return painter;
}
