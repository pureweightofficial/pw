import { Eyebrow, Section } from "@/components/ui/primitives";
import { journey } from "@/lib/site";
import { SectionScene } from "@/components/ui/SectionScene";
import { opener } from "@/lib/copy";

const copy = opener("journey", {
  eyebrow: "Chapter 02 — The Process",
  heading: "From Weight to",
  accent: "True Value",
  lead: "Four stages, in order, with nothing agreed until the last one. Each stage produces a fact that the next stage depends on.",
});

/**
 * THE VALUATION JOURNEY
 *
 * Four stages, and the section where the site's central idea does its work:
 * `scrollState.balance` runs 0 -> 1 across exactly this range, so the 3D
 * instrument in the hero comes level precisely as the visitor finishes reading
 * "Complete the Exchange". The concept is not decoration bolted onto the
 * process — the process *is* the animation's timeline.
 *
 * Progress is narrated by the rail beside the stages — one node per stage,
 * lighting as that stage becomes active. It is `aria-hidden` and paired with a
 * real ordered list, so the sequence is conveyed by document structure and not
 * by the indicator.
 *
 * Not pinned. Pinning four stages would trap the scroll for several screens on
 * mobile and is exactly the kind of "immersive" that makes a site tiring.
 */

export function ValuationJourney() {
  return (
    <Section
      id="journey"
      scrollSection="journey"
      material="stone"
      labelledBy="journey-heading"
      className="py-20 lg:py-28"
    >
      {/* THE LEFT COLUMN is the empty one — 4 columns holding a small
          indicator at the top, then nothing for the height of four stages,
          while the 8-column list of stages fills the right. (A comment here
          asserted the opposite for months, and every attempt to make the
          presented object visible therefore put metal behind the copy.) The
          specimen now occupies that void, sticky beside the stages, turning
          as the reader advances them. */}
      {/*
          The presented object itself, not an ambient suggestion of one. This
          slot was designed for a presented object from the start — the
          `reveal` scrim clears the right column for it — and the specimen is
          the first scene of the windowed-WebGL architecture: the same
          procedural mass and shared gold material as the world, framed where
          the copy describes what happens to it.
        */}
        <SectionScene
        variant="bar"
        channel="journey"
        scrim="reveal-left"
        scene="specimen"
        sticky
        /*
          DESKTOP ONLY, and this is a mount guard rather than a style.

          The specimen is composed into the grid's four-column left gutter,
          and below `lg` that gutter does not exist — the stages take the full
          width. At 390x844 the frame is 1.39 world units across, so an object
          seated at x -1.5 is entirely outside it: the canvas mounted,
          compiled shaders, and rendered a subject no phone could ever see.

          `hidden lg:block` prevents the mount, it does not merely hide it.
          SceneShell gates on useInViewport, a display:none host has a zero
          box, IntersectionObserver reports it as not intersecting, and
          shouldMount stays false — so no context is created and three.js is
          never asked to do anything. Services uses the same idiom for the
          same reason.
        */
        className="hidden lg:block"
      />
      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8 will-reveal">{copy.eyebrow}</Eyebrow>
          <h2
            id="journey-heading"
            className="font-display text-chapter text-ivory will-reveal"
          >
            {copy.heading}{" "}
            <span className="accent-italic text-gold-high/90">{copy.accent}</span>
          </h2>
          <p className="mt-7 max-w-xl text-lead text-ash will-reveal">
            {copy.lead}
          </p>
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/*
            THE LEFT COLUMN IS THE SPECIMEN'S, and holds no markup at all.

            It used to hold a sticky SVG gauge, alone, in four columns of
            otherwise empty space for the height of the whole section. Three
            things were wrong with that and they were all the same thing: the
            gauge was small in a void, its "Establishing / In Balance" label
            only ever flipped in the last 1.5% of the section so it read as
            static, and it collided with the specimen the moment the sticky
            canvas bottomed out and rode up with the section's tail.

            Progress moved to the rail on the stages themselves, where it can
            actually narrate which stage you are on. The column became what it
            visually already was: the frame the presented object sits in.
          */}
          <div className="hidden lg:col-span-4 lg:block" aria-hidden="true" />

          {/* --- The stages ------------------------------------------- */}
          <ol className="lg:col-span-8">
            {journey.map((stage, index) => (
              <li
                key={stage.step}
                data-journey-stage={index}
                className="journey-stage group relative border-t border-gold-antique/18 py-12 first:border-t-0 first:pt-0 lg:py-16"
              >
                {/* THE RAIL. A hairline down the left of the list with one
                    node per stage; the node fills and the rule above it
                    lights as that stage becomes active. This is the progress
                    device the gauge was failing to be — it says WHICH of the
                    four you are on, which is the only progress a reader of
                    this list actually wants. Decorative and aria-hidden: the
                    <ol> already conveys the sequence to assistive tech. */}
                <span
                  aria-hidden="true"
                  className="journey-rail pointer-events-none absolute top-0 -left-8 hidden h-full w-px bg-gold-antique/18 lg:block"
                >
                  <span className="journey-rail-fill absolute inset-x-0 top-0 block bg-gold-antique/70" />
                  <span className="journey-node absolute top-14 -left-[3px] block h-[7px] w-[7px] rotate-45 border border-gold-antique/45 bg-void" />
                </span>

                <div className="will-reveal">
                  <div className="flex items-baseline gap-6">
                    <span className="journey-step font-display text-5xl text-gold-antique/75 transition-colors duration-700 lg:text-6xl">
                      {stage.step}
                    </span>
                    <h3 className="font-display text-3xl tracking-tight text-ivory lg:text-4xl">
                      {stage.title}
                    </h3>
                  </div>

                  <p className="mt-6 max-w-xl text-lead text-ivory/72">
                    {stage.body}
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-ash">
                    {stage.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

/*
  BalanceIndicator lived here — the graduated arc and needle that used to
  occupy the left column. It is gone rather than parked, because dead code
  that looks live is a trap this repo has documented repeatedly: the obvious
  way to "restore" the left column would have been to mount it again, undoing
  the composition decision above.

  Nothing else read it. `scrollState.balance` still drives every beam-tilt
  divider on the page and the finale scene, so the concept the needle
  expressed is intact and is still measured by the same single source of
  truth; it simply is not drawn twice.
*/
