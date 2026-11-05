import {
  BLACKBODY_FIT,
  BLACKBODY_LIMIT_SHIFT,
  DISK_PEAK_SHAPE,
  START_IMPACT_RATIO,
} from "@/lib/astro/photonGeodesic";
import { ISCO_RS, SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { NOISE_GLSL, OUTPUT } from "./shaders";
import { STARFIELD_GLSL } from "./starfield";

/*
 * Shaders d'un trou noir de l'onglet « Tailles » (blackHole.ts). Le rectangle couvre le cône de la sphère tracée,
 * de rayon uQuadRs (en r_s) ; le fragment travaille dans le repère du trou noir, en r_s, à partir de la caméra
 * uCamLocal et de la rotation uViewToWorld, calculées en double précision côté TypeScript : jamais de différence de
 * deux positions de la scène dans le GLSL, où le float32 la rendrait fausse.
 *
 * Le fragment suit pas à pas le modèle exécutable src/lib/astro/photonGeodesic.ts (startRay, traceRay, diskRedshift,
 * flowRedshift, diskTemperatureRatio, blackbodyColor), sous les mêmes noms quand c'est possible : toute modification
 * se fait des deux côtés. Pas, série de champ faible et ajustement du corps noir viennent de lui.
 */

/** Constante GLSL flottante (« 2.5 », « 3.0 ») : un entier ne se mêle pas aux flottants. */
const glslFloat = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

/** vecN GLSL de nombres TypeScript. */
const glslVec = (values: readonly number[]) => `vec${values.length}(${values.map(glslFloat).join(", ")})`;

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
 * Lancer de rayons dans la métrique de Schwarzschild, r_s = 1, repère du trou noir.
 *
 * - Départ (startRay) : direction mesurée par la caméra immobile, vitesse affine (composante transverse divisée par
 *   √(1 − 1/D)), saut en ligne droite jusqu'à la sphère max(R_q, 3 b) en gardant exactement b et l'énergie.
 * - Tracé (traceRay) : Verlet sur a = −1,5 h² x / |x|⁵, pas clamp(BH_STEP_FACTOR r, BH_MIN_STEP, BH_MAX_STEP) dans la
 *   sphère tracée, BH_FAR_STEP_FACTOR r au-delà ; arrêt dès l'horizon franchi (r < 1), le rayon sorti en s'éloignant,
 *   le disque opaque, ou au dernier pas (inachevé : sans ciel, émission gardée, c'est l'anneau de photons).
 * - Disque mince : traversées du plan (BH_MAX_CROSSINGS au plus) ; température de Shakura et Sunyaev, couleur de
 *   corps noir à g T, éclat (g T)⁴, g exact par le moment cinétique conservé du rayon ; opacité 1 − e^(−τ/μ), τ qui
 *   s'efface au bord extérieur ; turbulence en spirales logarithmiques, advectée à la vitesse képlérienne par deux
 *   couches fondues l'une dans l'autre (l'enroulement reste borné, rien ne se répète), détail effacé sous deux pixels.
 * - Gaz chaud : émission j g³ dλ le long des pas (paramètre affine), couleur de corps noir au g moyen, sursauts lents.
 * - Jet : faisceau fin le long de l'axe, intégré analytiquement le long de la visée (nœuds qui filent, évasement léger,
 *   contre-jet affaibli et caché derrière l'ombre) ; il peut déborder du cœur tracé, dans un rectangle agrandi (uQuadRs)
 *   où il s'ajoute au fond. Lueur et son anneau de photons : fonction de b, hors de l'ombre seulement.
 * - Bord de l'ombre et anneau de photons : cercle exact de Synge. Dans une couronne fine autour de lui (d'un demi-pixel
 *   dedans à RING_BAND pixels dehors), le pixel trace EDGE_SAMPLES rayons répartis sur sa largeur radiale ; la part de
 *   chaque tranche qui tombe dans l'ombre prend l'émission d'avant-plan de son rayon (couverture exacte). Bord net,
 *   anneau de photons fin et continu, sans scintillement ; ailleurs, un seul rayon par pixel.
 * - Ciel : déviation tracée, ajoutée à celles des autres trous noirs comme dans le fond (approximation de Born) ; au
 *   bord du rectangle, raccord à la lentille faible du fond, sans couture. Empreinte des étoiles hors de toute boucle.
 * - Repère de l'horizon : cercle de laiton en pointillés, 1 px CSS, à 35 % (uHorizonMark le dose).
 * - Ni discard ni dérivée dans le tracé ; hors du cercle apparent du cœur, alpha nul (sortie prémultipliée).
 */
export const BLACK_HOLE_FRAGMENT = /* glsl */ `
precision highp float;
${STARFIELD_GLSL}
${NOISE_GLSL}
uniform float uTime;
uniform vec3 uCamLocal;
uniform mat3 uViewToWorld;
uniform float uCoreRs;
uniform float uOpacity;
uniform float uHorizonMark;
uniform vec3 uHorizonColor;
uniform vec3 uAxis;
uniform vec3 uSpin;
uniform vec3 uDiskE1;
uniform vec3 uDiskE2;
uniform float uOrbitRate;
uniform vec2 uDiskRadii;
uniform float uDiskTemperature;
uniform float uDiskGain;
uniform float uDiskDepth;
uniform float uDiskTurbulence;
uniform vec2 uFlowRadii;
uniform float uFlowTemperature;
uniform float uFlowGain;
uniform float uFlowFlatten;
uniform float uFlowRotation;
uniform float uFlowFlicker;
uniform float uJetGain;
uniform float uJetLength;
uniform float uJetWidth;
uniform float uJetTan;
uniform float uJetCounter;
uniform float uJetKnots;
uniform vec3 uJetColor;
uniform float uGlowGain;
uniform float uGlowScale;
uniform float uGlowReach;
uniform float uGlowRing;
uniform float uGlowRingWidth;
uniform vec3 uGlowColor;
varying vec3 vViewRay;
const float SHADOW_RS = ${glslFloat(SHADOW_RADIUS_RS)};
const float ISCO = ${glslFloat(ISCO_RS)};
const float START_IMPACT_RATIO = ${glslFloat(START_IMPACT_RATIO)};
// Instantané de l'émission d'avant-plan, juste au-dessus de la sphère des photons : l'intérieur de l'ombre au bord.
const float FRONT_RS = 1.7;
// Couronne suréchantillonnée, en pixels hors du bord de l'ombre ; écart minimal d'un rayon au bord, en pixels.
const float RING_BAND = 3.0;
const float EDGE_MIN = 0.05;
#ifdef BH_LITE
const int EDGE_SAMPLES = 2;
#else
const int EDGE_SAMPLES = 4;
#endif
const float BB_MIN_T = ${glslFloat(BLACKBODY_FIT.minTemperatureK)};
const float BB_LIMIT_SCALE = ${glslFloat(BLACKBODY_FIT.limitScale)};
const vec3 BB_U_NUM = ${glslVec(BLACKBODY_FIT.u.numerator)};
const vec2 BB_U_DEN = ${glslVec(BLACKBODY_FIT.u.denominator)};
const vec3 BB_V_NUM = ${glslVec(BLACKBODY_FIT.v.numerator)};
const vec2 BB_V_DEN = ${glslVec(BLACKBODY_FIT.v.denominator)};
const vec2 BB_SHIFT = ${glslVec([BLACKBODY_LIMIT_SHIFT.u, BLACKBODY_LIMIT_SHIFT.v])};
const float DISK_PEAK_SHAPE = ${glslFloat(DISK_PEAK_SHAPE)};
// Début du fondu du bord extérieur du disque, en part de sa largeur.
const float DISK_FADE = 0.65;
// Turbulence : rayon du cercle de bruit (cellules autour du disque : 2π × 4), cellules par facteur e du rayon, pas
// de la spirale logarithmique, contraste, durée d'un cycle d'advection en orbites à 3 r_s.
const float TURB_AZIMUTH = 4.0;
const float TURB_RADIAL = 9.0;
const float TURB_SPIRAL = 2.5;
const float TURB_CONTRAST = 2.4;
const float TURB_CYCLE = 0.5;
#ifdef BH_LITE
const int TURB_OCTAVES = 2;
#else
const int TURB_OCTAVES = 3;
#endif
// Jet : pied et montée de l'éclat le long de l'axe, en r_s.
const float JET_BASE = 1.5;
const float JET_RISE = 5.0;
const float FLARE_SHARPNESS = 5.0;
// Repère de l'horizon : opacité, période des pointillés en px CSS (moitié trait, moitié vide).
const float HORIZON_ALPHA = 0.35;
const float HORIZON_DASH = 6.0;

// Couleur d'un corps noir, linéaire, de luminance 1 (photonGeodesic.ts, blackbodyColor) : lieu de Planck de Krystek en
// uv CIE 1960, raccordé à la limite de Rayleigh-Jeans, puis XYZ → sRGB linéaire (D65).
vec3 blackbody(float temperature) {
  float m = 1000.0 / max(temperature, BB_MIN_T);
  float join = 1.0 / (1.0 + (m / BB_LIMIT_SCALE) * (m / BB_LIMIT_SCALE));
  float u = (BB_U_NUM.x + m * (BB_U_NUM.y + m * BB_U_NUM.z)) / (BB_U_DEN.x + m * (BB_U_DEN.y + m)) + BB_SHIFT.x * join;
  float v = (BB_V_NUM.x + m * (BB_V_NUM.y + m * BB_V_NUM.z)) / (BB_V_DEN.x + m * (BB_V_DEN.y + m)) + BB_SHIFT.y * join;
  float d = 2.0 * u - 8.0 * v + 4.0;
  float x = 3.0 * u / d;
  float y = 2.0 * v / d;
  vec3 xyz = vec3(x / y, 1.0, (1.0 - x - y) / y);
  vec3 rgb = max(vec3(
    dot(vec3(3.2406, -1.5372, -0.4986), xyz),
    dot(vec3(-0.9689, 1.8758, 0.0415), xyz),
    dot(vec3(0.0557, -0.204, 1.057), xyz)), vec3(0.0));
  return rgb / dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}

// Température du disque rapportée à son maximum (photonGeodesic.ts, diskTemperatureRatio).
float diskHeat(float r) {
  float x = r / uDiskRadii.x;
  if (x <= 1.0) return 0.0;
  return pow(x, -0.75) * pow(1.0 - inversesqrt(x), 0.25) / DISK_PEAK_SHAPE;
}

// Une couche de turbulence : bruit fractal sur un cercle (sans couture en azimut) et sur ln r, en spirale ; chaque
// octave s'efface quand ses cellules (radiales) couvrent moins de deux pixels.
float diskNoise(float psi, float lr, float seed, float r, float footprint) {
  float spiral = psi + TURB_SPIRAL * lr;
  vec3 q = vec3(TURB_AZIMUTH * cos(spiral), TURB_AZIMUTH * sin(spiral), TURB_RADIAL * lr + 13.7 * seed);
  float sum = 0.0;
  float total = 0.0;
  float amplitude = 0.5;
  float cell = r / TURB_RADIAL;
  for (int o = 0; o < TURB_OCTAVES; o++) {
    float shown = smoothstep(1.0, 2.5, cell / footprint);
    sum += amplitude * mix(0.5, vn(q), shown);
    total += amplitude;
    q *= 2.03;
    amplitude *= 0.5;
    cell *= 0.5;
  }
  return sum / total;
}

// Facteur d'éclat de la turbulence au point p du disque (rayon r), pour l'image d'ordre « order ». Le motif tourne à
// la vitesse képlérienne affichée ; deux couches, remises à zéro à tour de rôle et fondues l'une dans l'autre, bornent
// son enroulement ; variance gardée constante pendant le fondu.
float diskPattern(vec3 p, float r, float order, float pixelSize) {
  if (uDiskTurbulence <= 0.0) return 1.0;
  float phi = atan(dot(p, uDiskE2), dot(p, uDiskE1));
  float lr = log(r);
  float omega = uOrbitRate * pow(ISCO / r, 1.5);
  float cycle = TURB_CYCLE * 6.2831853 / uOrbitRate;
  float t = uTime / cycle;
  // Taille d'un pixel sur le disque, en r_s ; les images d'ordre supérieur sont rapetissées.
  float footprint = pixelSize * length(uCamLocal) * (1.0 + 3.0 * order);
  float phaseA = fract(t);
  float phaseB = fract(t + 0.5);
  float weightA = 1.0 - abs(2.0 * phaseA - 1.0);
  float weightB = 1.0 - weightA;
  float a = diskNoise(phi - omega * phaseA * cycle, lr, mod(floor(t), 64.0), r, footprint);
  float b = diskNoise(phi - omega * phaseB * cycle, lr, mod(floor(t + 0.5), 64.0) + 0.5, r, footprint);
  float n = 0.5 + (weightA * (a - 0.5) + weightB * (b - 0.5)) * inversesqrt(weightA * weightA + weightB * weightB);
  return exp(TURB_CONTRAST * uDiskTurbulence * (n - 0.5));
}

// Profil radial du gaz chaud : une coquille, nulle aux deux bords, maximale à mi-chemin (sin²). Un rayon qui la frôle
// la traverse longuement, un rayon qui plonge vers l'horizon à peine : anneau brillant, intérieur sombre.
float flowDensity(float r) {
  float s = sin(3.14159265 * clamp((r - uFlowRadii.x) / (uFlowRadii.y - uFlowRadii.x), 0.0, 1.0));
  return s * s;
}

// Sursauts lents du gaz : trois taches qui tournent avec lui, naissent et s'éteignent ; évaluées au centre de gravité
// de l'émission du rayon, d'autant moins que celle-ci est étalée autour du trou noir (anneau de photons).
float flowFlicker(vec3 center, float radius) {
  if (uFlowFlicker <= 0.0) return 1.0;
  vec2 plane = vec2(dot(center, uDiskE1), dot(center, uDiskE2));
  float localized = clamp(length(plane) / max(radius, 1e-3), 0.0, 1.0);
  float phi = atan(plane.y, plane.x + 1e-9);
  float spin = uOrbitRate * uFlowRotation * pow(ISCO / max(radius, 1.5), 1.5);
  float flares = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float life = max(sin(uTime * (0.23 + 0.09 * fk) + 2.4 * fk), 0.0);
    float at = phi - spin * uTime - 2.0944 * fk - 0.6 * sin(0.17 * uTime + 1.3 * fk);
    flares += life * life * exp(FLARE_SHARPNESS * (cos(at) - 1.0));
  }
  return max(1.0 + uFlowFlicker * localized * (3.4 * flares - 0.45), 0.05);
}

// Trace le rayon de direction rayDir (repère du trou noir) depuis la caméra et accumule, de l'avant vers l'arrière,
// l'émission (light), celle d'avant-plan (inner), la transmission restante. Renvoie 1.0 si le rayon s'échappe (farDir :
// sa direction à l'infini), 0.0 s'il est capturé, arrêté par le disque ou inachevé.
float marchRay(vec3 rayDir, float pixelSize, out vec3 light, out vec3 inner, out vec3 farDir, out float impact, out float transmit) {
  light = vec3(0.0);
  inner = vec3(0.0);
  farDir = rayDir;
  transmit = 1.0;
  float dist = length(uCamLocal);
  vec3 radial = uCamLocal / dist;
  float along = dot(rayDir, radial);
  vec3 vel = radial * along + (rayDir - radial * along) * inversesqrt(max(1.0 - 1.0 / dist, 1e-6));
  vec3 momentum = cross(uCamLocal, vel);
  impact = length(momentum);
  float escapeRs = max(uCoreRs, START_IMPACT_RATIO * impact);
  vec3 pos = uCamLocal;
  if (dist > escapeRs) {
    float speed = sqrt(1.0 + impact * impact / (escapeRs * escapeRs * escapeRs));
    vec3 heading = normalize(vel);
    vec3 outward = impact > 0.0 ? cross(heading, momentum / impact) : vec3(0.0);
    float lateral = impact / speed;
    pos = heading * -sqrt(max(escapeRs * escapeRs - lateral * lateral, 0.0)) + outward * lateral;
    vel = heading * speed;
  }
  float h2 = impact * impact;
  // Moment cinétique du rayon autour de l'axe du gaz, conservé : il donne l'effet Doppler partout.
  float lz = dot(uSpin, momentum);
  float r = length(pos);
  vec3 acc = pos * (-1.5 * h2 / (r * r * r * r * r));
  float zPrev = dot(pos, uSpin);
  int crossed = 0;
  float flowSum = 0.0;
  float flowShift = 0.0;
  float flowRadius = 0.0;
  vec3 flowCenter = vec3(0.0);
  bool frontTaken = false;
  vec3 frontLight = vec3(0.0);
  float frontFlow = 0.0;
  float frontShift = 0.0;
  float escaped = 0.0;
  for (int i = 0; i < BH_STEPS; i++) {
    float dl = r > uCoreRs ? max(BH_MIN_STEP, BH_FAR_STEP_FACTOR * r) : clamp(BH_STEP_FACTOR * r, BH_MIN_STEP, BH_MAX_STEP);
    vec3 prev = pos;
    vel += acc * (0.5 * dl);
    pos += vel * dl;
    r = length(pos);
    acc = pos * (-1.5 * h2 / (r * r * r * r * r));
    vel += acc * (0.5 * dl);
    vec3 mid = 0.5 * (prev + pos);
    float rm = length(mid);
    // Gaz chaud, optiquement mince : j g³ dλ (photonGeodesic.ts, flowRedshift).
    if (uFlowGain > 0.0 && rm < uFlowRadii.y && rm > uFlowRadii.x) {
      float lat = dot(mid, uSpin) / rm;
      float beta = uFlowRotation * sqrt(max(1.0 - lat * lat, 0.0)) * sqrt(0.5 / max(rm - 1.0, 0.5));
      float g = sqrt(max(1.0 - 1.0 / rm, 0.0)) * sqrt(max(1.0 - beta * beta, 0.0))
        / max(1.0 + uFlowRotation * lz * inversesqrt(2.0 * rm * rm * rm), 1e-3);
      float emitted = flowDensity(rm) * exp(-uFlowFlatten * lat * lat) * g * g * g * dl * transmit;
      flowSum += emitted;
      flowShift += emitted * g;
      flowRadius += emitted * rm;
      flowCenter += emitted * mid;
    }
    // Disque mince : traversée du plan, point interpolé entre deux pas (photonGeodesic.ts, diskRedshift).
    float z = dot(pos, uSpin);
    if (uDiskGain > 0.0 && crossed < BH_MAX_CROSSINGS && zPrev * z < 0.0) {
      vec3 hit = mix(prev, pos, zPrev / (zPrev - z));
      float rc = length(hit);
      if (rc > uDiskRadii.x && rc < uDiskRadii.y) {
        float g = sqrt(max(1.0 - 1.5 / rc, 0.0)) / max(1.0 + lz * inversesqrt(2.0 * rc * rc * rc), 1e-3);
        float heat = diskHeat(rc);
        float edge = 1.0 - smoothstep(mix(uDiskRadii.x, uDiskRadii.y, DISK_FADE), uDiskRadii.y, rc);
        float mu = abs(dot(vel, uSpin)) / length(vel);
        float alpha = 1.0 - exp(-uDiskDepth * edge / max(mu, 0.05));
        float flux = heat * g;
        flux *= flux;
        flux *= flux;
        vec3 shade = blackbody(uDiskTemperature * heat * g) * (uDiskGain * flux * diskPattern(hit, rc, float(crossed), pixelSize));
        light += transmit * alpha * shade;
        transmit *= 1.0 - alpha;
        crossed++;
      }
    }
    zPrev = z;
    if (!frontTaken && r < FRONT_RS) {
      frontTaken = true;
      frontLight = light;
      frontFlow = flowSum;
      frontShift = flowShift;
    }
    if (r < 1.0 || transmit < 0.004) break;
    if (r > escapeRs && dot(pos, vel) > 0.0) {
      escaped = 1.0;
      farDir = normalize(vel);
      break;
    }
  }
  if (!frontTaken) {
    frontLight = light;
    frontFlow = flowSum;
    frontShift = flowShift;
  }
  float flicker = flowSum > 0.0 ? flowFlicker(flowCenter / flowSum, flowRadius / flowSum) : 1.0;
  if (flowSum > 0.0) light += blackbody(uFlowTemperature * flowShift / flowSum) * (uFlowGain * flowSum * flicker);
  if (frontFlow > 0.0) frontLight += blackbody(uFlowTemperature * frontShift / frontFlow) * (uFlowGain * frontFlow * flicker);
  inner = frontLight;
  return escaped;
}

// Nœuds du jet : deux trains de bosses de pas incommensurables, qui filent vers l'extérieur avec le temps affiché.
float jetKnots(float reach) {
  float a = pow(0.5 + 0.5 * cos(6.2831853 * (reach / 4.7 - 0.21 * uTime)), 10.0);
  float b = pow(0.5 + 0.5 * cos(6.2831853 * (reach / 7.9 - 0.13 * uTime) + 1.7), 14.0);
  return a + 0.7 * b;
}

// Jet : faisceau fin et collimaté le long de l'axe, intégré le long de la visée droite depuis la caméra (sa lumière,
// devant le trou noir, n'est guère déviée). Gaussienne de largeur w = uJetWidth + |s| uJetTan autour de l'axe, au point
// de la visée le plus proche de lui : ∫ e^(−ρ²/w²) / w² = √π / (w sin θ) e^(−ρmin²/w²). Éclat qui monte au pied,
// s'estompe et s'éteint au bout ; nœuds brillants ; contre-jet affaibli, caché derrière l'ombre.
vec3 jetLight(vec3 d) {
  if (uJetGain <= 0.0) return vec3(0.0);
  vec3 c = uCamLocal;
  float da = dot(d, uAxis);
  float sin2 = max(1.0 - da * da, 0.01);
  float cd = dot(c, d);
  float ca = dot(c, uAxis);
  float t = (da * ca - cd) / sin2;
  float s = ca + t * da;
  float reach = abs(s);
  if (t <= 0.0 || reach < JET_BASE || reach > uJetLength) return vec3(0.0);
  vec3 gap = c + t * d - s * uAxis;
  float width = uJetWidth + reach * uJetTan;
  float fade = smoothstep(JET_BASE, JET_BASE + JET_RISE, reach) * exp(-reach / (0.45 * uJetLength))
    * (1.0 - smoothstep(0.75 * uJetLength, uJetLength, reach));
  float side = s > 0.0 ? 1.0 : uJetCounter;
  if (length(cross(c, d)) < SHADOW_RS && t > -cd) side = 0.0;
  float column = 1.7724539 / (width * sqrt(sin2)) * exp(-dot(gap, gap) / (width * width));
  return uJetColor * (uJetGain * side * fade * (1.0 + uJetKnots * jetKnots(reach)) * column);
}

// Rotation qui mène from à to (unitaires), en vecteur perpendiculaire à from de longueur l'angle : la déviation tracée,
// à ajouter à celles des autres lentilles (lensVector).
vec3 turnVector(vec3 from, vec3 to) {
  vec3 side = to - dot(from, to) * from;
  float s = length(side);
  return s > 1e-9 ? side * (atan(s, dot(from, to)) / s) : vec3(0.0);
}

// Lueur au-delà de l'ombre, selon le paramètre d'impact : lueur diffuse et, serré contre l'ombre, l'anneau de photons.
vec3 glowLight(float impact) {
  if (uGlowGain <= 0.0) return vec3(0.0);
  float beyond = max(impact - SHADOW_RS, 0.0);
  float fade = 1.0 - smoothstep(0.75 * uGlowReach, uGlowReach, impact);
  return uGlowColor * (uGlowGain * (exp(-beyond / uGlowScale) + uGlowRing * exp(-beyond / uGlowRingWidth)) * fade);
}

void main() {
  vec3 dir = normalize(uViewToWorld * vViewRay);
  // Angle d'un pixel de l'écran, pris avant toute branche (les dérivées y restent définies).
  float pixelSize = max(length(dFdx(dir)), 1e-7);
  float dist = max(length(uCamLocal), 1.0001);
  vec3 toCenter = -uCamLocal / dist;
  // Angle du pixel au centre, précis aux petits angles (un trou noir de quelques pixels).
  float angle = atan(length(cross(dir, toCenter)), dot(dir, toCenter));
  // Cœur tracé : le cône de la sphère uCoreRs. Au-delà, dans un rectangle agrandi pour un jet, le jet seul.
  float covered = dist > uCoreRs && angle > asin(uCoreRs / dist) ? 0.0 : 1.0;
  // Bord exact de l'ombre (Synge), en pixels : positif au-dehors.
  float shadowAngle = asin(min(1.0, SHADOW_RS * sqrt(1.0 - 1.0 / dist) / dist));
  float edge = (angle - shadowAngle) / pixelSize;
  // Direction radiale de l'image, pour répartir les rayons sur la largeur du pixel.
  vec3 radialImage = dir - toCenter * dot(dir, toCenter);
  float radialLength = length(radialImage);
  vec3 outward = radialLength > 1e-7 ? radialImage / radialLength : vec3(0.0);
  int count = covered > 0.0 && edge > -0.5 && edge < RING_BAND ? EDGE_SAMPLES : 1;
  float width = 1.0 / float(count);
  vec3 color = vec3(0.0);
  vec3 skies[EDGE_SAMPLES];
  float skyShare[EDGE_SAMPLES];
  for (int k = 0; k < EDGE_SAMPLES; k++) {
    skies[k] = dir;
    skyShare[k] = 0.0;
  }
  if (covered > 0.0) {
    for (int k = 0; k < EDGE_SAMPLES; k++) {
      if (k >= count) break;
      // Tranche radiale [lo, hi] du pixel, en pixels du bord ; part hors de l'ombre, rayon au milieu de cette part.
      float lo = edge - 0.5 + float(k) * width;
      float hi = lo + width;
      float outside = clamp(hi / width, 0.0, 1.0);
      float target = outside > 0.0 ? max(0.5 * (max(lo, 0.0) + hi), EDGE_MIN) : 0.5 * (lo + hi);
      float shift = (target - edge) * pixelSize;
      vec3 rayDir = cos(shift) * dir + sin(shift) * outward;
      vec3 light = vec3(0.0);
      vec3 inner = vec3(0.0);
      vec3 farDir = rayDir;
      float impact = 0.0;
      float transmit = 1.0;
      float escaped = marchRay(rayDir, pixelSize, light, inner, farDir, impact, transmit);
      color += width * (outside > 0.0 ? mix(inner, light, outside) : light);
      skies[k] = farDir;
      skyShare[k] = width * outside * escaped * transmit;
      // Lueur : toute la part hors de l'ombre, même pour un rayon inachevé qui tourne encore autour d'elle.
      color += (width * outside * transmit) * glowLight(impact);
    }
  }
  // Ciel : déviation tracée plus celles des autres trous noirs (même somme que le fond, où la sienne est en champ
  // faible) ; au bord, celui du fond, sans couture. Empreinte des étoiles : racine de l'aire que couvre le pixel dans le
  // ciel source, mesurée sur le premier rayon hors de toute branche ; un arc étiré par la lentille garde l'éclat de son
  // étoile, une image écrasée près de l'ombre pâlit.
  vec3 background = covered > 0.0 ? lensSky(dir, vec3(0.0)) : dir;
  vec3 others = covered > 0.0 ? lensVector(dir, uCamLocal) : vec3(0.0);
  float blend = smoothstep(0.9 * uCoreRs, uCoreRs, dist * sin(angle));
  vec3 sky = normalize(mix(rotateBy(dir, turnVector(dir, skies[0]) + others), background, blend));
  float footprint = clamp(sqrt(length(cross(dFdx(sky), dFdy(sky)))), uPixelAngle, 4.0 * uPixelAngle);
  if (covered > 0.0) {
    color += skyShare[0] * starfield(sky, footprint);
    for (int k = 1; k < EDGE_SAMPLES; k++) {
      if (skyShare[k] > 0.0) {
        color += skyShare[k] * starfield(normalize(mix(rotateBy(dir, turnVector(dir, skies[k]) + others), background, blend)), footprint);
      }
    }
    // Repère de l'horizon (r_s), non dévié : cercle fin de laiton en pointillés, 1 px CSS, comme un trait d'instrument.
    vec3 across = cross(toCenter, uViewToWorld[1]);
    vec3 imageRight = across / max(length(across), 1e-6);
    vec3 imageUp = cross(imageRight, toCenter);
    float horizon = asin(min(1.0 / dist, 1.0));
    float dashes = max(floor(6.2831853 * horizon / (HORIZON_DASH * uPixelAngle) + 0.5), 8.0);
    float around = atan(dot(outward, imageUp), dot(outward, imageRight) + 1e-9) / 6.2831853;
    float phase = fract(around * dashes + 0.25) - 0.5;
    float onDash = clamp((0.25 - abs(phase)) * 6.2831853 * horizon / (dashes * pixelSize) + 0.5, 0.0, 1.0);
    float onLine = clamp((0.5 * uPixelAngle - abs(angle - horizon)) / pixelSize + 0.5, 0.0, 1.0);
    color = mix(color, uHorizonColor, HORIZON_ALPHA * onLine * onDash * uHorizonMark);
  }
  gl_FragColor = vec4(color, uOpacity * covered);
  ${OUTPUT}
  // Alpha prémultiplié (matériau premultipliedAlpha) : le cœur couvre le fond selon son opacité.
  gl_FragColor.rgb *= gl_FragColor.a;
  // Jet, devant tout le reste : lumière ajoutée à l'écran, tone mapping à part, de la même façon dans le cœur et
  // au-delà (alpha nul), pour qu'il traverse le bord du cœur sans couture.
  vec4 jet = vec4(jetLight(dir) * uOpacity, 1.0);
  #ifdef TONE_MAPPING
  jet.rgb = toneMapping(jet.rgb);
  #endif
  gl_FragColor.rgb += linearToOutputTexel(jet).rgb;
}
`;
