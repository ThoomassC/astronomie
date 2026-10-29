import { ABOUT_URLS, ccByUrl, numberSample } from "./structure";
import type { AboutContent } from "./types";

/**
 * About page, in British English: “ ” quotation marks, British spelling (centre, kilometres, licence as a noun).
 * Link names are proper names, left in their own language.
 */
export const ABOUT_EN: AboutContent = {
  title: "About",
  intro: "An online orrery, to get a feel for real sizes and real distances.",
  toc: "On this page",
  external: "external site",
  sections: [
    {
      id: "pourquoi",
      heading: "Why this site",
      paragraphs: [
        "The Earth is nearly 150 million kilometres from the Sun: an accurate number, but impossible to picture. This site helps you feel the distances and sizes of space by travelling through them.",
        "The Journey starts at the Sun, passes each planet, then heads out to the nearby stars, the Milky Way, other galaxies and beyond. At the Sun and at each planet, an animation explains a phenomenon: the seasons, orbits, the speed of light… The Sizes tab compares ten stars, from the red dwarf Proxima Centauri to the hypergiant VY Canis Majoris.",
      ],
    },
    {
      id: "pour-qui",
      heading: "Who it is for",
      paragraphs: [
        "Anyone curious about the sky, aged 12 and over. No prior knowledge is needed: you go at your own pace by scrolling down the page, and numbers are compared with familiar things, such as the 109 Earths it would take to span the Sun from edge to edge.",
      ],
    },
    {
      id: "demarche",
      heading: "The approach",
      paragraphs: [
        "The data are real and come from published sources. When the page loads, each planet is in its true position for the day, calculated from JPL orbital elements; the time machine then runs through the days, up to a year per second.",
        "Not everything fits on a screen at true scale. In the Solar System, the planets are enlarged and the distances squeezed; the “Real distances” switch puts the distances back to scale, and you mostly see empty space. At the nearby stars, the distances are to scale, but the stars are enlarged. In the Sizes tab, they keep their true proportions.",
        "Some views are illustrations: nobody can photograph the Milky Way from outside, the cosmic web is drawn by a program, and the multiverse is a hypothesis that has never been observed. Their texts say so.",
      ],
    },
    {
      id: "sources",
      heading: "Data sources",
      paragraphs: [
        "The numbers come from space agencies and scientific papers; here are the main sources. The radii of the stars in the Sizes tab come from published measurements, star by star.",
      ],
      links: [
        {
          label: "NASA, Planetary Fact Sheet",
          href: ABOUT_URLS.nasaFactSheet,
          description: "Physical data on the planets.",
        },
        {
          label: "JPL, Approximate Positions of the Planets",
          href: ABOUT_URLS.jplApproximatePositions,
          description: "Orbital elements of the planets, valid from 1800 to 2050: their positions on any given day.",
        },
        {
          label: "ESA, Gaia DR3",
          href: ABOUT_URLS.gaiaDr3,
          description: "Distances to the nearby stars, supplemented by Hipparcos and RECONS.",
        },
        { label: "CDS, SIMBAD", href: ABOUT_URLS.simbad, description: "Positions of the stars in the sky." },
        {
          label: "GRAVITY Collaboration, 2022",
          href: ABOUT_URLS.gravity2022,
          description: "Distance from the Sun to the centre of the Galaxy.",
        },
        { label: "Reid et al., 2019", href: ABOUT_URLS.reid2019, description: "Shape of the Milky Way's spiral arms." },
        { label: "McConnachie, 2012", href: ABOUT_URLS.mcConnachie2012, description: "Galaxies of the Local Group." },
        {
          label: "Planck Collaboration, 2020",
          href: ABOUT_URLS.planck2018,
          description: "Age and size of the observable Universe.",
        },
      ],
    },
    {
      id: "credits",
      heading: "Credits",
      paragraphs: ["Maps, typefaces and software the site reuses, with their licences:"],
      links: [
        {
          label: "Solar System Scope",
          href: ABOUT_URLS.solarSystemScope,
          description:
            "Maps of the planets, the Moon and the Milky Way, based on NASA data. CC BY 4.0 licence; renamed, resized, and one converted to JPEG.",
        },
        {
          label: "CC BY 4.0 licence",
          href: ccByUrl("en"),
          description: "Terms for reusing the Solar System Scope maps.",
        },
        {
          label: "Bodoni Moda",
          href: ABOUT_URLS.bodoniModa,
          description: "Typeface for the headings, by Owen Earl. SIL Open Font License (OFL).",
        },
        {
          label: "Atkinson Hyperlegible Next",
          href: ABOUT_URLS.atkinsonHyperlegibleNext,
          description: "Typeface for the text, by the Braille Institute, designed for people with low vision. OFL licence.",
        },
        { label: "Three.js", href: ABOUT_URLS.threeJs, description: "Library behind the 3D scene. MIT License." },
        {
          label: "Next.js",
          href: ABOUT_URLS.nextJs,
          description: "The framework the site is built with, based on React. MIT License, like React.",
        },
      ],
    },
    {
      id: "accessibilite",
      heading: "Accessibility",
      paragraphs: [],
      entries: [
        {
          term: "Keyboard",
          text: "Skip links lead straight to the content, Esc closes menus, and in “Orbit” mode the arrow keys turn the view, plus and minus set the distance and 0 recentres it.",
        },
        {
          term: "Screen readers",
          text: "Pages are organised with headings and landmarks. The 3D scene is decorative: what it shows is written in each stop's text.",
        },
        {
          term: "Reduced motion",
          text: "If your device asks for it, time starts paused, animations wait for you to start them and transitions are instant.",
        },
        {
          term: "Contrast",
          text: "Text aims for a contrast ratio of at least 4.5:1 against its background, and controls for a size of at least 44 pixels.",
        },
        {
          term: "Text alternatives",
          text: "Every animation is described and its results are announced; the map of the nearby stars is also given as a table.",
        },
        {
          term: "Known limitations",
          text: "The scene and the animations remain mostly visual: their texts give the essentials, not everything. Without WebGL, a drawn Sun replaces the scene; without JavaScript, all the text can be read, but the scene, the animations and “Orbit” mode are missing.",
        },
      ],
      links: [
        {
          label: "Report an accessibility problem",
          href: ABOUT_URLS.issues,
          description: "On GitHub, in the project's issues.",
        },
      ],
    },
    {
      id: "confidentialite",
      heading: "Privacy",
      note: "No trackers, no ads. Just one cookie: the language you choose, kept for a year.",
      paragraphs: [
        "The “lang” cookie is only set if you choose a language, and it holds nothing else. The site does not measure its audience.",
        "What you type in, such as your weight or year of birth, is calculated in your browser and sent nowhere. Fonts and images come from the site itself.",
      ],
    },
    {
      id: "langues",
      heading: "Languages",
      paragraphs: [
        "The site is available in French, English and Spanish. The language menu at the top of each page switches between them; in the Journey and Sizes tabs, you stay at the same stop.",
        `Each language writes numbers its own way: ${numberSample("en")} in English, ${numberSample("fr")} in French, ${numberSample("es")} in Spanish.`,
      ],
    },
    {
      id: "code-source",
      heading: "Source code",
      paragraphs: [
        "The site's code is public: you can read how each position and each animation is calculated, and report a mistake.",
      ],
      links: [
        {
          label: "The site's source code",
          href: ABOUT_URLS.repository,
          description: "On GitHub. Written in TypeScript, with Next.js, React and Three.js.",
        },
        { label: "Report a mistake", href: ABOUT_URLS.issues, description: "On GitHub, in the project's issues." },
      ],
    },
  ],
};
