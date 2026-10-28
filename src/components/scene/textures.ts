/** Profil radial des anneaux d'Uranus (u = 0 au bord intérieur, 1 au bord extérieur) : quelques anneaux fins et sombres. */
export function uranusRingTexture(): HTMLCanvasElement {
  const width = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");
  for (let i = 0; i < width; i++) {
    const u = i / (width - 1);
    const alpha = (u > 0.1 && u < 0.14) || (u > 0.55 && u < 0.58) || u > 0.93 ? 0.55 : 0.04;
    ctx.fillStyle = `rgba(200,225,230,${alpha})`;
    ctx.fillRect(i, 0, 1, 4);
  }
  return canvas;
}
