import { ABOUT_URLS, ccByUrl } from "@/content/about/structure";
import { INTL_LOCALE } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { formatNumber } from "@/lib/format";
import { nearbyStarsSource } from "./structure";
import type { BeyondMarkTexts, VoyageContent } from "./types";

const PLANET_RANK = "planet from the Sun";
const FROM_EARTH = "On this date, from Earth";
const HOURS: PluralForms = { one: "hour", other: "hours" };
const MINUTES: PluralForms = { one: "minute", other: "minutes" };

/** Suffixe ordinal selon la catégorie CLDR : 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd. */
const ORDINAL_RULES = new Intl.PluralRules(INTL_LOCALE.en, { type: "ordinal" });
const ORDINAL_SUFFIXES: Readonly<Record<Intl.LDMLPluralRule, string>> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
};

/** Durée lue à voix haute : « ≈ 7 h » → « about 7 hours », « 4 h 10 min » → « 4 hours 10 minutes ». */
function spoken(value: string): string {
  return value
    .replace("≈", "about")
    .replace(
      /(\d+) h(?: (\d+) min)?/,
      (_match: string, hours: string, minutes: string | undefined) =>
        `${hours} ${plural("en", Number(hours), HOURS)}` +
        (minutes ? ` ${minutes} ${plural("en", Number(minutes), MINUTES)}` : ""),
    );
}

