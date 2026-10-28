/**
 * Shaders de la scène. Les calculs se font en espace linéaire et sortent en HDR : les deux
 * chunks finaux appliquent le tone mapping du moteur (PBR Neutral) puis la conversion sRGB.
 * Le Soleil est à l'origine : la direction de la lumière se déduit de la position du fragment.
 */

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** Lumière du Soleil reçue par les astres (blanc chaud), sans atténuation avec la distance. */
const SUNLIGHT = /* glsl */ `const vec3 SUNLIGHT = vec3(1.0, 0.97, 0.92) * 1.35;`;

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

/** Anneaux de Saturne, partagés par leur shader et par celui de l'ombre qu'ils portent sur la planète. */
const RING_GLSL = /* glsl */ `
// Profil de repli tant que la carte n'est pas arrivée (rayons en rayons équatoriaux) :
// anneau C, anneau B, division de Cassini, anneau A et division d'Encke.
float ringFallback(float r) {
  if (r < 1.239 || r > 2.269) return 0.0;
  if (r < 1.527) return 0.22;
  if (r < 1.951) return 0.82;
  if (r < 2.027) return 0.07;
  return abs(r - 2.217) < 0.006 ? 0.05 : 0.58;
}
// Couleur et opacité au rayon r : la carte photographique remplace peu à peu le profil de repli.
vec4 ringSample(sampler2D map, float photoMix, vec2 radii, float r) {
  float u = clamp((r - radii.x) / (radii.y - radii.x), 0.0, 1.0);
  return mix(vec4(0.58, 0.5, 0.38, ringFallback(r)), texture2D(map, vec2(u, 0.5)), photoMix);
}
`;

// ---------- Surfaces des planètes et des lunes ----------

export const SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // Inverse transposée : la normale reste juste sur un astre aplati (échelle non uniforme).
  vWorldNormal = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Variantes : LIGHTING_AIRLESS (Mercure, lunes), LIGHTING_VENUS (nuages épais), sinon loi de
 * Minnaert ; EARTH (nuit, nuages, océans) ; RING_SHADOW (ombre des anneaux sur Saturne).
 */
export const SURFACE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uMapMix;
uniform vec3 uBaseColor;
uniform vec3 uHazeColor;
uniform float uMinnaert;
#if defined(EARTH) || defined(RING_SHADOW)
uniform vec3 uPlanetPole;
#endif
#ifdef EARTH
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform sampler2D uSpecular;
uniform float uNightMix;
uniform float uCloudsMix;
uniform float uSpecularMix;
uniform float uCloudDrift;
#endif
#ifdef RING_SHADOW
uniform sampler2D uRingMap;
uniform float uRingMix;
uniform vec2 uRingRadii;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
${RING_GLSL}
#endif
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
${SUNLIGHT}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(-vWorldPos);
  float NdotL = dot(N, L);
  float mu0 = max(NdotL, 0.0);
  float mu = max(dot(N, V), 0.0);
  vec3 albedo = mix(uBaseColor, texture2D(uMap, vUv).rgb, uMapMix);

  float light;
#if defined(LIGHTING_AIRLESS)
  // Loi lunaire-lambertienne : sans air, le disque reste clair jusqu'au bord (pleine Lune plate).
  light = mix(mu0, 2.0 * mu0 / (mu0 + max(mu, 1e-3)), 0.6);
#elif defined(LIGHTING_VENUS)
  // Nuages épais : la lumière déborde un peu sur la face de nuit.
  light = pow(clamp((NdotL + 0.12) / 1.12, 0.0, 1.0), 1.2);
#else
  // Minnaert : assombrissement centre-bord des atmosphères (1 = Lambert).
  light = pow(mu0, uMinnaert) * pow(max(mu, 0.05), uMinnaert - 1.0);
#endif

  float shade = 1.0;
#ifdef RING_SHADOW
  // Le rayon vers le Soleil croise-t-il le plan des anneaux, entre leurs bords ?
  float facing = dot(L, uPlanetPole);
  if (abs(facing) > 1e-4) {
    float t = dot(uPlanetCenter - vWorldPos, uPlanetPole) / facing;
    if (t > 0.0) {
      float r = length(vWorldPos + L * t - uPlanetCenter) / uPlanetRadius;
      if (r > uRingRadii.x && r < uRingRadii.y) shade = 1.0 - 0.9 * ringSample(uRingMap, uRingMix, uRingRadii, r).a;
    }
  }
#endif

  vec3 sun = SUNLIGHT * shade;
  vec3 color = albedo * sun * light;

