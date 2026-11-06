import { getVoyageContent } from "@/content/voyage/content";
import { BEYOND_MARKS } from "@/content/voyage/structure";
import type { Locale } from "@/i18n/locales";
import { STOP_IDS } from "@/lib/journey/stopIds";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";
import { Plate } from "./Plate";
import { ScaleToggle } from "./ScaleToggle";
import { JourneySteps } from "./StopSteps";

/** L'échelle couvre 24 heures-lumière. */
const SCALE_HOURS = 24;
/**
 * Hauteur des repères, en rem : une hauteur par repère, croissante avec la distance,
 * pour qu'aucune étiquette n'en recouvre une autre, même sur un écran étroit.
 */
const MARK_BASE_REM = 1.5;
const MARK_STEP_REM = 1.1;

const TITLE_ID = `${STOP_IDS.beyond}-titre`;

/** Repères au-delà de la mi-échelle : étiquette à gauche du trait pour rester dans la plaque. */
const isRightAligned = (hours: number) => hours > SCALE_HOURS / 2;

/**
 * Dernière escale du système solaire, dans la langue de la page : la ceinture de Kuiper et les sondes Voyager, en
 * heures-lumière. L'échelle dessinée est masquée aux lecteurs d'écran, qui en entendent une phrase complète.
 */
export function BeyondPlate({ locale, sunHref }: { locale: Locale; sunHref: `#${string}` }) {
  const { beyond, plate } = getVoyageContent(locale);
  const marks = BEYOND_MARKS.map((mark) => ({ ...mark, ...beyond.marks[mark.key] }));
  return (
    <section className="stop" id={STOP_IDS.beyond} data-stop="beyond" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <Plate
        id={STOP_IDS.beyond}
        name={beyond.name}
        color="var(--laiton)"
        header={
          <p className="rank">
            <i aria-hidden="true" />
            {beyond.rank}
          </p>
        }
        title={<h2 id={TITLE_ID}>{beyond.name}</h2>}
        hook={beyond.hook}
        sections={[
          {
            key: "suite",
            label: plate.more,
            content: (
              <>
                <p className="lede">{beyond.lede}</p>

                <h3 className="lightscale-title">{beyond.scaleTitle}</h3>
                <div className="lightscale" aria-hidden="true">
                  {marks.map((mark, index) => (
                    <span
                      key={mark.key}
                      className={isRightAligned(mark.hours) ? "r" : undefined}
                      style={cssVars(
                        { "--lc": mark.color },
                        {
                          left: `${(mark.hours / SCALE_HOURS) * 100}%`,
                          height: `${MARK_BASE_REM + index * MARK_STEP_REM}rem`,
                        },
                      )}
                    >
                      <b>{mark.label}</b> {mark.value}
                    </span>
                  ))}
                </div>
                <div className="axis-l" aria-hidden="true">
                  <span>{beyond.scaleStart}</span>
                  <span>{SCALE_HOURS / 2} h</span>
                  <span>{SCALE_HOURS} h</span>
                </div>
                <p className="sr">{beyond.spokenScale(marks)}</p>
              </>
            ),
          },
        ]}
        steps={<JourneySteps stop="beyond" locale={locale} />}
        footer={
          <div className="actions">
            <ScaleToggle className="btn" />
            <GoToLink className="btn ghost" href={sunHref} stop="sun">
              {beyond.back}
            </GoToLink>
          </div>
        }
      />
    </section>
  );
}