/* Même contenu que le français, en anglais britannique (centre, colour, metres, tonnes) pour 12 ans et plus. */
export const VOYAGE_EN: VoyageContent = {
  hero: {
    title: "Eight planets, one star, and a lot of empty space.",
    text: "Every planet starts where it really is today. Scroll to leave the Sun and reach Neptune, four light-hours away, then the nearby stars and the Milky Way.",
    sceneDescription:
      "In the background, a 3D view of the Solar System with the planets where they are today; the camera follows as you scroll.",
    stampPrefix: "Real positions at departure:",
    start: "Start from the Sun",
  },
  plate: { story: "Read the fact sheet", more: "Read more" },
  steps: {
    previous: (name) => `Previous stop: ${name}`,
    next: (name) => `Next stop: ${name}`,
  },
  ordinal: (n) => ({ number: formatNumber(n, 0, "en"), suffix: ORDINAL_SUFFIXES[ORDINAL_RULES.select(n)] }),
  bodies: {
    sun: {
      rank: "The star at the centre",
      hook: "An ordinary star, seen up close.",
      lede: "The Sun holds 99.86% of the mass of the Solar System. In its core, at 15 million degrees, it turns about 600 million tonnes of hydrogen into helium every second. Its light takes 8 minutes and 19 seconds to reach us: we always see the Sun as it was a little while ago.",
      facts: [
        { label: "Diameter", value: "1,392,700 km", note: "109 Earths side by side" },
        { label: "Mass", value: "333,000 Earths", note: "99.86% of the system" },
        { label: "Surface", value: "5,500 °C" },
        { label: "Core", value: "15 million °C" },
        { label: "One turn on its axis", value: "25 days", note: "at the equator, 35 at the poles" },
        { label: "Age", value: "4.6 billion years" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Light's race",
        intro: "A flash leaves the Sun. The distances are to scale: see where the first four planets lie.",
        button: "Light's race",
      },
    },
    mercury: {
      rank: PLANET_RANK,
      hook: "The smallest, and the fastest.",
      lede: "Mercury goes round the Sun in 88 days, at 47 km/s on average. Its orbit is the most elongated of the eight: its distance from the Sun ranges from 46 to 70 million km. With no atmosphere to hold in the heat, its surface swings from 430 °C by day to −180 °C at night.",
      facts: [
        { label: "Distance from the Sun", value: "0.39 AU", note: "57.9 million km" },
        { label: "Diameter", value: "4,879 km", note: "0.38 Earths" },
        { label: "One year", value: "88 days" },
        { label: "One day, sunrise to sunrise", value: "176 days" },
        { label: "Temperatures", value: "−180 to 430 °C" },
        { label: "Gravity", value: "0.38 g" },
        { label: "Moons", value: "0" },
        { label: "Average speed", value: "47.4 km/s" },
      ],
      live: FROM_EARTH,
      module: {
        title: "The law of equal areas",
        intro:
          "Kepler, 1609: a planet sweeps out equal areas in equal times. Each sector takes 8 days. Close to the Sun, Mercury speeds up.",
        button: "Why Mercury speeds up",
      },
    },
    venus: {
      rank: PLANET_RANK,
      hook: "A day longer than its year.",
      lede: "Venus takes 243 days to turn once on its axis, longer than it takes to go round the Sun (225 days). It also spins the other way: there, the Sun rises in the west. Its thick carbon dioxide atmosphere traps the heat: 464 °C at the surface, hotter than on Mercury.",
      facts: [
        { label: "Distance from the Sun", value: "0.72 AU", note: "108.2 million km" },
        { label: "Diameter", value: "12,104 km", note: "0.95 Earths" },
        { label: "One year", value: "225 days" },
        { label: "One turn on its axis", value: "243 days", note: "the other way round" },
        { label: "Surface temperature", value: "464 °C" },
        { label: "Gravity", value: "0.90 g" },
        { label: "Moons", value: "0" },
        { label: "Surface pressure", value: "92 bar", note: "92 times Earth's" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Which lap ends first?",
        intro: "On the left, the trip round the Sun. On the right, Venus turning on its axis. The same clock for both.",
        button: "Day versus year",
      },
    },
    earth: {
      rank: PLANET_RANK,
      hook: "Tilted by 23.44°, hence the seasons.",
      lede: "The seasons do not come from the distance to the Sun: Earth is actually closest to it in early January. They come from the tilt of its axis, which always points in the same direction. In June, the northern hemisphere gets the Sun higher in the sky and for longer; in December, it is the other way round.",
      facts: [
        { label: "Distance from the Sun", value: "1 AU", note: "149.6 million km" },
        { label: "Diameter", value: "12,756 km" },
        { label: "One year", value: "365.25 days" },
        { label: "One day", value: "24 h" },
        { label: "Average temperature", value: "15 °C" },
        { label: "Gravity", value: "1 g", note: "9.81 m/s²" },
        { label: "Moons", value: "1" },
        { label: "Axial tilt", value: "23.44°" },
      ],
      live: "On this date, distance from the Sun",
      module: {
        title: "Why are there seasons?",
        intro:
          "At the top or on the left, Earth on its orbit, seen from above. Side view: the share of each rotation spent in sunlight at the latitude of Paris.",
        button: "Why are there seasons?",
      },
    },
    mars: {
      rank: PLANET_RANK,
      hook: "A cold, rust-coloured desert.",
      lede: "Its colour comes from iron oxide, rust, which coats its rocks and dust. Mars is home to Olympus Mons, the tallest known volcano: about 22 km high, two and a half times the height of Everest. Its gravity is only 38% of Earth's.",
      facts: [
        { label: "Distance from the Sun", value: "1.52 AU", note: "227.9 million km" },
        { label: "Diameter", value: "6,792 km", note: "0.53 Earths" },
        { label: "One year", value: "687 days" },
        { label: "One day", value: "24 h 40 min" },
        { label: "Average temperature", value: "−65 °C" },
        { label: "Gravity", value: "0.38 g" },
        { label: "Moons", value: "2", note: "Phobos and Deimos" },
        { label: "Tallest volcano", value: "≈ 22 km" },
      ],
      live: FROM_EARTH,
      module: {
        title: "What the scales would read",
        intro: "Your mass stays the same everywhere. Your weight, though, depends on the gravity of the world you are on.",
        button: "Your weight on each world",
      },
    },
    jupiter: {
      rank: PLANET_RANK,
      hook: "Two and a half times as massive as all the other planets put together.",
      lede: "Jupiter is a gas giant: no solid ground, just layers of cloud swept along by violent winds. You could line up 11 Earths across its diameter. Its Great Red Spot is a storm wider than Earth, observed for more than 150 years.",
      facts: [
        { label: "Distance from the Sun", value: "5.20 AU", note: "778.5 million km" },
        { label: "Diameter", value: "142,984 km", note: "11.2 Earths" },
        { label: "One year", value: "11.9 years" },
        { label: "One day", value: "9 h 56 min", note: "the shortest" },
        { label: "Cloud tops", value: "−110 °C" },
        { label: "Gravity", value: "2.53 g" },
        { label: "Moons", value: "95 known" },
        { label: "Volume", value: "1,321 Earths" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Sizes, to scale at last",
        intro: "Hover over or tap a planet to read its diameter.",
        button: "Compare the sizes",
      },
    },
    saturn: {
      rank: PLANET_RANK,
      hook: "Rings 270,000 km wide and about ten metres thick.",
      lede: "The rings are made of billions of chunks of ice, from grains of dust to blocks the size of a house. They are so thin that, seen edge-on, they almost disappear: that happened, as seen from Earth, in March 2025. Saturn itself is less dense than water.",
      facts: [
        { label: "Distance from the Sun", value: "9.54 AU", note: "1.43 billion km" },
        { label: "Diameter", value: "120,536 km", note: "9.4 Earths" },
        { label: "One year", value: "29.4 years" },
        { label: "One day", value: "10 h 34 min" },
        { label: "Cloud tops", value: "−140 °C" },
        { label: "Gravity", value: "1.07 g" },
        { label: "Moons", value: "274 known" },
        { label: "Density", value: "0.69", note: "water: 1" },
      ],
      live: FROM_EARTH,
      module: {
        title: "The rings as seen from Earth",
        intro:
          "Depending on where Saturn is on its 29-year orbit, we see the rings from above, from below or edge-on.",
        button: "The rings from Earth",
      },
    },
    uranus: {
      rank: PLANET_RANK,
      hook: "It goes round the Sun lying on its side.",
      lede: "Its axis is tilted by 98°: each pole gets about 42 years of daylight, then 42 years of night. Its blue-green colour comes from methane, which absorbs red light. It was the first planet discovered with a telescope, by William Herschel in 1781.",
      facts: [
        { label: "Distance from the Sun", value: "19.2 AU", note: "2.87 billion km" },
        { label: "Diameter", value: "51,118 km", note: "4 Earths" },
        { label: "One year", value: "84 years" },
        { label: "One day", value: "17 h 14 min", note: "the other way round" },
        { label: "Cloud tops", value: "−195 °C" },
        { label: "Gravity", value: "0.90 g" },
        { label: "Moons", value: "29 known" },
        { label: "Axial tilt", value: "97.8°" },
      ],
      live: FROM_EARTH,
      module: {
        title: "The seasons of Uranus",
        intro: "The same diagram as for Earth, with an axis tilted by 98°. Reference latitude: 49° north, like Paris.",
        button: "The seasons of Uranus",
      },
    },
    neptune: {
      rank: PLANET_RANK,
      hook: "Found by calculation before it was ever seen.",
      lede: "In 1846, Urbain Le Verrier noticed that Uranus was straying from its expected path. From this, he worked out the position of an unknown planet. On 23 September, Johann Galle pointed his telescope at the spot: Neptune was there, about one degree from the prediction. Since then, it has completed only one orbit of the Sun, in 2011.",
      facts: [
        { label: "Distance from the Sun", value: "30.1 AU", note: "4.5 billion km" },
        { label: "Diameter", value: "49,528 km", note: "3.9 Earths" },
        { label: "One year", value: "164.8 years" },
        { label: "One day", value: "16 h 06 min" },
        { label: "Cloud tops", value: "−200 °C" },
        { label: "Gravity", value: "1.14 g" },
        { label: "Moons", value: "16 known" },
        { label: "Winds", value: "up to 2,100 km/h" },
      ],
      live: FROM_EARTH,
      module: {
        title: "A single Neptune year",
        intro:
          "The dial shows one full orbit of Neptune round the Sun, since its discovery. Find where your life fits on it.",
        button: "Your age on Neptune",
      },
    },
  },
  interlude: {
    title: "The asteroid belt",
    text: "Between Mars and Jupiter, more than a million known asteroids. Put together, they would weigh barely 3% as much as the Moon.",
    cite: "The main belt, between 2.1 and 3.3 AU from the Sun",
  },
  beyond: {
    rank: "Beyond Neptune",
    name: "The great void",
    hook: "Distances, to scale at last.",
    lede: "Beyond Neptune lies the Kuiper belt: thousands of icy bodies, including Pluto, classed as a dwarf planet since 2006. Further out still travels Voyager 1, launched in 1977. In November 2026, it will reach one light-day from Earth: 25.9 billion km.",
    scaleTitle: "Distances in light travel time from the Sun",
    marks: {
      neptune: { label: bodyName("neptune", "en"), value: "4 h 10 min" },
      pluto: { label: "Pluto", value: "5 h 28 min" },
      kuiper: { label: "Kuiper", value: "≈ 7 h" },
      voyager2: { label: "Voyager 2", value: "≈ 20 h" },
      voyager1: { label: "Voyager 1", value: "≈ 24 h" },
    },
    scaleStart: "Sun, 0 h",
    spoken,
    spokenScale: (marks: readonly BeyondMarkTexts[]) =>
      `${marks.map(({ label, value }) => `${label}: ${spoken(value)}`).join("; ")}.`,
    back: "Back to the Sun",
  },
  footer: {
    sources: `Sources: NASA, Planetary Fact Sheet; JPL, approximate orbital elements of the planets (valid from 1800 to 2050); numbers of moons: NASA and IAU, 2025. Nearby stars: ${nearbyStarsSource("en")}. Milky Way: simplified model based on Reid et al. (2019), GRAVITY Collaboration (2022) and NASA.`,
    scale:
      "Except in “real distances” mode, sizes are enlarged and distances compressed so that everything fits on the screen.",
    textures: {
      before: "Maps of the planets and the Moon: ",
      source: { label: "Solar System Scope", href: ABOUT_URLS.solarSystemScope },
      between: ", based on NASA data, resized for this site. Licence: ",
      license: { label: "CC BY 4.0", href: ccByUrl("en") },
      after: ".",
    },
  },
  skipToDock: "Skip to the time machine",
};
