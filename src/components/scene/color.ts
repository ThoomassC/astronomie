import { Color, LinearSRGBColorSpace } from "three";

/**
 * Couleur prise telle quelle, sans conversion sRGB → linéaire. La maquette (Three r128,
 * sans gestion des couleurs) injectait les valeurs hexadécimales directement dans
 * l'éclairage et les shaders : on garde ces valeurs pour retrouver son rendu.
 */
export function rawColor(value: string | number): Color {
  return typeof value === "number"
    ? new Color().setHex(value, LinearSRGBColorSpace)
    : new Color().setStyle(value, LinearSRGBColorSpace);
}
