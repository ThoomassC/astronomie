import { StopSteps, type StopStep } from "@/components/journey/StopSteps";
import { getSizesContent } from "@/content/sizes/content";
import type { Locale } from "@/i18n/locales";
import { stopNeighbors } from "@/lib/journey/neighbors";
import { COMPARED_OBJECTS, type SizeObjectKey } from "@/lib/sizes/objects";
import { sizeStopAnchor } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/** Astres de la page, du plus petit au plus grand : ses escales, sans l'introduction. */
const SIZE_OBJECTS: readonly SizeObjectKey[] = COMPARED_OBJECTS.map(({ key }) => key);

/**
 * Astres voisins d'un astre de Tailles, dans la langue de la page : le nom court affiché, celui de la barre (« Fer à
 * cheval cosmique »), le nom entier dans le nom accessible (« Trou noir du Fer à cheval cosmique »). Rien avant le plus
 * petit, rien après le plus grand, dont la plaque ramène déjà au plus petit.
 */
export function SizesSteps({ object, locale }: { object: SizeObjectKey; locale: Locale }) {
  const { steps } = getSizesContent(locale);
  const t = SIZES_STRINGS[locale];
  const { previous, next } = stopNeighbors(SIZE_OBJECTS, object);
  const step = (key: SizeObjectKey | null, label: (name: string) => string): StopStep | null =>
    key === null
      ? null
      : { key, href: sizeStopAnchor(key), name: t.shortNames[key] ?? t.names[key], label: label(t.names[key]) };
  return <StopSteps previous={step(previous, steps.previous)} next={step(next, steps.next)} />;
}
