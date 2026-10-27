/**
 * Shaders de la maquette, tels quels. Ils écrivent leur couleur directement en espace
 * d'affichage : pas d'include `colorspace_fragment`, comme les ShaderMaterial de r128.
 */

const NOISE_GLSL = /* glsl */ `
float hs(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(mix(hs(i), hs(i + vec3(1, 0, 0)), f.x), mix(hs(i + vec3(0, 1, 0)), hs(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hs(i + vec3(0, 0, 1)), hs(i + vec3(1, 0, 1)), f.x), mix(hs(i + vec3(0, 1, 1)), hs(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
// Somme de 3 à 5 octaves, ramenée à l'amplitude de 5 octaves : les seuils de couleur restent valables.
float fb(vec3 p, int octaves) {
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    v += a * vn(p);
    p *= 2.03;
    a *= .5;
  }
  return v * .96875 / (1. - 2. * a);
}
`;

/** Surface du Soleil : granulation animée par deux bruits, assombrissement centre-bord. */
export const SUN_VERTEX = /* glsl */ `
varying vec3 vP;
varying vec3 vN;
void main() {
  vP = position;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
`;

export const SUN_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec3 vP;
varying vec3 vN;
${NOISE_GLSL}
void main() {
  vec3 p = normalize(vP) * 3.4;
  // 4 octaves pour la granulation, 3 pour le second bruit : moins de calcul par pixel.
  float n = fb(p + vec3(0., uTime * .05, uTime * .03), 4);
  float m = fb(p * 2.7 - vec3(uTime * .04), 3);
  float f = n * .62 + m * .38;
  vec3 c = mix(vec3(.93, .33, .05), vec3(1., .66, .2), smoothstep(.32, .6, f));
  c = mix(c, vec3(1., .93, .7), smoothstep(.6, .82, f));
  float mu = clamp(dot(vN, vec3(0., 0., 1.)), 0., 1.);
  c *= .5 + .5 * pow(mu, .5);
  gl_FragColor = vec4(c, 1.);
}
`;

/** Atmosphère : halo de bord (Fresnel), seulement du côté éclairé par le Soleil (à l'origine). */
export const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vW;
varying vec3 vWN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const ATMOSPHERE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying vec3 vW;
varying vec3 vWN;
void main() {
  vec3 V = normalize(cameraPosition - vW);
  vec3 S = normalize(-vW);
  float fr = pow(1. - max(dot(vWN, V), 0.), 2.6);
  float lit = smoothstep(-.25, .6, dot(vWN, S));
  gl_FragColor = vec4(uColor * fr * lit * 1.25, 1.);
}
`;
