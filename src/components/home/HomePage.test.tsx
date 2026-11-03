import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeRoute, { generateMetadata } from "@/app/[lang]/page";
import { HomePage } from "@/components/home/HomePage";
import { legacyRedirectScript } from "@/components/home/legacyRedirect";
import { stubMatchMedia } from "@/components/modules/testUtils";
import { getHomeContent } from "@/content/home/content";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";
import { pathFor } from "@/i18n/routes";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

/** Espace fine insécable (U+202F) : le séparateur de milliers d'Intl en français. */
const NNBSP = "\u202f";

/** Accueil rendu comme sous le layout `[lang]`, qui pose la langue pour les composants client. */
function renderHome(locale: Locale) {
  return render(
    <LocaleProvider locale={locale}>
      <HomePage locale={locale} />
    </LocaleProvider>,
  );
}

/** Props de la route pour une langue d'adresse. */
const routeProps = (lang: string) => ({ params: Promise.resolve({ lang }), searchParams: Promise.resolve({}) });

beforeEach(() => {
  // Heure du build, que next.config fixe et que Next inscrit dans le code : ici, le 29 octobre 2026 à midi UTC.
  vi.stubEnv("BUILD_TIME", "2026-10-29T12:00:00.000Z");
  vi.spyOn(performance, "timeOrigin", "get").mockReturnValue(Date.UTC(2026, 9, 29, 12));
  // Le planétaire suit la préférence de mouvement réduit : jsdom n'a pas matchMedia.
  stubMatchMedia({ reduced: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("HomePage", () => {
  it.each(LOCALES)("devrait titrer la page et mener au voyage par son seul bouton plein (%s)", (locale) => {
    const { intro } = getHomeContent(locale);
    renderHome(locale);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(intro.title);
    expect(screen.getByRole("link", { name: intro.start })).toHaveAttribute("href", pathFor("voyage", locale));
  });

  it.each([
    ["fr", ["Voyage", "Tailles", "À propos"]],
    ["en", ["Journey", "Sizes", "About"]],
    ["es", ["Viaje", "Tamaños", "Acerca de"]],
  ] as const)("devrait ouvrir une carte vers chaque autre page, nommée par son titre (%s)", (locale, names) => {
    renderHome(locale);
    const cards = screen.getByRole("region", { name: getHomeContent(locale).cards.title });
    const links = within(cards).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(names);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      pathFor("voyage", locale),
      pathFor("sizes", locale),
      pathFor("about", locale),
    ]);
  });

  it("devrait illustrer chaque carte d'un dessin caché aux lecteurs d'écran, son titre restant le seul lien", () => {
    renderHome("fr");
    const region = screen.getByRole("region", { name: getHomeContent("fr").cards.title });
    const cards = within(region).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.querySelector("svg[viewBox='0 0 240 100']")).toHaveAttribute("aria-hidden", "true");
      card.querySelectorAll("svg").forEach((svg) => expect(svg).toHaveAttribute("aria-hidden", "true"));
      expect(within(card).getAllByRole("link")).toHaveLength(1);
    }
  });

  it("devrait mettre en avant la carte du Voyage, et elle seule", () => {
    renderHome("fr");
    const region = screen.getByRole("region", { name: getHomeContent("fr").cards.title });
    const featured = within(region)
      .getAllByRole("listitem")
      .filter((card) => card.hasAttribute("data-featured"));
    expect(featured).toHaveLength(1);
    expect(within(featured[0]).getByRole("link")).toHaveAttribute("href", pathFor("voyage", "fr"));
  });

  it("devrait hiérarchiser les titres : un h1, les sections en h2, les cartes en h3", () => {
    renderHome("fr");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Explorer le site",
      "En quelques chiffres",
    ]);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Voyage",
      "Tailles",
      "À propos",
    ]);
  });

  it.each([
    ["fr", "GitHub, site externe"],
    ["en", "GitHub, external site"],
    ["es", "GitHub, sitio externo"],
  ] as const)("devrait finir par le pied de page commun, aux contacts de l'auteur, sans plan du site (%s)", (locale, github) => {
    renderHome(locale);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: github })).toHaveAttribute("href", "https://github.com/ThoomassC");
    expect(within(footer).getByRole("link", { name: "caronthomas27@gmail.com" })).toBeInTheDocument();
    expect(within(footer).queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("devrait dessiner le planétaire dès le HTML du serveur, planètes comprises, à la date du build", () => {
    // Build le 1er octobre, chargement le 29 : le HTML dit le jour du build, pas l'horloge du serveur.
    vi.stubEnv("BUILD_TIME", "2026-10-01T12:00:00.000Z");
    const html = renderToString(
      <LocaleProvider locale="fr">
        <HomePage locale="fr" />
      </LocaleProvider>,
    );
    const page = new DOMParser().parseFromString(html, "text/html");
    expect(page.querySelectorAll("[data-planet]")).toHaveLength(8);
    expect(page.querySelector("[data-date]")?.textContent).toBe("Positions réelles du 1 octobre 2026");
  });

  it("devrait être la cible du lien d'évitement (main#contenu, focalisable par script)", () => {
    renderHome("fr");
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenu");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it.each([
    [
      "fr",
      [
        "109 Terres côte à côte pour égaler la largeur du Soleil",
        "8 minutes et 19 secondes en moyenne, pour que la lumière du Soleil arrive jusqu'à nous",
        "4,2 années-lumière jusqu'à l'étoile la plus proche du Soleil, Proxima du Centaure",
        `1${NNBSP}420 Soleils côte à côte pour égaler VY Canis Majoris, la plus grande étoile bien mesurée`,
      ],
    ],
    [
      "en",
      [
        "109 Earths side by side to match the width of the Sun",
        "8 minutes and 19 seconds on average, for sunlight to reach us",
        "4.2 light-years to the nearest star to the Sun, Proxima Centauri",
        "1,420 Suns side by side to match VY Canis Majoris, the largest well-measured star",
      ],
    ],
    [
      "es",
      [
        "109 Tierras en fila para igualar el ancho del Sol",
        "8 minutos y 19 segundos de media, para que la luz del Sol llegue hasta nosotros",
        "4,2 años luz hasta la estrella más cercana al Sol, Próxima Centauri",
        "1420 soles en fila para igualar a VY Canis Majoris, la estrella más grande bien medida",
      ],
    ],
  ] as const)("devrait lire chaque chiffre clé comme une phrase, en toutes lettres (%s)", (locale, sentences) => {
    renderHome(locale);
    const figures = screen.getByRole("region", { name: getHomeContent(locale).figures.title });
    const items = within(within(figures).getByRole("list")).getAllByRole("listitem");
    // Texte lu : sans la forme visible marquée aria-hidden (« 8 min 19 s »).
    const read = items.map((item) => {
      const copy = item.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[aria-hidden='true']").forEach((hidden) => hidden.remove());
      // Espaces ordinaires seulement : l'espace fine de « 1 420 » fait partie du nombre.
      return copy.textContent?.replace(/[ \t\n\r]+/g, " ").trim();
    });
    expect(read).toEqual(sentences);
  });

  it.each(LOCALES)("devrait renvoyer aux sources détaillées de la page À propos (%s)", (locale) => {
    const { figures } = getHomeContent(locale);
    renderHome(locale);
    const region = screen.getByRole("region", { name: figures.title });
    const link = within(region).getByRole("link", { name: figures.note.link });
    expect(link).toHaveAttribute("href", pathFor("about", locale));
  });
});

