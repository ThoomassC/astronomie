import { describe, expect, it } from "vitest";
import { BEYOND, FOOTER, HERO, PLATE_MORE } from "@/content/site";
import { STOPS, type BodyStop, type InterludeStop } from "@/content/stops";
import { getVoyageContent } from "@/content/voyage/content";
import { BEYOND_MARKS, SOLAR_STOP_STRUCTURE } from "@/content/voyage/structure";
import { bodyName } from "@/i18n/names";
import { STOP_IDS } from "@/lib/journey/stopIds";

/*
 * Garde de migration : le français du voyage reste mot pour mot celui des anciens contenus, gelés jusqu'à la clôture
 * (`src/content/site.ts`, `src/content/stops.ts`). La clôture supprime ce fichier avec eux.
 */

const FR = getVoyageContent("fr");
const BODY_STOPS = STOPS.filter((stop): stop is BodyStop => stop.kind === "body");
const BELT = STOPS.find((stop): stop is InterludeStop => stop.kind === "interlude");

describe("français du voyage, identique aux anciens contenus", () => {
  it("devrait garder l'ordre des escales, la ceinture entre Mars et Jupiter", () => {
    expect(SOLAR_STOP_STRUCTURE.map(({ kind, key }) => [kind, key])).toEqual(STOPS.map(({ kind, key }) => [kind, key]));
  });

  it.each(BODY_STOPS)("devrait garder l'escale « $key » : ancre, nom, couleur, rang, module", (stop) => {
    const structure = SOLAR_STOP_STRUCTURE.find(({ key }) => key === stop.key);
    expect(structure).toEqual({
      kind: "body",
      key: stop.key,
      color: stop.color,
      ...(stop.rank.ordinal === undefined ? {} : { ordinal: stop.rank.ordinal }),
      module: stop.module.kind,
    });
    expect(STOP_IDS[stop.key]).toBe(stop.id);
    expect(bodyName(stop.key, "fr")).toBe(stop.name);
  });

  it.each(BODY_STOPS)("devrait garder mot pour mot les textes de l'escale « $key »", (stop) => {
    expect(FR.bodies[stop.key]).toEqual({
      rank: stop.rank.label,
      hook: stop.hook,
      lede: stop.lede,
      facts: stop.facts,
      live: stop.live.label,
      module: { title: stop.module.title, intro: stop.module.intro, button: stop.module.button },
    });
  });

  it("devrait garder l'interlude de la ceinture, et son titre pour les lecteurs d'écran", () => {
    expect(STOP_IDS.belt).toBe(BELT?.id);
    expect(FR.interlude).toEqual({ title: "La ceinture d'astéroïdes", text: BELT?.text, cite: BELT?.cite });
  });

  it("devrait garder l'accueil, et la phrase qui décrit la scène", () => {
    expect(FR.hero).toEqual({
      ...HERO,
      sceneDescription:
        "En arrière-plan, une vue 3D du système solaire aux positions du jour ; la caméra suit le défilement.",
    });
  });

  it("devrait garder les boutons des plaques", () => {
    expect(FR.plate).toEqual({ story: PLATE_MORE.story, more: PLATE_MORE.beyond });
  });

  it("devrait garder l'au-delà : textes, repères de l'échelle, origine de l'axe", () => {
    const { marks, spoken, spokenScale, ...texts } = FR.beyond;
    expect(STOP_IDS.beyond).toBe(BEYOND.id);
    expect(texts).toEqual({
      rank: BEYOND.rank,
      name: BEYOND.name,
      hook: BEYOND.hook,
      lede: BEYOND.lede,
      scaleTitle: BEYOND.scaleTitle,
      scaleStart: "Soleil, 0 h",
      back: BEYOND.back,
    });
    expect(BEYOND_MARKS.map(({ key, hours, color }) => ({ ...marks[key], hours, color }))).toEqual(BEYOND.marks);
    expect(typeof spoken).toBe("function");
    expect(typeof spokenScale).toBe("function");
  });

  it("devrait garder le pied de page et le lien d'évitement vers le dock", () => {
    expect(FR.footer).toEqual(FOOTER);
    expect(FR.skipToDock).toBe("Aller à la machine à remonter le temps");
  });
});
