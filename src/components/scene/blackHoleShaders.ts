import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { OUTPUT } from "./shaders";
import { STARFIELD_GLSL } from "./starfield";

/*
 * Shaders d'un trou noir de l'onglet « Tailles » (blackHole.ts). Le rectangle couvre le cône de la sphère tracée,
 * de rayon uQuadRs (en r_s) ; le fragment travaille dans le repère du trou noir, en r_s, à partir de la caméra
 * uCamLocal et de la rotation uViewToWorld, calculées en double précision côté TypeScript : jamais de différence de
 * deux positions de la scène dans le GLSL, où le float32 la rendrait fausse.
 */

/** Constante GLSL flottante (« 2.5 », « 3.0 ») : un entier ne se mêle pas aux flottants. */
const glslFloat = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

/**
 * Rectangle face caméra : le carré unité (PlaneGeometry(2, 2)) se pose dans le plan perpendiculaire à la ligne de
 * visée qui passe par le centre du trou noir, de demi-côté R / √(1 − (R/d)²) (R : rayon de la sphère tracée, d :
 * distance au centre, en unités de la scène). Il couvre alors exactement le cône de la sphère, et les directions
 * interpolées de ses sommets donnent celle de chaque pixel. Côtés tournés de sorte que la face avant regarde toujours
 * la caméra. Caméra dans la sphère, ou tout près (d ≤ 1,02 R) : le rectangle couvre tout l'écran et la direction de
 * chaque sommet se lit dans la projection (décalage de vue compris). Profondeur au milieu du volume de découpe : ni
 * le plan proche ni le plan lointain ne rognent le rectangle, seul ce qui est derrière la caméra disparaît.
 */
export const BLACK_HOLE_VERTEX = /* glsl */ `
uniform float uRadius;
uniform float uQuadRs;
varying vec3 vViewRay;
void main() {
  // Centre en espace vue : three calcule modelViewMatrix en double précision avant de l'envoyer.
  vec3 center = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float d = length(center);
  float sphere = uQuadRs * uRadius;
  if (d <= 1.02 * sphere) {
    vViewRay = vec3(
      (position.x + projectionMatrix[2][0]) / projectionMatrix[0][0],
      (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1],
      -1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
    return;
  }
  vec3 w = center / d;
  vec3 axis = abs(w.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  // u à droite, v en haut, vus de la caméra : la normale u × v = −w lui fait face.
  vec3 u = normalize(cross(w, axis));
  vec3 v = cross(u, w);
  float s = sphere / d;
  float halfSide = sphere / sqrt(1.0 - s * s);
  vec3 p = center + halfSide * (position.x * u + position.y * v);
  vViewRay = p;
  vec4 clip = projectionMatrix * vec4(p, 1.0);
  gl_Position = vec4(clip.xy, 0.0, clip.w);
}
`;

/**
 * Squelette analytique, en attendant le lancer de rayons : le ciel du fond, non dévié ; noir dans le cercle apparent
 * de l'ombre, de rayon asin(SHADOW_RADIUS_RS / |uCamLocal|) ; un anneau fin de la couleur uRingColor à son bord ; le
 * cercle de l'horizon (r_s), non lentillé, en uHorizonColor, dosé par uHorizonMark ; rien hors du cercle apparent de la
 * sphère tracée. Bords adoucis sur un px CSS (uPixelAngle). Sortie : vec4(couleur, uOpacity), puis tone mapping.
 */
export const BLACK_HOLE_FRAGMENT = /* glsl */ `
precision highp float;
${STARFIELD_GLSL}
uniform vec3 uCamLocal;
uniform mat3 uViewToWorld;
uniform float uQuadRs;
uniform float uOpacity;
uniform float uHorizonMark;
uniform vec3 uRingColor;
uniform vec3 uHorizonColor;
varying vec3 vViewRay;
const float SHADOW_RS = ${glslFloat(SHADOW_RADIUS_RS)};
void main() {
  vec3 dir = normalize(uViewToWorld * vViewRay);
  float dist = max(length(uCamLocal), 1e-6);
  vec3 toCenter = -uCamLocal / dist;
  // Angle du pixel au centre, précis aux petits angles (un trou noir de quelques pixels).
  float angle = atan(length(cross(dir, toCenter)), dot(dir, toCenter));
  if (dist > uQuadRs && angle > asin(uQuadRs / dist)) discard;
  float shadow = asin(min(SHADOW_RS / dist, 1.0));
  float horizon = asin(min(1.0 / dist, 1.0));
  float aa = uPixelAngle;
  float edge = angle - shadow;
  float ring = 1.0 - smoothstep(0.0, max(0.06 * shadow, 1.5 * aa), edge);
  vec3 color = (starfield(dir, uPixelAngle) + uRingColor * ring) * smoothstep(-aa, 0.0, edge);
  float mark = 1.0 - smoothstep(0.75 * aa, 1.75 * aa, abs(angle - horizon));
  color = mix(color, uHorizonColor, mark * uHorizonMark);
  gl_FragColor = vec4(color, uOpacity);
  ${OUTPUT}
}
`;
