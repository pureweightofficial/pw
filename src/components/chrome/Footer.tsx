import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Fact, WhenVerified } from "@/components/ui/primitives";
import { brand, business, primaryNav, services } from "@/lib/site";

/**
 * FOOTER
 *
 * Substantial without becoming bright: it stays inside the same near-black
 * range as the rest of the page, separated only by a filigree band and a change
 * of surface.
 *
 * Every business detail here routes through `<Fact>`, so unconfirmed items
 * render as visible slots. That matters most in a footer, which is exactly
 * where a registration number, an address or an insurance line would otherwise
 * get invented to fill the column.
 */

const legalLinks = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms & Conditions", href: "/legal/terms" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Accessibility Statement", href: "/legal/accessibility" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mat-walnut grain border-t border-gold-antique/18">
      {/* The engraved band across the top — the emblem's beading, stretched. */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-[repeating-linear-gradient(90deg,rgba(185,130,32,0.5)_0px,rgba(185,130,32,0.5)_2px,transparent_2px,transparent_9px)] opacity-60"
      />

      <div className="shell py-20 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          {/* --- Brand ------------------------------------------------- */}
          <div className="lg:col-span-4">
            <Logo variant="full" className="w-44" />
            <p className="mt-7 max-w-xs text-sm leading-relaxed text-ash">
              {brand.positioning} Jewellery, coins and bullion, examined at the
              counter with the figure explained before anything is agreed.
            </p>

            <WhenVerified field={business.social}>
              <div className="mt-7 space-y-2 text-sm text-ash">
                <p className="label-ash mb-2 text-[0.6rem]">Social</p>
                <Fact field={business.social} />
              </div>
            </WhenVerified>
          </div>

          {/* --- Navigate ---------------------------------------------- */}
          <nav aria-label="Footer" className="lg:col-span-2">
            <h2 className="label mb-5 text-[0.6rem]">Navigate</h2>
            <ul className="space-y-3">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ivory/72 transition-colors duration-300 hover:text-gold-high"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gold-antique transition-colors duration-300 hover:text-gold-high"
                >
                  Visit the Shop
                </Link>
              </li>
            </ul>
          </nav>

          {/* --- Services ---------------------------------------------- */}
          <div className="lg:col-span-3">
            <h2 className="label mb-5 text-[0.6rem]">What We Buy</h2>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.title} className="flex items-baseline gap-2">
                  <Link
                    /*
                      DEEP LINKS, NOT FOUR LINKS TO ONE ANCHOR.

                      All four of these pointed at `/#services` — the same
                      homepage anchor — while /what-we-buy exists, runs to
                      800+ words, and sits in the sitemap at priority 0.9.
                      The anchor text here ("Gold Jewellery", "Silver",
                      "Coins", "Bars & Bullion") is precisely the text that
                      page wants pointing at it, and it was being spent on a
                      URL that already ranks for everything else.
                    */
                    href={`/what-we-buy#${service.id}`}
                    className="text-sm text-ivory/72 transition-colors duration-300 hover:text-gold-high"
                  >
                    {service.title}
                  </Link>
                  {!service.confirmed ? (
                    <span
                      className="text-[0.55rem] tracking-[0.12em] text-gold-antique uppercase"
                      title="Pending client confirmation"
                    >
                      pending
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {/* --- Visit ------------------------------------------------- */}
          <div className="lg:col-span-3">
            <h2 className="label mb-5 text-[0.6rem]">Visit &amp; Contact</h2>

            <dl className="space-y-5 text-sm">
              <WhenVerified field={business.address}>
                <div>
                  <dt className="label-ash mb-1.5 text-[0.58rem]">Address</dt>
                  <dd className="text-ivory/72">
                    <Fact field={business.address} link="map" />
                  </dd>
                </div>
              </WhenVerified>
              <WhenVerified field={business.openingHours}>
                <div>
                  <dt className="label-ash mb-1.5 text-[0.58rem]">
                    Opening Hours
                  </dt>
                  <dd className="text-ivory/72">
                    <Fact field={business.openingHours} />
                  </dd>
                </div>
              </WhenVerified>
              <WhenVerified field={business.telephone}>
                <div>
                  <dt className="label-ash mb-1.5 text-[0.58rem]">Telephone</dt>
                  <dd className="text-ivory/72">
                    <Fact field={business.telephone} link="tel" />
                  </dd>
                </div>
              </WhenVerified>
              <WhenVerified field={business.email}>
                <div>
                  <dt className="label-ash mb-1.5 text-[0.58rem]">Email</dt>
                  <dd className="text-ivory/72">
                    <Fact field={business.email} link="mailto" />
                  </dd>
                </div>
              </WhenVerified>
            </dl>
          </div>
        </div>

        {/* --- Legal ------------------------------------------------- */}
        <div className="mt-16 border-t border-gold-antique/14 pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 text-xs leading-relaxed text-ash">
              <p>
                © {year} {brand.name}.
                <WhenVerified field={business.registrationNumber}>
                  {" "}Registered business details:{" "}
                  <Fact field={business.registrationNumber} />
                </WhenVerified>
              </p>
              {/* This sentence has now been wrong in BOTH directions: it once
                  claimed the site showed no rates while a market panel was live,
                  and then described published rates after that panel was removed.
                  A false disclaimer is worse than none, because it is the line a
                  reader would actually rely on. It now says only what is true
                  today: no figure here is a quotation or an offer. */}
              <p className="max-w-2xl">
                This website provides general information about the services
                offered by {brand.shortName}. It does not publish precious-metal
                rates, and nothing on it is a valuation, a quotation, or an
                offer. What is payable for any item is established only by
                examining and weighing it at the counter, against the market at
                that moment. Nothing here should be relied upon as financial
                advice.
              </p>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-ash transition-colors duration-300 hover:text-gold-high"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
