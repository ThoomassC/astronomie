import { BEYOND, PLATE_MORE } from "@/content/site";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";
import { Plate } from "./Plate";
import { ScaleToggle } from "./ScaleToggle";

/** L'échelle couvre 24 heures-lumière. */
const SCALE_HOURS = 24;
/**
 * Hauteur des repères, en rem : une hauteur par repère, croissante avec la distance,
 * pour qu'aucune étiquette n'en recouvre une autre, même sur un écran étroit.
 */
const MARK_BASE_REM = 1.5;
const MARK_STEP_REM = 1.1;

type Mark = (typeof BEYOND.marks)[number];

const TITLE_ID = `${BEYOND.id}-titre`;

/** Durée lue à voix haute : « ≈ 7 h » → « environ 7 heures », « 4 h 10 » → « 4 heures 10 ». */
function spokenDuration(value: string): string {
  return value
    .replace("≈", "environ")
    .replace(/(\d+) h(?: (\d+))?/, (_match: string, hours: string, minutes: string | undefined) =>
      `${hours} heure${hours === "1" ? "" : "s"}${minutes ? ` ${minutes}` : ""}`,
    );
}

/** Repères au-delà de la mi-échelle : étiquette à gauche du trait pour rester dans la plaque. */
const isRightAligned = (mark: Mark) => mark.hours > SCALE_HOURS / 2;

/** Dernière escale : la ceinture de Kuiper et les sondes Voyager, en heures-lumière. */
export function BeyondPlate({ sunHref }: { sunHref: `#${string}` }) {
  const marks = BEYOND.marks;
  return (
    <section className="stop" id={BEYOND.id} data-stop="beyond" tabIndex={-1} aria-labelledby={TITLE_ID}>
      <Plate
        id={BEYOND.id}
        name={BEYOND.name}
        color="var(--laiton)"
        header={
          <>
            <p className="rank">
              <i aria-hidden="true" />
              {BEYOND.rank}
            </p>
            <h2 id={TITLE_ID}>{BEYOND.name}</h2>
            <p className="hook">{BEYOND.hook}</p>
          </>
        }
        sections={[
          {
            key: "suite",
            label: PLATE_MORE.beyond,
            content: (
              <>
                <p className="lede">{BEYOND.lede}</p>

                <h3 className="lightscale-title">{BEYOND.scaleTitle}</h3>
                <div className="lightscale" aria-hidden="true">
                  {marks.map((mark, index) => (
                    <span
                      key={mark.label}
                      className={isRightAligned(mark) ? "r" : undefined}
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
                  <span>Soleil, 0 h</span>
                  <span>{SCALE_HOURS / 2} h</span>
                  <span>{SCALE_HOURS} h</span>
                </div>
                <p className="sr">
                  {marks.map((mark) => `${mark.label} : ${spokenDuration(mark.value)}`).join(" ; ")}.
                </p>
              </>
            ),
          },
        ]}
        footer={
          <div className="actions">
            <ScaleToggle className="btn" />
            <GoToLink className="btn ghost" href={sunHref} stop="sun">
              {BEYOND.back}
            </GoToLink>
          </div>
        }
      />
    </section>
  );
}
