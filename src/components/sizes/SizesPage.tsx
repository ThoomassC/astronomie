import { MAIN_ID } from "@/components/journey/ids";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ContactFooter } from "@/components/site/ContactFooter";
import { SkipToContent } from "@/components/site/SkipToContent";
import type { Locale } from "@/i18n/locales";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { BlackHolePlate } from "./BlackHolePlate";
import { CurrentObject } from "./CurrentObject";
import { SizesFragment } from "./SizesFragment";
import { SizesIntro } from "./SizesIntro";
import { SizesMenu } from "./SizesMenu";
import styles from "./SizesPage.module.css";
import { SizesRail } from "./SizesRail";
import { SizesCards } from "./SizesCards";
import { SizesSceneMount } from "./SizesSceneMount";
import { SizesTracker } from "./SizesTracker";
import { StarPlate } from "./StarPlate";

/** Rang du plus grand astre : sa plaque ramène au plus petit. */
const LARGEST = COMPARED_OBJECTS.length - 1;
const SMALLEST = COMPARED_OBJECTS[0].key;
/** Escales qui ont une plaque, donc une carte sur téléphone : tous les astres, pas l'introduction. */
const CARD_STOPS = COMPARED_OBJECTS.map((object) => object.key);

/**
 * Page « Tailles », dans la langue de l'adresse : une section par astre (dix étoiles, quatre trous noirs), du plus petit
 * au plus grand, une scène 3D fixe derrière, la règle des tailles. Dans l'ordre du DOM, qui est l'ordre de lecture :
 * lien d'évitement, barre commune (astre affiché, menu des astres), règle, contenu (`main#contenu` : introduction,
 * quatorze plaques), pied de page commun (signature, contacts de l'auteur). La scène et ses étiquettes sont
 * décoratives : les plaques portent les noms et les nombres. Statique ; tout ce qui bouge vit dans des feuilles client.
 * Sans dock : la plaque compacte se colle au bas de l'écran (`--dock-clear`).
 */
export function SizesPage({ locale }: { locale: Locale }) {
  return (
    <div className={styles.page}>
      <SkipToContent locale={locale} />
      <SiteHeader locale={locale} page="sizes">
        <CurrentObject />
        <SizesMenu />
        <SizesFragment />
      </SiteHeader>
      <SceneErrorBoundary>
        <SizesSceneMount />
      </SceneErrorBoundary>
      <SizesRail />
      <main id={MAIN_ID} tabIndex={-1}>
        <SizesIntro locale={locale} />
        <SizesCards cards={CARD_STOPS}>
          {COMPARED_OBJECTS.map((object, i) => {
            const restartTo = i === LARGEST ? SMALLEST : undefined;
            return object.kind === "star" ? (
              <StarPlate key={object.key} star={object} locale={locale} restartTo={restartTo} />
            ) : (
              <BlackHolePlate key={object.key} hole={object} locale={locale} restartTo={restartTo} />
            );
          })}
        </SizesCards>
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
