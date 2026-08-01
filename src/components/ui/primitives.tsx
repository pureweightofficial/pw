"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { useMagnetic } from "@/lib/hooks";
import { isVerified, type Verifiable } from "@/lib/site";

/* -------------------------------------------------------------------------- */
/* PLACEHOLDER                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Renders an unverified business fact as a visible, unmistakable gap.
 *
 * This is the enforcement point for the content guardrail. Any field the client
 * has not confirmed reaches the page through here and renders as a marked slot
 * — never as invented copy, and never silently omitted, because a silent
 * omission is how a missing licence number turns into a page that quietly
 * implies there is one.
 */
export function Placeholder({
  label,
  inline = false,
}: {
  label: string;
  inline?: boolean;
}) {
  const Tag = inline ? "span" : "p";

  return (
    <Tag
      className={[
        "inline-flex items-center gap-2 border border-dashed border-gold-antique/35",
        "bg-gold-antique/5 px-3 py-1.5 font-sans text-[0.66rem] tracking-[0.14em]",
        "text-gold-antique uppercase",
        inline ? "" : "my-2",
      ].join(" ")}
      data-content-placeholder="true"
    >
      <span aria-hidden="true" className="text-gold-antique">
        ◇
      </span>
      {label}
    </Tag>
  );
}

/**
 * Renders a verified value, or its placeholder. The only sanctioned way to put
 * a `Verifiable` on the page.
 */
export function Fact<T extends ReactNode>({
  field,
  link,
}: {
  field: Verifiable<T>;
  /**
   * Declarative, not a render function — this component is inside the client
   * boundary, and a server component handing it a function is a build error
   * ("Functions cannot be passed directly to Client Components"), which is
   * exactly how the first version of tel/mailto support failed. 'tel' strips
   * formatting for the href; 'mailto' uses the value verbatim; 'map' opens the
   * address in the visitor's map application via the provider-neutral Google
   * Maps search URL — derived entirely from the client-supplied address, so it
   * asserts nothing the address itself does not. Applied only once the field is
   * verified — placeholders never become links.
   */
  link?: "tel" | "mailto" | "map";
}) {
  if (!isVerified(field)) return <Placeholder label={field.label} inline />;

  if (link) {
    const raw = String(field.value);
    const href =
      link === "tel"
        ? `tel:${raw.replace(/[^+\d]/g, "")}`
        : link === "mailto"
          ? `mailto:${raw}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
    return (
      <a
        className="underline-offset-4 hover:underline"
        href={href}
        {...(link === "map"
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {field.value}
      </a>
    );
  }

  return <>{field.value}</>;
}

/* -------------------------------------------------------------------------- */
/* TYPOGRAPHIC FURNITURE                                                      */
/* -------------------------------------------------------------------------- */

export function Eyebrow({
  children,
  className = "",
  tone = "gold",
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  tone?: "gold" | "ash";
  /** Centred labels carry a struck rule on both sides, so they stay symmetrical. */
  align?: "left" | "center";
}) {
  // The struck rule is opt-in (.label-rule), so bare .label usages elsewhere
  // keep plain typography and their existing baseline alignment.
  const base = tone === "gold" ? "label label-rule" : "label-ash";
  const centered = tone === "gold" && align === "center" ? "label-center" : "";
  return <p className={`${base} ${centered} ${className}`}>{children}</p>;
}

/**
 * A chapter marker. The index sits in a hairline-ruled box to the left of the
 * title, echoing the struck numbering on a graduated instrument.
 */
export function ChapterMark({
  index,
  title,
  className = "",
}: {
  index: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold-antique/35 font-sans text-[0.62rem] tracking-[0.1em] text-gold-antique">
        {index}
      </span>
      <span className="label">Chapter — {title}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DIVIDERS                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The beam divider. Its tilt comes from `--beam-tilt`, written by
 * MotionProvider from the same scroll value that levels the 3D instrument, so
 * the page's own structure resolves alongside the object.
 */
export function BeamDivider({
  className = "",
  fixed = false,
}: {
  className?: string;
  fixed?: boolean;
}) {
  return (
    <div className={`relative w-full ${className}`} aria-hidden="true">
      <div className={`beam ${fixed ? "beam-fixed" : ""}`} />
    </div>
  );
}

/** A plain hairline, for use inside components where the motif would be noise. */
export function Rule({ className = "" }: { className?: string }) {
  return <div className={`rule-gold ${className}`} aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/* ACTIONS                                                                    */
/* -------------------------------------------------------------------------- */

type CTAProps = {
  children: ReactNode;
  href?: string;
  className?: string;
  variant?: "primary" | "ghost";
  magnetic?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "children" | "href"
  >;

/**
 * The site's action. Magnetic attraction is capped at 6px inside `useMagnetic`
 * and disabled for coarse pointers and reduced motion — enough that the control
 * feels weighted, far short of the elastic wobble that reads as a template.
 */
export function CTA({
  children,
  href,
  className = "",
  variant = "primary",
  magnetic = true,
  ...rest
}: CTAProps) {
  const magnetRef = useMagnetic<HTMLElement>(magnetic ? 6 : 0);
  const classes = `${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`;

  if (href) {
    const external =
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:");

    if (external) {
      return (
        <a
          ref={magnetRef as React.RefObject<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          <span className="relative z-10">{children}</span>
        </a>
      );
    }

    return (
      <Link
        ref={magnetRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        <span className="relative z-10">{children}</span>
      </Link>
    );
  }

  return (
    <button
      ref={magnetRef as React.RefObject<HTMLButtonElement>}
      type="button"
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* SECTION SCAFFOLD                                                           */
/* -------------------------------------------------------------------------- */

const MATERIALS = {
  steel: "mat-steel",
  stone: "mat-stone",
  glass: "mat-glass",
  walnut: "mat-walnut",
  bronze: "mat-bronze",
  none: "",
} as const;

/**
 * Every major section, on a named material.
 *
 * Sections are within a few percent of each other in luminance — what separates
 * them is surface, not brightness. Scrolling should feel like moving between
 * rooms of one dark building rather than down one flat black page.
 */
export function Section({
  id,
  children,
  material = "none",
  className = "",
  labelledBy,
  scrollSection,
}: {
  id?: string;
  children: ReactNode;
  material?: keyof typeof MATERIALS;
  className?: string;
  labelledBy?: string;
  scrollSection?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-scroll-section={scrollSection}
      /*
        `overflow-clip`, NOT `overflow-hidden`, AND THE DIFFERENCE IS LOAD-BEARING.

        Both clip a scene or a glow that overruns the section box, which is all
        this was ever for. But `overflow: hidden` also makes the element a
        SCROLL CONTAINER, and a scroll container becomes the nearest scrolling
        ancestor for any `position: sticky` descendant. The section box does not
        itself scroll, so those descendants had no range to stick within and
        simply travelled with the page.

        Four sections pin a short column beside a long one — the journey stages,
        the assay ring, the brand story and now the evidence ledger — and not
        one of them worked. Measured before the change, at 1440x900: the brand
        story's pinned column reported viewport-top 288, then -12, then -312,
        then -612 across four 300px scroll steps. Exactly 1:1 with scroll, which
        is the signature of an element that is not sticking at all.

        The visible cost was a dead rail beside each of those sections — up to
        731px in the evidence ledger — that looked like a design decision and
        was actually a bug. `overflow: clip` clips identically without creating
        the scroll container, so sticky resolves against the viewport again.
        Verified by scripts/check-sticky.mjs, which fails the build if any of
        these columns stops pinning.
      */
      className={`relative isolate overflow-clip ${MATERIALS[material]} ${material !== "none" ? "grain" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
