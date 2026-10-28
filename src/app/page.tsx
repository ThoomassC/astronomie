import { anchorOf } from "@/components/journey/anchors";
import { BeyondPlate } from "@/components/journey/BeyondPlate";
import { ClockDriver } from "@/components/journey/ClockDriver";
import { DistanceRail, type RailStop } from "@/components/journey/DistanceRail";
import { Hero } from "@/components/journey/Hero";
import { MAIN_ID } from "@/components/journey/ids";
import { Interlude } from "@/components/journey/Interlude";
import { JourneyTracker } from "@/components/journey/JourneyTracker";
import { ScaleNote } from "@/components/journey/ScaleNote";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { SkipLinks } from "@/components/journey/SkipLinks";
import { StopPlate } from "@/components/journey/StopPlate";
import { TimeDock } from "@/components/journey/TimeDock";
import { TopBar } from "@/components/journey/TopBar";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";
import { SceneMount } from "@/components/scene/SceneMount";
import { STOPS } from "@/content/stops";
import { RAIL_STOPS } from "@/lib/journey/camera";

/**
 * Le voyage : une section par escale, une scène 3D fixe derrière, la règle des distances
 * et la machine à remonter le temps. Statique ; tout ce qui bouge vit dans des feuilles client.
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
      <main id={MAIN_ID} tabIndex={-1}>
        <Hero sunHref={sunHref} />
        {STOPS.map((stop) =>
          stop.kind === "body" ? <StopPlate key={stop.key} stop={stop} /> : <Interlude key={stop.key} stop={stop} />,
        )}
        <BeyondPlate sunHref={sunHref} />
      </main>
      <SiteFooter />
      <ScaleNote />
      <TimeDock />
      <ClockDriver />
      <JourneyTracker />
    </>
  );
}
