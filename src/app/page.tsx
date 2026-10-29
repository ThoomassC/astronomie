import { anchorOf } from "@/components/journey/anchors";
import { ClockDriver } from "@/components/journey/ClockDriver";
import { CosmicStops } from "@/components/journey/CosmicStops";
import { DistanceRail, type RailStop } from "@/components/journey/DistanceRail";
import { ExploreMode } from "@/components/journey/ExploreMode";
import { MAIN_ID } from "@/components/journey/ids";
import { JourneyTracker } from "@/components/journey/JourneyTracker";
import { ScaleNote } from "@/components/journey/ScaleNote";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { SkipLinks } from "@/components/journey/SkipLinks";
import { SolarStops } from "@/components/journey/SolarStops";
import { TimeDock } from "@/components/journey/TimeDock";
import { TopBar } from "@/components/journey/TopBar";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";
import { SceneMount } from "@/components/scene/SceneMount";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { RAIL_STOPS } from "@/lib/journey/camera";

/**
 * Le voyage : une section par escale, une scène 3D fixe derrière, la règle des distances
 * et la machine à remonter le temps. Statique ; tout ce qui bouge vit dans des feuilles client.
 * Ce que marque `data-hide-on-explore` s'efface et devient inerte pendant l'exploration (« Tourner autour ») ;
 * la scène et le dock du temps restent.
 */
export default function Home() {
  const sunHref = anchorOf("sun");
  const railStops: RailStop[] = RAIL_STOPS.map(({ key, au }) => ({ key, au, href: anchorOf(key) }));
  return (
    <>
      <SkipLinks />
      {/* Fond de repli sans scène 3D (classe `no3d`) : un Soleil dessiné en CSS. */}
      <div className="sky-fallback" aria-hidden="true" />
      <SceneErrorBoundary>
        <SceneMount />
      </SceneErrorBoundary>
      <TopBar stops={railStops} />
      <DistanceRail stops={railStops} />
      <main id={MAIN_ID} tabIndex={-1} data-hide-on-explore>
        <SolarStops locale={DEFAULT_LOCALE} sunHref={sunHref} />
        <CosmicStops locale={DEFAULT_LOCALE} sunHref={sunHref} />
      </main>
      <SiteFooter />
      <ScaleNote />
      {/* Avant le dock, sous lui à l'écran (z-index) : au clavier, la barre et le pavé d'exploration, puis le dock. */}
      <ExploreMode />
      <TimeDock />
      <ClockDriver />
      <JourneyTracker />
    </>
  );
}
