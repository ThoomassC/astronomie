/**
 * Shaders de la scène. Les calculs se font en espace linéaire et sortent en HDR : les deux
 * chunks finaux appliquent le tone mapping du moteur (PBR Neutral) puis la conversion sRGB.
 * Le Soleil est à l'origine : la direction de la lumière se déduit de la position du fragment.
 */

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/**
 * Éclat affiché d'une planète non visitée (uBrightness, de 0 à 1), appliqué après le tone mapping et la conversion
 * sRGB : 0,35 donne 35 % de la valeur affichée. Partagé par sa surface, ses lunes, son atmosphère et ses anneaux.
 */
const BRIGHTNESS = /* glsl */ `gl_FragColor.rgb *= uBrightness;`;

/** Lumière du Soleil reçue par les astres (blanc chaud), sans atténuation avec la distance. */
const SUNLIGHT = /* glsl */ `const vec3 SUNLIGHT = vec3(1.0, 0.97, 0.92) * 1.35;`;

/** Bruit de valeur 3D (moyenne 0,5) : marbrure, détail fin, taches, jets de la couronne. */
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
uniform float uBrightness;
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
  ${BRIGHTNESS}
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
uniform float uBrightness;
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
  ${BRIGHTNESS}
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
uniform float uBrightness;
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
  ${BRIGHTNESS}
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

// ---------- Étoiles : surface (le Soleil, et les étoiles à comparer) ----------

/**
 * Exposition d'une étoile vue de près : l'œil s'adapte quand elle remplit la vue, la granulation reste lisible
 * sous le tone mapping. `radii` : distance de la caméra au centre de l'étoile, en rayons. Rapport f = tan(rayon apparent)
 * / tan(demi-champ vertical) : exposition pleine jusqu'à f = 0,3, 0,6 quand l'étoile déborde (f ≥ 1,2).
 */
const STAR_EXPOSURE_GLSL = /* glsl */ `
float starExposure(float radii) {
  float fill = projectionMatrix[1][1] / sqrt(max(radii * radii - 1.0, 1e-4));
  return 1.0 - 0.4 * smoothstep(0.3, 1.2, fill);
}
`;

/** Cellules de convection (diagramme de Voronoï 3D, « bruit de Worley ») et leur hachage. */
const STAR_CELLS_GLSL = /* glsl */ `
// Hachage de Dave Hoskins (« Hash without Sine », licence MIT) : trois valeurs dans [0, 1[ par cellule entière.
vec3 starHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
// Distances au point le plus proche (x) et au deuxième (y), et phase propre de la cellule la plus proche (z).
// Chaque point tourne dans sa cellule au rythme de boil (de 0 à 1, périodique) : les parois glissent, la granulation
// bouillonne ; recherche parmi les 27 cellules voisines. Variante allégée : points figés, aucun sinus par cellule, peu
// décalés (±0,3 au lieu de ±0,42) pour que la recherche parmi les 8 cellules les plus proches seulement, comme la
// supergranulation, reste presque exacte (2 % des seconds plus proches manqués, sans effet visible) : 3,4 fois moins
// de cellules visitées.
vec3 starCells(vec3 x, float boil) {
  vec3 cell = floor(x);
  vec3 f = x - cell;
  float d1 = 8.0;
  float d2 = 8.0;
  float own = 0.0;
#ifdef STAR_LITE
  vec3 first = step(0.5, f) - 1.0;
  for (int k = 0; k < 2; k++) {
    for (int j = 0; j < 2; j++) {
      for (int i = 0; i < 2; i++) {
        vec3 g = first + vec3(float(i), float(j), float(k));
        vec3 h = starHash(cell + g);
        vec3 r = g + 0.5 + 0.3 * (2.0 * h - 1.0) - f;
#else
  for (int k = -1; k <= 1; k++) {
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec3 g = vec3(float(i), float(j), float(k));
        vec3 h = starHash(cell + g);
        vec3 r = g + 0.5 + 0.42 * sin(6.2831853 * (boil + h)) - f;
#endif
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          own = h.x;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
  }
  return vec3(sqrt(d1), sqrt(d2), own);
}
#ifndef STAR_LITE
// Supergranulation : 8 cellules seulement (les plus proches du point), points peu décalés pour que la recherche
// reste presque exacte ; un réseau discret supporte ses rares erreurs.
vec3 starSuperCells(vec3 x, float boil) {
  vec3 cell = floor(x);
  vec3 f = x - cell;
  vec3 first = step(0.5, f) - 1.0;
  float d1 = 8.0;
  float d2 = 8.0;
  float own = 0.0;
  for (int k = 0; k < 2; k++) {
    for (int j = 0; j < 2; j++) {
      for (int i = 0; i < 2; i++) {
        vec3 g = first + vec3(float(i), float(j), float(k));
        vec3 h = starHash(cell + g);
        vec3 r = g + 0.5 + 0.3 * sin(6.2831853 * (boil + h)) - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          own = h.x;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
  }
  return vec3(sqrt(d1), sqrt(d2), own);
}
#endif
`;

