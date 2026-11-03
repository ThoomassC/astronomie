import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/locales";
import { routeRequest } from "@/i18n/routing";

/**
 * Négocie la langue des chemins qui n'en portent pas (« / », « /voyage ») : 307 vers le même chemin et la même requête,
 * préfixés par la langue préférée — cookie `lang` valide, sinon Accept-Language, sinon français (`routeRequest`).
 * - La cible dépend de ces deux en-têtes : `Vary` le dit aux caches, qui ne la serviront pas à une autre personne.
 * - Aucun cookie n'est posé ici (un `Set-Cookie` rendrait la réponse non cachable) : seul le menu des langues le
 *   pose, sur action de la personne.
 * - Un chemin à langue continue sans réponse propre (défensif : le matcher l'exclut déjà).
 */
export function proxy(request: NextRequest): NextResponse | undefined {
  const { pathname, search } = request.nextUrl;
  const decision = routeRequest(
    { pathname, search },
    { cookie: request.cookies.get(LOCALE_COOKIE)?.value, acceptLanguage: request.headers.get("accept-language") },
  );
  if (decision.kind === "next") return undefined;
  return NextResponse.redirect(new URL(decision.location, request.url), {
    status: decision.status,
    headers: { Vary: "Accept-Language, Cookie" },
  });
}

export const config = {
  /*
   * Littéral lu tel quel au build (analyse statique : ni variable ni annotation). Le proxy ne voit que les chemins
   * sans langue : les pages (/fr, /en/voyage…) restent statiques et servies sans lui. Exclus aussi : les ressources
   * de Next (/_next/), les textures et tout fichier à extension (/icon.svg). Les langues doivent rester celles de
   * LOCALES : le test du proxy le vérifie.
   */
  matcher: ["/((?!fr/|fr$|en/|en$|es/|es$|_next/|textures/|.*\\..*).*)"],
};
