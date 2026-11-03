import { describe, expect, it, vi } from "vitest";
import { LOCALES, type Locale } from "@/i18n/locales";
import { STOP_IDS } from "@/lib/journey/stopIds";
import { legacyRedirectScript, legacyRedirectTarget } from "@/components/home/legacyRedirect";

/** Ancres des escales qui quittent l'accueil : toutes, sauf celle de la vue d'ensemble. */
const VOYAGE_IDS = Object.values(STOP_IDS).filter((id) => id !== "accueil");

/** Fragments qui doivent laisser l'accueil tel quel. */
const STAYING_HASHES = ["#accueil", "#inconnu", "", "#", "#Saturne", "saturne", "#saturne/", "#contenu"] as const;

/** Exécute le script en ligne comme le navigateur, avec un faux `location` ; renvoie l'espion de `replace`. */
function runScript(hash: string, locale: Locale) {
  const replace = vi.fn();
  new Function("location", legacyRedirectScript(locale))({ hash, replace });
  return replace;
}

describe("legacyRedirectTarget", () => {
  it.each([
    ["#saturne", "en", "/en/voyage#saturne"],
    ["#etoiles-voisines", "es", "/es/voyage#etoiles-voisines"],
    ["#soleil", "fr", "/fr/voyage#soleil"],
    ["#voie-lactee", "fr", "/fr/voyage#voie-lactee"],
  ] as const)("devrait renvoyer « %s » (%s) vers l'escale du voyage, « %s »", (hash, locale, target) => {
    expect(legacyRedirectTarget(hash, locale)).toBe(target);
  });

  it.each(VOYAGE_IDS)("devrait renvoyer l'ancienne ancre « #%s » vers la même ancre du voyage", (id) => {
    expect(legacyRedirectTarget(`#${id}`, "fr")).toBe(`/fr/voyage#${id}`);
  });

  it.each(STAYING_HASHES)("devrait laisser l'accueil tel quel pour « %s » (accueil, inconnu, casse)", (hash) => {
    expect(legacyRedirectTarget(hash, "fr")).toBeNull();
  });
});

describe("legacyRedirectScript", () => {
  it.each(LOCALES)("devrait appeler location.replace une fois, vers la cible attendue (%s)", (locale) => {
    for (const id of VOYAGE_IDS) {
      const replace = runScript(`#${id}`, locale);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith(legacyRedirectTarget(`#${id}`, locale));
    }
  });

  it.each(STAYING_HASHES)("ne devrait jamais rediriger pour « %s » : pas de boucle sur l'accueil", (hash) => {
    expect(runScript(hash, "fr")).not.toHaveBeenCalled();
  });

  it("devrait rester en ES5, sans dépendance : il s'exécute à l'analyse de la page, avant tout module", () => {
    const script = legacyRedirectScript("fr");
    expect(script).not.toMatch(/=>|\blet\b|\bconst\b|`|\.includes\(|\bimport\b|\brequire\(/);
  });

  it("ne devrait jamais pouvoir fermer la balise <script> qui le porte", () => {
    LOCALES.forEach((locale) => expect(legacyRedirectScript(locale)).not.toMatch(/<\/?script|<!--/i));
  });
});
