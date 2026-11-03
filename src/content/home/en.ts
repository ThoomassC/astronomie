import type { HomeContent } from "./types";

export const HOME_EN: HomeContent = {
  intro: {
    title: "The Solar System, today.",
    text: "Every planet is drawn where it really is today. Travel from the Sun to faraway galaxies, or compare the sizes of the stars.",
    start: "Start the journey",
  },
  cards: {
    title: "Explore the site",
    items: {
      voyage: {
        title: "Journey",
        text: "Scroll to leave the Sun, pass every planet, then reach the stars and the galaxies. The Sun and every planet have their own fact sheet and animation.",
        action: "Start the journey",
      },
      sizes: {
        title: "Sizes",
        text: "Ten stars to the same scale, from tiny Proxima Centauri to enormous VY Canis Majoris.",
        action: "Compare the stars",
      },
      about: {
        title: "About",
        text: "Why this site exists, and where its numbers come from: the sources, from space agencies to scientific papers.",
        action: "Find out more",
      },
    },
  },
  figures: {
    title: "In numbers",
    items: {
      sunWidth: { caption: "Earths side by side to match the width of the Sun" },
      sunlight: { caption: "on average, for sunlight to reach us", spoken: "8 minutes and 19 seconds" },
      proxima: { unit: "light-years", caption: "to the nearest star to the Sun, Proxima Centauri" },
      largestStar: { caption: "Suns side by side to match VY Canis Majoris, the largest well-measured star" },
    },
    note: { before: "Rounded values. Full sources on the ", link: "About page", after: "." },
  },
};
