import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { generateMetadata, generateStaticParams } from "@/app/[lang]/layout";
import { useLocale } from "@/i18n/LocaleProvider";
import { rootMetadata } from "@/i18n/metadata";

/** Hors du compilateur de Next, `next/font` ne charge rien : chaque police ne rend que le nom de sa variable CSS. */
vi.mock("next/font/google", () => {
  const font = ({ variable }: { variable: string }) => ({ variable });
  return { Bodoni_Moda: font, Atkinson_Hyperlegible_Next: font };
});

/** Ce que Next passe au layout `/[lang]` et à ses métadonnées. */
const props = (lang: string, children: ReactNode = null) => ({ params: Promise.resolve({ lang }), children });

/** Erreur que lève `notFound()` : Next la traduit en page 404. */
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

/** Composant client témoin : affiche la langue que lui donne le fournisseur. */
function LocaleProbe() {
  return <span>{useLocale()}</span>;
}

describe("layout racine /[lang]", () => {
  it("devrait produire au build les pages des trois langues, et elles seules", () => {
    expect(generateStaticParams()).toEqual([{ lang: "fr" }, { lang: "en" }, { lang: "es" }]);
  });

  it("devrait déclarer la langue de l'adresse comme langue du document", async () => {
    expect(renderToStaticMarkup(await RootLayout(props("es")))).toContain('<html lang="es"');
  });

  it("devrait donner la langue de l'adresse aux composants client, sans rien ajouter autour d'eux", async () => {
    expect(renderToStaticMarkup(await RootLayout(props("en", <LocaleProbe />)))).toContain(
      "<body><span>en</span></body>",
    );
  });

  it("devrait poser sur <html> les variables des trois polices et le défilement doux", async () => {
    const markup = renderToStaticMarkup(await RootLayout(props("fr")));
    expect(markup).toContain('class="--font-bodoni --font-bodoni-italic --font-atkinson"');
    expect(markup).toContain('data-scroll-behavior="smooth"');
  });

  it("devrait décrire le site dans la langue de l'adresse", async () => {
    await expect(generateMetadata(props("es"))).resolves.toEqual(rootMetadata("es"));
  });

  it("devrait répondre par une 404 à une langue que le site ne parle pas", async () => {
    await expect(RootLayout(props("de"))).rejects.toMatchObject(NOT_FOUND);
    await expect(generateMetadata(props("de"))).rejects.toMatchObject(NOT_FOUND);
  });
});
