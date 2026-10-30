import { formatNumber } from "@/lib/format";
import type { SizesContent } from "./types";

/** Nombre écrit comme Intl l'écrit en anglais britannique (virgule dès 4 chiffres). */
const n = (value: number) => formatNumber(value, 0, "en");

/*
 * Même contenu que le français (valeurs et comparaisons des données v2, § 1 ; introduction et mots de couleur du
 * design v2, § 4), rédigé en anglais britannique pour un public de 12 ans et plus.
 */
export const SIZES_EN: SizesContent = {
  intro: {
    title: "Ten stars, side by side.",
    text: "Scroll down: each star is bigger than the last, and all of them are to the same scale. Sizes are counted in solar radii (R☉): 764 R☉ means 764 times the radius of the Sun.",
    note: "Sizes are to scale; the stars, really very far apart, are lined up side by side here.",
    sceneDescription:
      "In the background, a 3D view lines up the ten stars at their true relative sizes; the camera pulls back from one star to the next as you scroll.",
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
      caveat: `Its distance is still debated: if it were ${n(1170)} light-years away rather than 860, its radius would be close to 106 R☉.`,
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
  facts: {
    radius: "Radius",
    type: "Star type",
    temperature: "Surface temperature",
    distance: "Distance from Earth",
    comparison: "For scale",
    sunDistance: "8.3 light-minutes",
  },
  tints: { orange: "orange", "pale-orange": "pale orange", white: "white", "bluish-white": "bluish white" },
  vsSun: {
    cooler: `cooler than the Sun (${n(5772)} K)`,
    hotter: `hotter than the Sun (${n(5772)} K)`,
    reference: "our reference",
  },
  thermo: { cooler: "cooler", hotter: "hotter" },
  plate: { story: "Read the fact sheet", restart: "Back to the smallest star", sources: "Sources:" },
};
