import { afterEach, describe, expect, it, vi } from "vitest";
import { getCommonContent } from "@/content/common/content";
import { LOCALES } from "@/i18n/locales";
import { pageMetadata, rootMetadata, siteOrigin } from "@/i18n/metadata";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteOrigin", () => {
  it("devrait prendre le domaine de production de Vercel, en https, quand il est connu", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "astro.example");
    expect(siteOrigin().origin).toBe("https://astro.example");
  });

  it.each([
    { why: "absent", value: undefined },
    { why: "vide", value: "" },
  ])("devrait prendre le serveur local quand le domaine de production est $why", ({ value }) => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", value);
    expect(siteOrigin().origin).toBe("http://localhost:3000");
  });
});

describe("rootMetadata", () => {
  it("devrait composer les adresses relatives des pages avec l'origine du site", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "astro.example");
    expect(String(rootMetadata("fr").metadataBase)).toBe("https://astro.example/");
  });

  it("devrait suffixer le titre des pages par le nom du site, et n'afficher que lui par défaut", () => {
    expect(rootMetadata("en").title).toEqual({ template: "%s · Astronomie", default: "Astronomie" });
  });

  it.each(LOCALES)("devrait décrire le site dans la langue de la page (%s)", (locale) => {
    expect(rootMetadata(locale).description).toBe(getCommonContent(locale).description);
  });
});

describe("pageMetadata", () => {
  it("devrait donner à la page Voyage en anglais son adresse canonique, ses trois langues et l'adresse négociée", () => {
    expect(pageMetadata("voyage", "en").alternates).toEqual({
      canonical: "/en/voyage",
      languages: { fr: "/fr/voyage", en: "/en/voyage", es: "/es/voyage", "x-default": "/voyage" },
    });
  });

  it("devrait faire pointer x-default de l'accueil vers la racine, que le proxy négocie", () => {
    expect(pageMetadata("home", "es").alternates).toEqual({
      canonical: "/es",
      languages: { fr: "/fr", en: "/en", es: "/es", "x-default": "/" },
    });
  });

  it("devrait annoncer à Open Graph la langue de la page, et les deux autres comme variantes", () => {
    expect(pageMetadata("voyage", "en").openGraph).toMatchObject({
      locale: "en_GB",
      alternateLocale: ["fr_FR", "es_ES"],
    });
  });

  it("devrait donner à Open Graph le type, le nom du site, l'adresse, le titre et la description de la page", () => {
    const { title, description } = getCommonContent("es").pages.sizes;
    expect(pageMetadata("sizes", "es").openGraph).toMatchObject({
      type: "website",
      siteName: "Astronomie",
      url: "/es/tailles",
      title,
      description,
    });
  });

  it("devrait décrire la page dans sa langue", () => {
    expect(pageMetadata("about", "es").description).toBe(getCommonContent("es").pages.about.description);
  });

  it("devrait poser sur l'accueil un titre absolu, que le gabarit du site ne suffixe pas", () => {
    expect(pageMetadata("home", "fr").title).toEqual({ absolute: getCommonContent("fr").pages.home.title });
  });

  it.each(["voyage", "sizes", "about"] as const)(
    "devrait laisser le gabarit du site suffixer le titre de la page %s",
    (page) => {
      expect(pageMetadata(page, "en").title).toBe(getCommonContent("en").pages[page].title);
    },
  );
});
