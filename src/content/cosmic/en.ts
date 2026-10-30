import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { withUnit } from "@/i18n/units";
import { formatNumber } from "@/lib/format";
import { CMB_AGE_YEARS, CMB_TEMPERATURE_K, OBSERVABLE_UNIVERSE_RADIUS_GLY, UNIVERSE_AGE_GYR } from "@/lib/astro/universe";
import { MAP_GALAXY_COUNT, MAP_STAR_COUNT, RED_DWARF_COUNT, distanceMlyOf } from "./figures";
import type { CosmicContent } from "./types";

const { starNames, galaxyNames, galaxyDistance } = DEEP_SKY_STRINGS.en;

/** Nombre écrit comme Intl l'écrit en anglais britannique (virgule dès 4 chiffres). */
const n = (value: number, digits = 0) => formatNumber(value, digits, "en");
const ly = (value: number, digits = 0) => withUnit(n(value, digits), "ly", "en");
const percent = (value: number) => withUnit(n(value), "percent", "en");

/* Même contenu que le français, rédigé en anglais britannique pour un public de 12 ans et plus. */
export const COSMIC_EN: CosmicContent = {
  stops: {
    stars: {
      rank: "Beyond the Solar System",
      name: "The nearby stars",
      hook: "The closest one is more than four light-years away.",
      lede: `A light-year is the distance light travels in a year: ${n(9460)} billion kilometres. ${starNames["proxima-centauri"]}, the closest star, is ${n(4.25, 2)} light-years away: its light takes 4 years and 3 months to reach us. Even at 17 km/s, the Voyager 1 probe would take about ${n(75_000)} years to cover that distance. Within 10 light-years of the Sun, we know of only 7 other star systems.`,
      facts: [
        { label: "Closest star", value: starNames["proxima-centauri"], note: ly(4.25, 2) },
        { label: "Its light takes", value: "4 years and 3 months" },
        { label: "Aboard Voyager 1", value: `≈ ${n(75_000)} years`, note: "at 17 km/s" },
        { label: "Brightest star in the sky", value: starNames.sirius, note: `${ly(8.6, 1)} away` },
        { label: "Systems within 10 ly", value: "7", note: "not counting the Sun" },
        { label: "Red dwarfs on the map", value: `${RED_DWARF_COUNT} of ${MAP_STAR_COUNT}`, note: "none is visible to the naked eye" },
      ],
      caveat: "Here, the distances are to scale; only the stars are enlarged.",
      source: "ESA, Gaia DR3; RECONS; NASA",
    },
    galaxy: {
      rank: "Our galaxy",
      name: "The Milky Way",
      hook: "The Sun, one star among hundreds of billions.",
      lede: `The Milky Way is a very flat disc about ${n(100_000)} light-years across, home to between 100 and 400 billion stars. The Sun lies about ${n(27_000)} light-years from the centre, in the Orion Arm, a small arm squeezed between the Sagittarius and Perseus arms. It circles the centre at about 230 km/s: one lap takes about 230 million years. Hidden at the centre is a giant black hole, Sagittarius A*, more than 4 million times as massive as the Sun. From Earth, the Milky Way looks like a milky band across the sky: it is this disc, seen edge-on from the inside.`,
      facts: [
        { label: "Disc diameter", value: `≈ ${ly(100_000)}` },
        { label: "Disc thickness", value: `≈ ${ly(1000)}` },
        { label: "The Sun is", value: `≈ ${ly(27_000)}`, note: "from the centre" },
        { label: "One lap of the centre", value: "≈ 230 million years", note: "at about 230 km/s" },
        { label: "Stars", value: "100 to 400 billion" },
        { label: "At the centre", value: "Sagittarius A*", note: "a black hole of 4 million Suns" },
        { label: "Oldest stars", value: "≈ 13 billion years" },
      ],
      caveat: "The arms are drawn from a simplified model.",
      source: "NASA; ESA; ESO; GRAVITY Collaboration (2022); Event Horizon Telescope (2022); Reid et al. (2019)",
    },
    localGroup: {
      rank: "Our neighbouring galaxies",
      name: "The Local Group",
      hook: "Andromeda, our big neighbour, is 2.5 million light-years away.",
      lede: "The Milky Way is not alone. Together with the Andromeda Galaxy, the Triangulum Galaxy and more than 100 small galaxies, mostly dwarfs, it forms the Local Group: a family about 10 million light-years from end to end, with no sharp edge. Andromeda is the largest: on a dark autumn night, you can see it with the naked eye, a small fuzzy patch whose light has travelled for 2.5 million years. Andromeda and the Milky Way are moving towards each other. For a long time, astronomers thought they would collide in 4 to 5 billion years; according to a 2025 study, there is in fact only about a one-in-two chance that they merge within the next 10 billion years.",
      facts: [
        { label: "Size", value: "≈ 10 million ly", note: "from end to end, with no sharp edge" },
        { label: "Known galaxies", value: "more than 100", note: "mostly dwarfs" },
        { label: galaxyNames.andromeda, value: galaxyDistance(distanceMlyOf("andromeda")), note: "the largest, visible to the naked eye" },
        { label: galaxyNames.triangulum, value: galaxyDistance(distanceMlyOf("triangulum")), note: "the third most massive" },
        {
          label: "Magellanic Clouds",
          value: `${galaxyDistance(distanceMlyOf("large-magellanic-cloud"))} and ${galaxyDistance(distanceMlyOf("small-magellanic-cloud"))}`,
          note: "visible from the southern hemisphere",
        },
        { label: "Total mass", value: "≈ 2 trillion Suns", note: "including dark matter" },
        { label: "Future with Andromeda", value: "a one-in-two chance", note: "of merging within 10 billion years (2025 study)" },
      ],
      caveat: `Positions, distances and sizes are to scale; the shapes are stylised from measurements. The map shows ${MAP_GALAXY_COUNT} of the group's more than 100 galaxies, and the smallest ones shine a little brighter than they really do.`,
      source:
        "McConnachie (2012, 2021 catalogue); Li et al. (2021); Breuval et al. (2023); Pietrzyński et al. (2019); Graczyk et al. (2020); Karachentsev et al. (2009); Sawala et al. (2025); NASA",
    },
    universe: {
      rank: "As far as we can see",
      name: "The observable Universe",
      hook: "A sphere about 93 billion light-years across, with us at the centre.",
      lede: `The light from the most distant galaxies has been travelling towards us for almost ${n(UNIVERSE_AGE_GYR, 1)} billion years, the age of the Universe. During that journey, space itself has stretched, like a piece of elastic being pulled: today, those galaxies are about ${n(OBSERVABLE_UNIVERSE_RADIUS_GLY)} billion light-years away. We are at the centre of this sphere simply because it is the part of the Universe we can see, equally far in every direction; the Universe itself has no known centre. It holds hundreds of billions of galaxies, which trace a vast web of filaments around enormous voids. At the very edge, we see the oldest light in the Universe: the cosmic microwave background.`,
      facts: [
        { label: "Radius", value: `≈ ${n(OBSERVABLE_UNIVERSE_RADIUS_GLY)} billion ly`, note: "diameter ≈ 93 billion ly" },
        { label: "Age of the Universe", value: `${n(UNIVERSE_AGE_GYR, 1)} billion years` },
        { label: "Number of galaxies", value: "hundreds of billions" },
        {
          label: "Cosmic microwave background",
          value: withUnit(n(CMB_TEMPERATURE_K, 3), "kelvin", "en"),
          note: `that is −${n(270.4, 1)} °C, released ${n(CMB_AGE_YEARS)} years after the Big Bang`,
        },
        { label: "Ordinary matter", value: `≈ ${percent(5)}`, note: "stars, planets, gas… and us" },
        { label: "Dark matter", value: `≈ ${percent(27)}`, note: "invisible, given away by its gravity" },
        { label: "Dark energy", value: `≈ ${percent(68)}`, note: "it speeds up the expansion" },
      ],
      caveat: "The web is stylised: the real one is much finer, with filaments about 10 million light-years wide and voids 90 to 240 million light-years across. The spots on the cosmic microwave background are drawn, not taken from a map.",
      source:
        "Planck Collaboration (2020); Fixsen (2009); ESA; NOIRLab (2021); Cautun et al. (2014); van de Weygaert and Platen (2011)",
    },
    multiverse: {
      hypothesis: "Hypothesis: nobody has ever observed another universe. This stop illustrates a debated idea, not a discovery.",
      rank: "Beyond the observable",
      name: "The multiverse",
      hook: "What if there were other universes? Nobody knows.",
      lede: "What we know: our observable Universe has a limit, set by the age of the Universe and the speed of light. Beyond it, space most probably goes on, but we cannot see it. What we suppose: some theories, such as eternal inflation, string theory or one interpretation of quantum physics, suggest that other universes might exist, perhaps with different laws of physics; together, they are called the multiverse. Why it is debated: nobody has ever observed one, and many scientists wonder whether an idea that cannot be tested still counts as science. Others look for clues, such as the mark left by a collision between two universe “bubbles” in the oldest light in the sky: nothing so far.",
      facts: [
        { label: "Other universes observed", value: "none" },
        { label: "Best-known idea", value: "bubble universes", note: "endlessly born of eternal inflation" },
        { label: "Clue searched for", value: "traces of collisions", note: "in the cosmic microwave background: none found" },
        { label: "Another lead", value: "string theory", note: "itself not yet confirmed" },
        { label: "Status", value: "a debated hypothesis", note: "science or philosophy?" },
      ],
      caveat: "Artist's impression: the other bubbles, their sizes and their positions are made up for the picture. Only ours, the observable Universe, has a measured size.",
      source: "Tegmark (2003); Feeney et al. (2011); Carr and Ellis (2008); Ellis (2011); Quanta Magazine (2014)",
    },
  },
  starTable: {
    button: "The stars on the map",
    caption: "The stars on the map, from nearest to farthest",
    columns: ["Star", "Distance", "Type"],
    types: {
      O: "blue",
      B: "blue-white",
      A: "white",
      F: "yellow-white",
      G: "yellow dwarf, like the Sun",
      K: "orange dwarf",
      M: "red dwarf",
    },
    notes: {
      "proxima-centauri": "the closest, bound to Alpha Centauri A and B",
      "alpha-centauri": "two stars close to the Sun in size",
      barnard: "the star that moves fastest across our sky",
      sirius: "the brightest in our night sky, with the white dwarf Sirius B",
      "luyten-726-8": "two red dwarfs, BL Ceti and UV Ceti",
      "61-cygni": "double star",
      procyon: "with the white dwarf Procyon B",
      "struve-2398": "double star",
      "groombridge-34": "double star",
      "epsilon-indi": "with two brown dwarfs",
      altair: "a bright star of the summer sky",
    },
    typeNote:
      "On the map, the colour of a dot follows the star's temperature: orange for the coolest ones, the red dwarfs, bluish white for the hottest, like Sirius. The bigger the dot, the more luminous the star really is.",
  },
  galaxyTable: {
    button: "The galaxies on the map",
    caption: "The galaxies on the map, from nearest to farthest",
    columns: ["Galaxy", "Distance", "Size"],
    note: "Distance from the Sun; for the Milky Way, the distance to its centre. Size: diameter of the brightest part; the outermost stars often reach beyond it.",
  },
  plate: { story: "Read the fact sheet", back: "Back to the Sun", sources: "Sources:" },
};
