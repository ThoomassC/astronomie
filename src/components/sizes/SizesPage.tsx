import { MAIN_ID } from "@/components/journey/ids";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ContactFooter } from "@/components/site/ContactFooter";
import { SkipToContent } from "@/components/site/SkipToContent";
import type { Locale } from "@/i18n/locales";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { CurrentStar } from "./CurrentStar";
import { SizesFragment } from "./SizesFragment";
import { SizesIntro } from "./SizesIntro";
import { SizesMenu } from "./SizesMenu";
import styles from "./SizesPage.module.css";
import { SizesRail } from "./SizesRail";
import { SizesSceneMount } from "./SizesSceneMount";
import { SizesTracker } from "./SizesTracker";
import { StarPlate } from "./StarPlate";

/** Rang de la plus grande étoile : sa plaque ramène à la plus petite. */
const LARGEST = COMPARED_STARS.length - 1;

/**
 * Page « Tailles », dans la langue de l'adresse : une section par étoile, de la plus petite à la plus grande, une scène
 * 3D fixe derrière, la règle des tailles. Dans l'ordre du DOM, qui est l'ordre de lecture : lien d'évitement, barre
 * commune (étoile affichée, menu des étoiles), règle, contenu (`main#contenu` : introduction, dix plaques), pied de
 * page commun (signature, contacts de l'auteur). La scène et ses étiquettes sont décoratives : les plaques portent les
 * noms et les nombres. Statique ; tout ce qui bouge vit dans des feuilles client. Sans dock : la plaque compacte se
 * colle au bas de l'écran (`--dock-clear`).
 */
export function SizesPage({ locale }: { locale: Locale }) {
  return (
    <div className={styles.page}>
      <SkipToContent locale={locale} />
      <SiteHeader locale={locale} page="sizes">
        <CurrentStar />
        <SizesMenu />
        <SizesFragment />
      </SiteHeader>
      <SceneErrorBoundary>
        <SizesSceneMount />
      </SceneErrorBoundary>
      <SizesRail />
      <main id={MAIN_ID} tabIndex={-1}>
        <SizesIntro locale={locale} />
        {COMPARED_STARS.map((star, i) => (
          <StarPlate key={star.key} star={star} locale={locale} restartTo={i === LARGEST ? "proxima-centauri" : undefined} />
        ))}
      </main>
      <footer>
        <div className={styles.contact}>
          <ContactFooter locale={locale} />
        </div>
      </footer>
      <SizesTracker />
    </div>
  );
}
