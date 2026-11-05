import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { formatNumber } from "@/lib/format";
import type { SizesContent } from "./types";

/** Nombre écrit comme Intl l'écrit en anglais britannique (virgule dès 4 chiffres). */
const n = (value: number) => formatNumber(value, 0, "en");

/** L'ombre, √27/2 ≈ 2,6 fois l'horizon (schwarzschild.ts). */
const shadowTimes = formatNumber(SHADOW_RADIUS_RS, 1, "en");

/*
 * Même contenu que le français (valeurs et comparaisons des données v2, § 1, et de la fiche des trous noirs ;
 * introduction et mots de couleur du design v2, § 4), rédigé en anglais britannique pour un public de 12 ans et plus.
 */
export const SIZES_EN: SizesContent = {
  intro: {
    title: "Stars and black holes, side by side.",
    text: `Scroll down: each object is bigger than the last, and all of them are to the same scale. Sizes are counted in solar radii (R☉): 764 R☉ means 764 times the radius of the Sun. A black hole has no surface: we measure it by its shadow, the dark disc drawn by the light it bends, ${shadowTimes} times as wide as its event horizon.`,
    note: "Sizes are to scale; the objects, really very far apart, are lined up side by side here. The black holes are computed renderings: light follows the curvature of space.",
    sceneDescription:
      "In the background, a 3D view lines up ten stars and four black holes at their true relative sizes; the camera pulls back from one object to the next as you scroll.",
    start: "Start with the smallest",
  },
  stars: {
    "proxima-centauri": {
      kind: "red dwarf",
      hook: "The Sun's nearest neighbour, barely one and a half times as wide as Jupiter.",
      lede: "Proxima Centauri is the closest star to the Sun: its light takes 4.2 years to reach us. This red dwarf is only 15% the size of the Sun and more than 600 times dimmer. Too faint to see with the naked eye, it never even rises above the horizon in Europe.",
    },
    sun: {
      kind: "yellow dwarf",
      hook: "Seen from space, the Sun is almost white.",
      lede: `Astronomers use the Sun's radius as a unit: 1 R☉, or ${n(695_700)} km. About 1.3 million Earths would fit inside it, and its light takes 4.6 seconds to cross it from side to side. It is our air that makes it look yellow, especially low on the horizon. Never look straight at it, not even with sunglasses.`,
    },
    "sirius-a": {
      kind: "white star",
      hook: "The brightest star in our night sky isn't all that big.",
      lede: "Sirius A is only 1.7 times as wide as the Sun, but it is twice as massive and almost 25 times as luminous. It is hotter too, so it shines a bluish white. It is called Sirius A because a small star orbits it: the white dwarf Sirius B. From Europe, look for it on winter evenings, fairly low in the south.",
    },
    pollux: {
      kind: "orange giant",
      hook: "Nine Suns side by side would span its diameter.",
      lede: "Pollux is a giant: it has used up the hydrogen in its core, and its outer layers have swollen and cooled, which gives it its orange tint. It is the brightest star in Gemini, high in the sky in winter and spring.",
    },
    arcturus: {
      kind: "orange giant",
      hook: "Almost the Sun's mass, but 25 times as wide.",
      lede: "Arcturus has almost the same mass as the Sun, so it gives us a glimpse of what our star will become, much later, when it swells up in turn. In the Sun's place, its surface would sit 0.12 AU from the centre, 30% of the way out to Mercury's orbit. Look for it high in the sky in spring and summer, in the constellation Boötes.",
    },
    aldebaran: {
      kind: "orange giant",
      hook: "In the middle of the Solar System, it would reach halfway to Mercury's orbit.",
      lede: `Aldebaran is another giant: it would take 45 Suns side by side to span its diameter. At ${n(3900)} K, its surface is much cooler than the Sun's (${n(5772)} K), which gives it its orange colour. It shines in Taurus from November to March.`,
    },
    rigel: {
      kind: "blue supergiant",
      hook: "Bluish, blazing hot and tens of thousands of times as luminous as the Sun.",
      lede: `Rigel is a supergiant, about 21 times as massive as the Sun, burning through its fuel at a furious pace. At ${n(12_100)} K, its surface is twice as hot as the Sun's, hence its bluish tint. In the Sun's place, it would almost graze Mercury's orbit. You can see it in winter, in Orion.`,
      caveat: `Its distance is still debated: if it were ${n(1170)} light-years away rather than 860, its radius would be about 101 R☉.`,
    },
    "antares-a": {
      kind: "red supergiant",
      hook: "Big enough to swallow the orbit of Mars.",
      lede: "Antares A is a red supergiant, about 13 times as massive as the Sun and tens of thousands of times as luminous. In the Sun's place, it would swallow Mercury, Venus, the Earth and Mars, almost out to the far edge of the asteroid belt, and light would take 53 minutes to cross it. From Europe, it stays low in the south, in Scorpius, in June and July.",
      caveat: "The star pulsates: its radius varies by about 19%, and its distance is only known to within 17%.",
    },
    betelgeuse: {
      kind: "red supergiant",
      hook: "Its volume could hold about 450 million Suns.",
      lede: "Betelgeuse, Orion's shoulder, is one of the largest stars you can see with the naked eye. Its surface has no sharp edge: its atmosphere thins out gradually into space. In the Sun's place, it would reach past the asteroid belt, two thirds of the way to Jupiter, and light would take about an hour to cross it. In 2025, astronomers probably spotted a small companion star orbiting it.",
      caveat: "Its size depends on its distance, which is still debated.",
    },
    "vy-canis-majoris": {
      kind: "red hypergiant",
      hook: "The largest star whose diameter and distance have both been measured.",
      lede: `VY Canis Majoris, in Canis Major, is a red hypergiant about ${n(270_000)} times as luminous as the Sun. Light would take almost 2 hours to cross it, and an airliner flying at 900 km/h would need about 790 years to fly once around it. Next to it, the Sun is just a dot.`,
      caveat: `Before 2012, estimates ranged from 600 to ${n(3000)} R☉. Other stars may be larger, but their sizes are still too uncertain to compare.`,
    },
  },
  blackHoles: {
    "cygnus-x-1": {
      kind: "stellar black hole",
      hook: "About 15 to 20 times the Sun's mass, packed into a shadow a few hundred kilometres across.",
      lede: "Cygnus X-1 was the first object astronomers recognised as a black hole, in the early 1970s. It orbits a blue supergiant star every 5.6 days and swallows its wind. In 1974, the physicist Stephen Hawking bet that it was not a black hole; he admitted defeat in 1990. Its event horizon (without rotation) is only about a hundred kilometres across: the Earth is about a hundred times wider.",
      simplification:
        "Computed rendering: light follows the curvature of space around a non-rotating black hole. The disc, which shines mostly in X-rays, takes the colour of a black body at several million degrees; it is shown more tilted than it really is, to reveal its bent image above the shadow.",
      caveat: "Its mass is debated: a 2025 study finds it much lighter than the 2021 measurement used here.",
    },
    "sagittarius-a-star": {
      kind: "supermassive black hole",
      hook: "4.3 million times the Sun's mass, yet a shadow barely wider than Aldebaran.",
      lede: `Sagittarius A* is the black hole at the centre of our galaxy, ${n(27_000)} light-years away. Astronomers weighed it by following the stars that orbit it: the star S2 goes round it every 16 years. This work earned Reinhard Genzel and Andrea Ghez the 2020 Nobel Prize in Physics. It is very quiet: in all, it shines only about as brightly as a few hundred Suns. Its first image was published in 2022.`,
      simplification:
        "Computed rendering: light follows the curvature of space around a non-rotating black hole. The faint ring, seen almost face-on, is in false colours, like the Event Horizon Telescope image taken in radio waves: in visible light, dust in the Galaxy hides it.",
    },
    "m87-star": {
      kind: "supermassive black hole",
      hook: "The first black hole ever photographed: its shadow would swallow the whole Solar System.",
      lede: `M87* lies at the heart of the giant galaxy M87, 55 million light-years away. Its image, published on 10 April 2019 by the Event Horizon Telescope, was the first of a black hole: radio telescopes all over the Earth had to be linked to see it in such fine detail. It is about ${n(1500)} times as massive as the one in our galaxy and shoots out a jet of particles at nearly the speed of light, about ${n(5000)} light-years long. Yet it only swallows roughly one planet Jupiter's worth of matter each year.`,
      simplification:
        "Computed rendering: light follows the curvature of space around a non-rotating black hole. The ring is in false colours, like the Event Horizon Telescope image taken in radio waves; the jet, bluish as in Hubble's images, is far shorter than it really is.",
      caveat:
        "Its mass depends on the method: the Event Horizon Telescope's ring gives 6.5 billion solar masses, the motion of the stars in its galaxy about 5.4 billion.",
    },
    "cosmic-horseshoe": {
      kind: "ultramassive black hole",
      hook: "One of the most massive black holes ever weighed, possibly the record holder.",
      lede: `This black hole sleeps at the heart of the galaxy LRG 3-757, whose mass bends the light of a more distant galaxy into an almost closed arc: the “Cosmic Horseshoe”. In 2025, astronomers weighed it in two ways, through this bending and through the speed of the stars near its centre, close to 400 km/s. The result: about 36 billion times the Sun's mass, more than ${n(8000)} times the one in our galaxy. It swallows almost nothing, so it does not shine. Its light travelled for nearly 5 billion years to reach us.`,
      simplification:
        "Computed rendering: light follows the curvature of space around a non-rotating black hole. It swallows nothing: no disc and no jet, only its shadow against the bent light of its galaxy's old, yellow-orange stars. The horseshoe itself, made by the whole galaxy and far larger, is not drawn.",
      caveat:
        "Only one study has weighed it, and its mass depends on the model. TON 618 is often called the biggest known black hole, up to 66 billion Suns, but its mass is only estimated from its quasar's light and could be much lower.",
    },
  },
  facts: {
    radius: "Radius",
    type: "Star type",
    temperature: "Surface temperature",
    distance: "Distance from Earth",
    comparison: "For scale",
    sunDistance: "8.3 light-minutes",
    shadow: "Shadow radius",
    horizon: "Event horizon radius (without rotation)",
    mass: "Mass",
    blackHoleType: "Black hole type",
  },
  tints: { orange: "orange", "pale-orange": "pale orange", white: "white", "bluish-white": "bluish white" },
  vsSun: {
    cooler: `cooler than the Sun (${n(5772)} K)`,
    hotter: `hotter than the Sun (${n(5772)} K)`,
    reference: "our reference",
  },
  thermo: { cooler: "cooler", hotter: "hotter" },
  plate: { story: "Read the fact sheet", restart: "Back to the smallest", sources: "Sources:" },
};
