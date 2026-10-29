// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { legacyRedirectScript } from "@/components/home/legacyRedirect";
import { LegacyHashRedirect } from "@/components/home/LegacyHashRedirect";
import { LOCALES } from "@/i18n/locales";

describe("LegacyHashRedirect, rendu serveur", () => {
  it.each(LOCALES)("devrait écrire le script tel quel, exécutable par le navigateur dès l'analyse (%s)", (locale) => {
    expect(renderToStaticMarkup(<LegacyHashRedirect locale={locale} />)).toBe(
      `<script type="text/javascript">${legacyRedirectScript(locale)}</script>`,
    );
  });
});