#ifdef EARTH
  // Près du terminateur, la lumière traverse plus d'air et rougit, sur une bande étroite.
  sun *= mix(vec3(1.0, 0.62, 0.42), vec3(1.0), smoothstep(0.0, 0.12, NdotL));
  // u croît vers l'est : retrancher la dérive fait avancer les nuages vers l'est (vents d'ouest).
  vec2 cloudUv = vec2(vUv.x - uCloudDrift, vUv.y);
  float cloud = texture2D(uClouds, cloudUv).r * uCloudsMix;
  // Ombre des nuages : la couche flotte au-dessus du sol, son ombre glisse à l'opposé du Soleil.
  vec3 eastRaw = cross(uPlanetPole, N);
  float cosLat = length(eastRaw);
  vec3 east = cosLat > 1e-4 ? eastRaw / cosLat : vec3(1.0, 0.0, 0.0);
  vec3 north = cross(N, east);
  vec2 slide = vec2(dot(L, east) / (6.2832 * max(cosLat, 0.2)), dot(L, north) / 3.1416) * (0.006 / max(NdotL, 0.3));
  float cloudShadow = texture2D(uClouds, cloudUv + slide).r * uCloudsMix;
  vec3 ground = albedo * sun * light * (1.0 - 0.5 * cloudShadow);
  // Reflet du Soleil sur les océans (Blinn-Phong et Fresnel), masqué par les nuages.
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float water = texture2D(uSpecular, vUv).r * uSpecularMix;
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  float glint = water * (1.0 - cloud) * mu0 * (pow(NdotH, 160.0) * 2.6 + pow(NdotH, 16.0) * 0.07) * (0.4 + fresnel);
  ground += sun * glint;
  color = mix(ground, sun * light * 0.92, cloud);
  // Lumières des villes sur la face de nuit, voilées par les nuages.
  float night = smoothstep(0.06, -0.14, NdotL);
  color += texture2D(uNight, vUv).rgb * uNightMix * night * (1.0 - 0.8 * cloud) * 1.6;