describe("Route de l'accueil", () => {
  it("devrait poser le script des anciens liens en premier, puis l'évitement, la barre et la page", async () => {
    const page = await HomeRoute(routeProps("en"));
    const { container } = render(<LocaleProvider locale="en">{page}</LocaleProvider>);
    const [script, skip, header, main, footer] = Array.from(container.children);
    expect(script.tagName).toBe("SCRIPT");
    expect(script.textContent).toBe(legacyRedirectScript("en"));
    expect(skip).toHaveAttribute("href", "#contenu");
    expect(header).toBe(screen.getByRole("banner"));
    expect(main).toBe(screen.getByRole("main"));
    expect(footer).toBe(screen.getByRole("contentinfo"));
  });

  it("devrait marquer l'onglet Accueil comme la page courante, dans la langue de l'adresse", async () => {
    render(<LocaleProvider locale="es">{await HomeRoute(routeProps("es"))}</LocaleProvider>);
    const current = within(screen.getByRole("banner")).getByRole("link", { current: "page" });
    expect(current).toHaveAttribute("href", "/es");
  });

  it.each(LOCALES)("devrait donner à l'accueil ses métadonnées dans sa langue (%s)", async (locale) => {
    expect(await generateMetadata(routeProps(locale))).toEqual(pageMetadata("home", locale));
  });

  it("devrait répondre 404 pour une langue inconnue, page comme métadonnées", async () => {
    await expect(HomeRoute(routeProps("de"))).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(generateMetadata(routeProps("de"))).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
