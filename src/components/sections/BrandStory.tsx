import { BeamDivider, Eyebrow, Fact, Placeholder, Section } from '@/components/ui/primitives';
import { brand, business } from '@/lib/site';

/**
 * BRAND STORY
 *
 * The section where invented heritage usually lives — the "since 1892", the
 * founder's grandfather, the family tradition. None of that is here, because
 * none of it has been supplied, and fabricating a founding date for a business
 * that handles other people's valuables is not a stylistic misstep. It is a
 * false claim about a real company.
 *
 * What is here instead: a genuine statement of approach (which is brand voice,
 * not fact), and clearly marked slots for the verified history when the client
 * provides it. The layout is complete and typeset — dropping the real copy in
 * changes nothing structural.
 */

export function BrandStory() {
  return (
    <Section id="story" material="walnut" labelledBy="story-heading" className="py-24 lg:py-40">
      <div className="shell">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <Eyebrow className="mb-8 will-reveal">The Pureweight Approach</Eyebrow>
              <h2
                id="story-heading"
                className="font-display text-chapter font-normal text-ivory will-reveal"
              >
                Weight can be measured.
                <br />
                <span className="accent-italic text-gold-high/90">Trust must be earned.</span>
              </h2>

              <BeamDivider className="mt-12 max-w-xs will-reveal" />

              <p className="mt-12 max-w-sm text-lead text-ash will-reveal">
                A scale settles because of physics. A customer settles because of how they were
                treated while it did.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="space-y-14">
              <section className="will-reveal">
                <h3 className="label mb-5">Why Pureweight exists</h3>
                <p className="text-lead text-ivory/72">
                  Most people who sell gold do it once or twice in their lives, often at a difficult
                  moment, and almost always without knowing what their item actually weighs or what
                  it is actually made of. That asymmetry is the whole problem with the trade.
                </p>
                <p className="mt-5 text-lead text-ivory/72">
                  {brand.shortName} is built on closing it: the weight is shown, the fineness is
                  shown, and the reasoning behind the figure is explained before any decision is
                  asked for.
                </p>
                <Placeholder label="[INSERT VERIFIED FOUNDING STORY]" />
              </section>

              <section className="will-reveal">
                <h3 className="label mb-5">On measurement</h3>
                <p className="text-lead text-ivory/72">
                  Every valuation begins with a number that can be independently checked. Weight is
                  not negotiable and not a matter of opinion — which is exactly why it is the right
                  place to start a conversation about value.
                </p>
                <div className="mt-6">
                  <p className="label-ash mb-2 text-[0.58rem]">Weighing and assay equipment</p>
                  <Fact field={business.weighingEquipment} />
                </div>
              </section>

              <section className="will-reveal">
                <h3 className="label mb-5">On discretion</h3>
                <p className="text-lead text-ivory/72">
                  Gold arrives with circumstances attached — an estate, a separation, a business
                  that needs cash this month. None of that is anyone else&apos;s business, and the
                  service is arranged so that it does not have to be discussed in front of a queue.
                </p>
              </section>

              <section className="will-reveal">
                <h3 className="label mb-5">From the founder</h3>
                <blockquote className="border-l border-gold-antique/35 pl-7">
                  <Placeholder label="[INSERT FOUNDER MESSAGE]" />
                </blockquote>
                <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
                  <div>
                    <p className="label-ash mb-2 text-[0.58rem]">Year established</p>
                    <Fact field={business.yearEstablished} />
                  </div>
                  <div>
                    <p className="label-ash mb-2 text-[0.58rem]">Service area</p>
                    <Fact field={business.serviceArea} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
