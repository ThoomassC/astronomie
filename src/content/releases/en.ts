import type { ReleasesContent } from "./types";

/** Notes de version, en anglais (britannique) : phrases courtes, sans vocabulaire technique. */
export const RELEASES_EN: ReleasesContent = {
  title: "Release notes",
  intro: "What changes on the site, release by release, from the newest to the oldest.",
  toc: "All releases",
  version: "Version",
  latest: "Latest version",
  releases: [
    {
      version: "1.1.0",
      summary:
        "Four black holes join the stars in Sizes, the Journey and the Home page get finer details, and browsing on a phone has been redesigned.",
      sections: [
        {
          heading: "What's new",
          items: [
            "Four black holes in the Sizes tab: Cygnus X-1, Sagittarius A*, M87* and the Cosmic Horseshoe black hole.",
            "On a phone, the card for the body on screen stays at the top for the whole journey.",
            "This page, Release notes, tells you what changes in each version.",
          ],
        },
        {
          heading: "Sizes",
          items: [
            "The black holes take their place among the stars by the size of their shadow, about 2.6 times that of their horizon.",
            "Each black hole is worked out on screen: its shadow, its ring of light and the background stars, bent as if by a magnifying glass.",
            "Cygnus X-1 is surrounded by a disc of scorching gas, M87* shoots out a long jet and Sagittarius A* wears a faint ring.",
            "The Cosmic Horseshoe black hole, weighed in 2025, is one of the largest known: 36 billion times the mass of the Sun.",
            "Each black hole has its own card and sources, and the size ruler runs from a ten-thousandth to a million solar radii.",
            "Rigel and Sirius, two very hot stars, now have a darker edge and a bluish glow.",
          ],
        },
        {
          heading: "Journey",
          items: [
            "The distance ruler is lighter: the current stop and its neighbours keep their names, the others show them on hover.",
            "At each planet, its orbit fades around it and the other planets dim.",
            "Names now sit above each body, and above the rings for Saturn and Uranus.",
            "The nearby stars shine brighter; six of them show their distance.",
            "Text fades out gently under the top bar and under the controls at the bottom.",
            "Text is larger and planet images fade in.",
          ],
        },
        {
          heading: "Home",
          items: [
            "The three doors are illustrated, with the Journey in front.",
            "On the orrery, planet names move out of the crowded centre, linked to their planet by a thin brass line.",
            "When the page opens, the planets glide to where they are today.",
            "The key figures are shown in large type, and the About page lines up with the top bar.",
          ],
        },
        {
          heading: "Phones",
          items: [
            "In the Journey and in Sizes, a card fixed at the top of the screen shows the current stop, with arrows to the previous and next ones.",
            "Tapping the name opens its details, which scroll inside the card.",
            "While moving from one stop to the next, a placeholder card holds its place.",
            "In the Journey and Sizes, the top bar always stays in place, in portrait and in landscape.",
            "The buttons at the bottom are easier to tap, and the names of bodies keep clear of the bar.",
          ],
        },
        {
          heading: "Accessibility",
          items: [
            "When the card moves to another stop, the keyboard stays in the right place.",
            "A screen reader always reads the stops in page order.",
            "Without JavaScript, each card stays in the page and can be read in full.",
          ],
        },
      ],
    },
    {
      version: "1.0.0",
      summary:
        "The first public release: today's Solar System, a journey out to the multiverse and the sizes of the stars, in three languages.",
      sections: [
        {
          heading: "Home",
          items: [
            "An orrery shows the eight planets where they are today, with the Earth marked “You are here”.",
            "Three doors lead to the Journey, to Sizes and to the About page.",
            "Four key figures set the scale, from the 109 Earths across the Sun to Proxima Centauri, 4.2 light years away.",
          ],
        },
        {
          heading: "Journey",
          items: [
            "Seventeen stops, from the Sun to the multiverse, past every planet, the nearby stars, the Milky Way and other galaxies.",
            "The planets start from where they really are today.",
            "A time machine runs through days or years, and a switch shows the real distances.",
            "The Sun is worked out live, with sunspots that follow the solar cycle, and its corona.",
            "“Orbit” takes you round each body, and “Seen from Earth” shows a planet as we see it from here.",
            "An animation at each stop: the race of light, the seasons, your weight on each planet, Neptune's year…",
          ],
        },
        {
          heading: "Sizes",
          items: [
            "Ten stars side by side and to the same scale, from little Proxima Centauri to huge VY Canis Majoris, the Sun included.",
            "Each card gives the radius, the temperature and its colour, the distance, and how far the star would reach in the Sun's place.",
            "A size ruler places each star at a glance.",
          ],
        },
        {
          heading: "Across the site",
          items: [
            "The About page explains why this site exists and where its figures come from.",
            "The site speaks French, English and Spanish; switching language keeps the page and the place you were looking at.",
            "On a phone, a menu gathers the tabs and the languages.",
          ],
        },
        {
          heading: "Accessibility",
          items: [
            "Everything works with a keyboard, with a link to skip straight to the content.",
            "Animations calm down when the device asks for less motion.",
            "Without JavaScript, the pages stay readable and the links work.",
          ],
        },
      ],
    },
  ],
};