#endif

  // Brume au bord du disque, côté jour, et faible lueur de la face de nuit (lumière diffuse du ciel).
  color += uHazeColor * pow(1.0 - mu, 3.0) * smoothstep(-0.2, 0.4, NdotL) * shade;
  color += albedo * vec3(0.026, 0.03, 0.04);
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT}
}
`;

// ---------- Atmosphères ----------

export const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Halo d'atmosphère calculé le long du rayon de vue : brume oblique sur le disque, liseré
 * au-delà du bord qui s'éteint au sommet de la couche, couleur du couchant au terminateur,
 * et diffusion vers l'avant quand on regarde vers le Soleil.
 */
export const ATMOSPHERE_FRAGMENT = /* glsl */ `
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform float uThickness;
uniform vec3 uDayColor;
uniform vec3 uTwilightColor;
uniform float uStrength;
varying vec3 vWorldPos;
void main() {
  vec3 D = normalize(vWorldPos - cameraPosition);
  vec3 O = (cameraPosition - uPlanetCenter) / uPlanetRadius;
  float along = -dot(O, D);
  float closest = sqrt(max(dot(O, O) - along * along, 0.0));
  float top = 1.0 + uThickness;
  if (closest > top) discard;
  vec3 P;
  float glow;
  if (closest < 1.0) {
    // Le rayon touche la planète : brume vue en oblique, plus épaisse vers le bord.
    P = O + D * (along - sqrt(1.0 - closest * closest));
    float mu = max(dot(P, -D), 0.0);
    glow = (1.0 - exp(-0.035 / max(mu, 0.02))) * 0.6;
  } else {
    // Au-delà du bord : couche de plus en plus mince jusqu'au sommet.
    P = O + D * along;
    float h = (closest - 1.0) / uThickness;
    glow = exp(-3.0 * h) * (1.0 - h);
  }
  float sunHeight = dot(normalize(P), normalize(-uPlanetCenter));
  vec3 tint = mix(uTwilightColor, uDayColor, smoothstep(-0.04, 0.1, sunHeight));
  float lit = smoothstep(-0.1, 0.04, sunHeight);
  float forward = pow(max(dot(D, normalize(-uPlanetCenter)), 0.0), 6.0);
  gl_FragColor = vec4(tint * glow * lit * uStrength * (1.0 + 4.0 * forward), 1.0);
  ${OUTPUT}
}
`;

// ---------- Anneaux de Saturne ----------

export const RING_VERTEX = /* glsl */ `
uniform float uLocalRadius;
varying vec3 vWorldPos;
varying float vRadius;
void main() {
  // Distance au centre, en rayons de la planète (l'anneau est tracé dans son plan XY).
  vRadius = length(position.xy) / uLocalRadius;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const RING_FRAGMENT = /* glsl */ `
uniform sampler2D uRingMap;
uniform float uRingMix;
uniform vec2 uRingRadii;
uniform vec3 uPlanetCenter;
uniform vec3 uPlanetPole;
uniform float uPlanetRadius;
uniform float uPolarRatio;
varying vec3 vWorldPos;
varying float vRadius;
${SUNLIGHT}
${RING_GLSL}
void main() {
  vec4 ring = ringSample(uRingMap, uRingMix, uRingRadii, vRadius);
  float alpha = ring.a;
  if (alpha < 0.003) discard;
  vec3 L = normalize(-vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float sunSide = dot(uPlanetPole, L);
  float viewSide = dot(uPlanetPole, V);
  float mu0 = abs(sunSide);
  float mu = max(abs(viewSide), 0.03);
  // Vu en oblique, l'anneau paraît plus opaque.
  float tau = -log(max(1.0 - alpha, 0.03));
  float coverage = 1.0 - exp(-tau / mu);
  // Face éclairée : elle pâlit quand le Soleil rase le plan (équinoxe de Saturne).
  // Face à l'ombre : seule passe la lumière qui traverse ; les zones minces paraissent claires.
  float lit = sunSide * viewSide > 0.0 ? pow(mu0, 0.35) : 2.4 * alpha * (1.0 - alpha) * pow(mu0, 0.5);
  // Ombre de la planète aplatie : on étire l'axe polaire pour revenir à une sphère.
  vec3 q = vWorldPos - uPlanetCenter;
  float stretch = 1.0 / uPolarRatio - 1.0;
  vec3 qs = q + uPlanetPole * dot(q, uPlanetPole) * stretch;
  vec3 ls = normalize(L + uPlanetPole * dot(L, uPlanetPole) * stretch);
  float along = -dot(qs, ls);
  float closest = sqrt(max(dot(qs, qs) - along * along, 0.0)) / uPlanetRadius;
  float shadow = along > 0.0 ? smoothstep(0.985, 1.015, closest) : 1.0;
  gl_FragColor = vec4(ring.rgb * (SUNLIGHT * lit * shadow + 0.01), coverage);
  ${OUTPUT}
}
`;

// ---------- Ciel ----------

export const SKY_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Voie lactée : la sphère est orientée en coordonnées galactiques (voir createSky), ses UV
 * lisent donc directement la carte. Niveau de mipmap fixe, sans dérivées : pas de couture.
 */
export const SKY_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uMapMix;
uniform float uLod;
uniform float uIntensity;
uniform vec3 uBase;
varying vec2 vUv;
void main() {
  // Une étoile isolée s'éteint quand on floute davantage, la bande galactique non : le minimum
  // des deux niveaux efface les taches laissées par les étoiles brillantes de la carte.
  vec3 fine = textureLod(uMap, vUv, uLod).rgb;
  vec3 coarse = textureLod(uMap, vUv, uLod + 2.0).rgb;
  gl_FragColor = vec4(uBase + min(fine, coarse * 1.6) * uMapMix * uIntensity, 1.0);
  ${OUTPUT}
}
`;

// ---------- Soleil ----------

export const SUN_VERTEX = /* glsl */ `
varying vec3 vP;
varying vec3 vN;
void main() {
  vP = position;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
`;

/** Surface du Soleil : granulation animée par deux bruits, assombrissement et rougissement centre-bord. */
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
  vec3 c = mix(vec3(1., .36, .06), vec3(1., .68, .26), smoothstep(.32, .6, f));
  c = mix(c, vec3(1., .9, .72), smoothstep(.6, .82, f));
  float mu = clamp(dot(vN, vec3(0., 0., 1.)), 0., 1.);
  // Loi du Soleil visible : I(μ) = 1 − 0,6 (1 − μ), et le bord tire sur le rouge.
  c *= (.4 + .6 * mu) * mix(vec3(1., .55, .3), vec3(1.), mu);
  // Assez lumineux pour dominer la scène, pas au point que le tone mapping le blanchisse.
  gl_FragColor = vec4(c * 1.7, 1.);
  ${OUTPUT}
}
`;

export const CORONA_VERTEX = /* glsl */ `
uniform float uSize;
uniform float uTime;
varying vec2 vOffset;
varying float vRays;
${NOISE_GLSL}
void main() {
  // Disque toujours face à la caméra, centré sur le Soleil.
  vOffset = position.xy;
  // Jets de la couronne : bruit angulaire lent, calculé aux 256 secteurs du disque puis interpolé.
  vRays = vn(vec3(normalize(position.xy) * 4., uTime * .03));
  vec4 center = viewMatrix * modelMatrix * vec4(0., 0., 0., 1.);
  center.xy += position.xy * uSize;
  gl_Position = projectionMatrix * center;
}
`;

/**
 * Couronne et halo : décroissance radiale, jets lents modulés par un bruit angulaire.
 * L'éblouissement (uGlare) s'élargit quand la caméra s'éloigne : discret de près, il garde
 * de loin la présence du Soleil.
 */
export const CORONA_FRAGMENT = /* glsl */ `
uniform float uSize;
uniform float uSunRadius;
uniform float uGlare;
varying vec2 vOffset;
varying float vRays;
void main() {
  float d = length(vOffset);
  float r = max(d * uSize / uSunRadius, 1.);
  float edge = smoothstep(1., .75, d);
  float corona = .55 / (r * r * r) * (.7 + .6 * vRays);
  float glare = uGlare * pow(r, -1.7);
  vec3 color = vec3(1., .84, .62) * corona + vec3(1., .66, .38) * glare;
  gl_FragColor = vec4(color * edge, 1.);
  ${OUTPUT}
}
`;