export const STAR_SURFACE_VERTEX = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vExposure;
${STAR_EXPOSURE_GLSL}
void main() {
  // Repère de l'étoile : l'axe y local est son pôle de rotation.
  vLocal = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // Échelle uniforme : la matrice du modèle suffit à tourner la normale.
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec3 center = modelMatrix[3].xyz;
  vExposure = starExposure(length(cameraPosition - center) / length(world.xyz - center));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Photosphère d'une étoile, calculée en température : chaque détail écarte la température locale de celle du
 * centre du disque (rapport t), et la couleur suit la loi de Wien canal par canal, uColor · exp(−uWien (1/t − 1)) :
 * ce qui est plus froid est plus sombre et plus rouge (couloirs, taches, bord), ce qui est plus chaud plus clair et
 * plus jaune (cœur des granules, facules).
 * - Granulation : cellules de Worley animées (uGranulation par rayon), couloirs sombres et fins, détail fin au
 *   triple de la fréquence ; chaque niveau n'apparaît qu'au-delà de 1,5 px (fwidth) et garde la même moyenne,
 *   ce qui évite le scintillement de loin.
 * - Supergranulation (une cellule pour 6,5 granules) : modulation lente et réseau, dont les facules brillent vers
 *   le bord ; marbrure à grande échelle, visible de loin.
 * - Taches (STARSPOTS, placées par placeStarspots) : ombre, pénombre filamenteuse, plage de facules autour.
 * - Assombrissement centre-bord d'Eddington-Barbier : T⁴(μ) ∝ 1 − k + kμ (k = uLimbDarkening).
 * Le temps (uTime, en secondes affichées) fait tourner la surface (uSpinRate, rad/s, rotation rigide à la vitesse
 * de l'équateur) et bouillonner la convection, sur une période de BOIL_PERIOD secondes. Variante STAR_LITE
 * (écrans tactiles) : cellules figées, cherchées parmi 8 voisines au lieu de 27, ni détail fin ni réseau.
 */
export const STAR_SURFACE_FRAGMENT = /* glsl */ `
// Détail fin : près de 190 cellules par rayon, il faut la pleine précision (téléphones compris).
precision highp float;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uWien;
uniform float uGranulation;
uniform float uContrast;
uniform float uLimbDarkening;
uniform float uActivity;
uniform float uSpinRate;
#if STARSPOTS > 0
// Par tache : centre (unitaire, repère de l'étoile) et rayon ; part de l'ombre, rayon et éclat de la plage,
// cosinus du rayon de la calotte qui les contient (2 : tache éteinte).
uniform vec4 uSpotA[STARSPOTS];
uniform vec4 uSpotB[STARSPOTS];
#endif
varying vec3 vLocal;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vExposure;
${NOISE_GLSL}
${STAR_CELLS_GLSL}
const float TAU = 6.2831853;
// Période du bouillonnement affiché, en secondes.
const float BOIL_PERIOD = 90.0;
// Moyennes des motifs (mesurées), retranchées pour que l'éclat moyen ne bouge pas quand un niveau apparaît. Variante
// allégée : 0,196 sur 27 cellules, + 0,031 sur 8 cellules aux points moins décalés (même tirage, banc logiciel).
#ifdef STAR_LITE
const float GRANULE_MEAN = 0.227;
#else
const float GRANULE_MEAN = 0.171;
#endif
const float SUPER_MEAN = 0.719;
// Températures relatives de l'ombre et de la pénombre (Soleil : ≈ 3 900 K et 5 000 K pour 5 772 K).
const float UMBRA_T = 0.68;
const float PENUMBRA_T = 0.87;

void main() {
  vec3 q = normalize(vLocal);
  // Taille d'un pixel sur la sphère unité, en rayons : règle chaque niveau de détail (hors de tout branchement).
  float pixel = length(fwidth(q));
  float spin = TAU * fract(uTime * uSpinRate / TAU);
  float cs = cos(spin);
  float sn = sin(spin);
  // Repère qui tourne avec la surface (sens direct autour du pôle).
  vec3 p = vec3(cs * q.x - sn * q.z, q.y, sn * q.x + cs * q.z);
  float boil = fract(uTime / BOIL_PERIOD);
  float mu = clamp(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPos)), 0.0, 1.0);
  float heat = 0.0;

  // Granulation : visible dès 1,5 px par cellule, au complet à partir de 12 px.
  float cellPx = 1.0 / (uGranulation * pixel);
  float granulation = smoothstep(1.5, 3.5, cellPx) * (0.4 + 0.6 * smoothstep(4.0, 12.0, cellPx));
  float lane = 0.0;
  if (granulation > 0.0) {
    vec3 x = p * uGranulation;
    // Léger gauchissement de l'espace : parois courbes plutôt que polygones.
    x += 0.12 * sin(x.yzx * vec3(1.31, 1.27, 1.23) + vec3(1.7, 4.1, 2.9));
    vec3 c = starCells(x, boil);
    float aa = 0.9 / cellPx;
    float edge = c.y - c.x;
    // Couloirs plus larges aux jonctions ; flous de la taille d'un pixel, à noirceur totale conservée.
    float laneWidth = 0.05 * (0.7 + 1.6 * smoothstep(0.45, 0.9, c.x));
    lane = (1.0 - smoothstep(0.0, laneWidth + aa, edge)) * laneWidth / (laneWidth + aa);
    float inner = smoothstep(0.0, 0.55 + aa, edge);
    float body = (1.0 - 0.6 * c.x * c.x) * (0.25 + 0.75 * inner) * (0.8 + 0.2 * sin(TAU * (boil + c.z)));
    heat += granulation * uContrast * (mix(body, -1.1, lane) - GRANULE_MEAN);
#ifndef STAR_LITE
    float fine = smoothstep(1.5, 3.5, cellPx / 3.1);
    if (fine > 0.0) {
      vec3 drift = 0.6 * vec3(sin(TAU * boil), cos(TAU * boil), 0.0);
      heat += fine * uContrast * 0.7 * (vn(p * uGranulation * 3.1 + drift) - 0.5) * (1.0 - lane);
    }
#endif
  }

  // Marbrure à grande échelle : de loin, le disque garde du relief ; de près, la granulation prend le relais.
  float mottle = 0.65 * (vn(p * 3.4 + vec3(0.0, 0.3 * sin(TAU * boil), 0.0)) - 0.5);
  if (granulation < 1.0) {
    mottle += 0.35 * (1.0 - granulation) * (vn(p * 7.9 + vec3(3.1, 0.0, 0.3 * cos(TAU * boil))) - 0.5);
  }
  heat += 1.8 * uContrast * mottle;

  // Supergranulation et réseau (étoiles à granulation fine seulement).
  float network = 0.0;
#ifndef STAR_LITE
  float superFrequency = uGranulation / 6.5;
  float supergranulation = smoothstep(2.0, 5.0, 1.0 / (superFrequency * pixel)) * smoothstep(4.0, 8.0, superFrequency);
  if (supergranulation > 0.0) {
    vec3 c = starSuperCells(p * superFrequency + vec3(31.7, 0.0, 0.0), boil * 0.25);
    float aa = 0.9 * superFrequency * pixel;
    // Réseau morcelé : seules certaines cellules ont un bord brillant.
    network = supergranulation * (1.0 - smoothstep(0.0, 0.1 + aa, c.y - c.x)) * 0.1 / (0.1 + aa) * smoothstep(0.3, 0.7, c.z);
    heat += supergranulation * 0.27 * uContrast * (1.0 - c.x * c.x - SUPER_MEAN);
  }
#endif

  // Taches : ombre, pénombre filamenteuse, plage de facules autour du groupe.
  float umbra = 0.0;
  float penumbra = 0.0;
  float filament = 0.5;
  float plage = 0.0;
#if STARSPOTS > 0
  for (int i = 0; i < STARSPOTS; i++) {
    vec4 a = uSpotA[i];
    vec4 b = uSpotB[i];
    float c = dot(q, a.xyz);
    if (c < b.w) continue;
    // Corde ≈ angle au centre, en rayons.
    float d = sqrt(max(2.0 - 2.0 * c, 0.0));
    plage += b.z * exp(-d * d / (b.y * b.y));
    float r = a.w;
    if (d < r * 1.3 + pixel) {
      vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), a.xyz));
      vec3 north = cross(a.xyz, east);
      vec3 rel = q - a.xyz;
      vec2 dir = vec2(dot(rel, east), dot(rel, north)) / max(d, 1e-6);
      float seed = a.y * 53.1;
      float ragged = 0.6 * vn(vec3(dir * 3.1 + vec2(seed, 0.0), seed * 3.1)) + 0.4 * vn(vec3(dir * 7.3 + vec2(0.0, seed), seed * 1.7));
      float rr = d / (r * (0.85 + 0.3 * ragged));
      float aa = pixel / max(r, 1e-6);
      // Tache plus petite qu'un pixel : son assombrissement se dilue dans le pixel.
      float fade = min(1.0, r * r / (2.25 * pixel * pixel));
      float pen = (1.0 - smoothstep(1.0 - aa - 0.06, 1.0 + aa, rr)) * fade;
      if (pen > penumbra) {
        penumbra = pen;
        filament = vn(vec3(dir * 22.0 + vec2(seed * 7.0, 0.0), rr * 2.2 + seed * 13.0));
      }
      umbra = max(umbra, (1.0 - smoothstep(b.x - aa - 0.05, b.x + aa + 0.05, rr)) * fade);
    }
  }
#endif

  // Facules : réseau et plages, surtout vers le bord du disque.
  float limbFaculae = (1.0 - smoothstep(0.3, 0.95, mu)) * smoothstep(0.0, 0.1, mu);
  heat += 0.05 * ((0.3 + 0.7 * uActivity) * network * 0.8 + plage * (0.5 + 0.8 * network)) * (0.25 + 0.75 * limbFaculae);

  // Température relative : bord (Eddington-Barbier) × écarts locaux, remplacés dans les taches.
  float t = 1.0 + heat;
  t = mix(t, PENUMBRA_T + 0.2 * (filament - 0.5), penumbra);
  t = mix(t, UMBRA_T + 0.03 * (filament - 0.5), umbra);
  t *= pow(1.0 - uLimbDarkening + uLimbDarkening * mu, 0.25);
  gl_FragColor = vec4(vExposure * uColor * exp(-uWien * (1.0 / t - 1.0)), 1.0);
  ${OUTPUT}
}
`;

// ---------- Couronne, chromosphère et protubérances du Soleil ----------

export const CORONA_VERTEX = /* glsl */ `
uniform float uSize;
uniform float uSunRadius;
varying vec2 vOffset;
varying vec3 vCenter;
varying vec3 vDelta;
varying float vExposure;
${STAR_EXPOSURE_GLSL}
void main() {
  // Disque toujours face à la caméra, centré sur le Soleil.
  vOffset = position.xy;
  vec4 center = viewMatrix * modelMatrix * vec4(0., 0., 0., 1.);
  // Centre et décalage du point dans le plan du disque, en espace vue et en rayons du Soleil : le rayon de vue
  // s'en déduit sans soustraire deux grandeurs voisines (précis à tout zoom cosmique).
  vCenter = center.xyz / uSunRadius;
  vDelta = vec3(position.xy * uSize / uSunRadius, 0.0);
  vExposure = starExposure(length(vCenter));
  center.xy += position.xy * uSize;
  gl_Position = projectionMatrix * center;
}
`;

/**
 * Couronne, chromosphère et protubérances, le long du rayon de vue : b, distance du rayon au centre du Soleil (en
 * rayons), et n, direction du point du rayon le plus proche du centre, dans le repère du Soleil (uStarFrame) ; la
 * surface tourne autour de son pôle (uSpinRate). Tout ce qui dépasse du bord est ainsi attaché au Soleil.
 * - Couronne en 1/b³, jets (streamers) : bruit lent sur n, resserrés en hauteur ; ceinture équatoriale au minimum
 *   d'activité, tout autour au maximum (uActivity).
 * - Chromosphère : liseré rose (Hα) d'environ 0,008 rayon, hérissé de spicules quand un pixel descend sous
 *   0,004 rayon ; protubérances discrètes, plus nombreuses quand l'activité monte. Plus petit qu'un pixel, chaque
 *   détail s'élargit à éclat total conservé : rien ne scintille de loin.
 * Jets et sites des protubérances ne dépendent que de n : ils sont lus dans une carte cuite une fois (uField,
 * coronaField.ts), où la rotation n'est qu'un décalage en longitude, au lieu de trois bruits de valeur par pixel.
 * Variante CORONA_LITE (écrans tactiles) : ni spicules ni fibres, plus aucun bruit calculé par pixel.
 * L'éblouissement (uGlare) garde sa formule : discret de près, il s'élargit quand la caméra s'éloigne.
 */
export const CORONA_FRAGMENT = /* glsl */ `
uniform float uSize;
uniform float uSunRadius;
uniform float uGlare;
uniform float uTime;
uniform float uActivity;
uniform float uSpinRate;
uniform mat3 uStarFrame;
uniform sampler2D uField;
varying vec2 vOffset;
varying vec3 vCenter;
varying vec3 vDelta;
varying float vExposure;
${NOISE_GLSL}
// Raie Hα de l'hydrogène : le rose-rouge de la chromosphère et des protubérances.
const vec3 H_ALPHA = vec3(1.0, 0.16, 0.2);
const float CHROMOSPHERE = 0.008;
const float TAU = 6.2831853;
#ifndef CORONA_LITE
// La direction n dans le repère qui tourne avec la surface : turn tours autour du pôle, dans le sens direct.
vec3 spun(vec3 n, float turn) {
  float c = cos(TAU * turn);
  float s = sin(TAU * turn);
  return vec3(c * n.x - s * n.z, n.y, s * n.x + c * n.z);
}
#endif
void main() {
  float d = length(vOffset);
  // Éblouissement et fondu du bord du disque : distance dans le plan du disque, comme avant.
  float r = max(d * uSize / uSunRadius, 1.);
  float edge = smoothstep(1., .75, d);
  float glare = uGlare * pow(r, -1.7);

  // Rayon de vue : b = |C × Δ| / |C + Δ|, et direction du point le plus proche du centre, en espace vue.
  float centerRadii = length(vCenter);
  vec3 u = vCenter / centerRadii;
  float b = length(cross(u, vDelta)) / length(u + vDelta / centerRadii);
  float pixel = fwidth(b);
  float h = max(b - 1.0, 0.0);
  float bb = max(b, 1.0);

  // Jets : structure marquée près du disque, halo plus lisse au loin. Au-delà de 6 rayons, la couronne ne pèse
  // plus rien à côté de l'éblouissement : sa structure moyenne suffit (0,79 à 0,83 selon l'activité), sans direction
  // ni champ à lire, pour la plupart des pixels du halo.
  float structure = 0.81;
  vec3 limb = vec3(0.0);
  if (h < 7.0) {
    float ud = dot(u, vDelta);
    vec3 radial = vDelta * (1.0 + ud / centerRadii) - u * (ud + dot(vDelta, vDelta) / centerRadii) + u * 1e-6;
    vec3 n = normalize(uStarFrame * (transpose(mat3(viewMatrix)) * radial));
    // Rotation propre, en tours.
    float turn = fract(uTime * uSpinRate / TAU);
    // Jets (r) et sites des protubérances (g) de la direction n, surface tournée : longitude (atan) et distance au
    // pôle. Lue au niveau 0 (carte sans mipmap) : dans une branche, les dérivées implicites ne sont pas sûres.
    vec2 field = textureLod(uField, vec2(atan(n.z, n.x) / TAU + 0.5 + turn, acos(clamp(n.y, -1.0, 1.0)) / 3.1415927), 0.0).rg;
    float belt = mix(1.12 - smoothstep(0.15, 0.75, abs(n.y)), 1.0, uActivity);
    float rays = pow(clamp(field.r * 1.6 - 0.3, 0.0, 1.0), 1.4 + 1.6 * smoothstep(0.0, 2.5, h)) * belt;
    structure = mix(mix(0.3 + 1.9 * rays, 0.7 + 0.6 * rays, smoothstep(1.5, 6.0, h)), structure, smoothstep(5.0, 7.0, h));

    if (h < 0.2) {
      float layer = max(CHROMOSPHERE, pixel);
      float chromosphere = CHROMOSPHERE / layer * exp(-h / layer);
#ifndef CORONA_LITE
      float spicules = 1.0 - smoothstep(0.0015, 0.004, pixel);
      if (spicules > 0.0) {
        float s = vn(spun(n, turn) * 260.0 + vec3(0.0, uTime * 0.05, 0.0));
        float height = max(0.004 + 0.02 * s * s, pixel);
        chromosphere += spicules * 1.4 * s * CHROMOSPHERE / height * exp(-h / height);
      }
#endif
      float threshold = mix(0.8, 0.66, uActivity);
      float site = smoothstep(threshold, threshold + 0.1, field.g);
      float prominence = 0.0;
      if (site > 0.0) {
        float height = 0.03 + 0.07 * site;
#ifdef CORONA_LITE
        float fibers = 0.6;
#else
        float fibers = mix(0.6, vn(spun(n, turn) * 70.0 + vec3(0.0, h * 20.0, 0.0)), 1.0 - smoothstep(0.003, 0.008, pixel));
#endif
        prominence = site * exp(-h / (0.45 * height)) * (1.0 - smoothstep(height * 0.6, height * 1.4, h)) * fibers * 1.6;
        prominence *= min(1.0, 0.012 / max(pixel, 0.012));
      }
      limb = H_ALPHA * (1.2 * chromosphere + 0.8 * prominence);
    }
  }
  float corona = .55 / (bb * bb * bb) * structure * vExposure;
  vec3 color = vec3(1., .84, .62) * corona + vec3(1., .66, .38) * glare + limb;
  gl_FragColor = vec4(color * edge, 1.);
  ${OUTPUT}
}
`;

// ---------- Nuages de points : étoiles voisines, Soleil vu de loin, galaxie ----------

/**
 * Taille fixe à l'écran (px CSS × rapport de pixels, sans perspective) ; la couleur (attribut `color`,
 * linéaire, éclat compris) est déclarée par Three quand `vertexColors` est actif.
 */
export const POINT_CLOUD_VERTEX = /* glsl */ `
attribute float size;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
  vColor = color;
  gl_PointSize = size * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Point rond à bord doux : plein au cœur, il s'éteint sur la moitié extérieure du disque. Mélange additif,
 * sans tone mapping : les points se cumulent comme la lumière des étoiles ; uOpacity porte le fondu de la couche.
 * uGain multiplie la valeur affichée, après l'encodage sRGB, c'est-à-dire ce que le mélange additif cumule :
 * la galaxie l'abaisse quand elle rapetisse à l'écran, pour que ses points serrés ne partent pas au blanc.
 */
export const POINT_CLOUD_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform float uGain;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord * 2.0 - 1.0);
  if (d > 1.0) discard;
  float falloff = 1.0 - smoothstep(0.45, 1.0, d);
  gl_FragColor = vec4(vColor * falloff * uOpacity, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= uGain;
}
`;
