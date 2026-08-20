"use client";

import {
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useCallback } from "react";
import { isVerified, type Verifiable } from "@/lib/site";

/*
  Next's Link, driveable by motion values. `m.create` is the v13 API —
  `motion(Component)` is the deprecated spelling, and `m` rather than `motion`
  because LazyMotion runs in strict mode (see MotionProvider). Created at module scope
  because creating it during render would hand React a new component type on
  every pass and remount the button, losing focus and any running animation.
*/
const MotionLink = m.create(Link);

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
/**
 * Renders children only when the field is verified. The row-level partner of
 * Fact's silence: a dt label above a Fact that renders nothing is an orphaned
 * label, so the whole row hides together.
 *
 * (The Placeholder chip component lived here until the hide-until-verified
 * policy retired it from the public site. Dead code that looks live is a trap
 * this repo has documented three times, so it is gone, not parked; the chip's
 * job — showing the owner what is missing — belongs to the Keeper.)
 */
export function WhenVerified<T>({
  field,
  children,
}: {
  field: Verifiable<T>;
  children: ReactNode;
}) {
  return isVerified(field) ? <>{children}</> : null;
}

/**
 * Renders a verified value, or nothing. The only sanctioned way to put
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
  /*
    UNVERIFIED RENDERS NOTHING — the overhaul's agreed policy, decided with the
    owner. The visible [INSERT ...] chips were the right honesty for an
    unindexed preview; on a public production site, absence is the honest AND
    finished presentation: the site simply does not speak about what nobody has
    confirmed. Nothing is invented either way — the Verifiable<T> rule is
    untouched, and the Keeper's dashboard remains the ledger of every gap.
    Layouts that would orphan a label around a silent Fact wrap the whole row
    in <WhenVerified>.
  */
  if (!isVerified(field)) return null;

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
} & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children" | ConflictsWithMotion
  > &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "children" | "href" | ConflictsWithMotion
  >;

/*
  React's DOM handlers whose names Framer Motion reuses for its own animation
  and gesture callbacks. Spreading raw HTML attributes onto a motion component
  is a type error on every one of them — React's `onAnimationStart` takes an
  AnimationEvent, Framer's takes an AnimationDefinition, and the two cannot be
  reconciled.

  They are excluded rather than cast away. No call site in this project passes
  any of them, and if one ever needs to, the compiler saying so is exactly the
  conversation that should happen — a cast here would silence it and hand the
  wrong event shape to whoever wrote the handler.
*/
type ConflictsWithMotion =
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
  | "style";

/**
 * Magnetic attraction, on a spring.
 *
 * This replaces a hand-rolled hook that ran its own requestAnimationFrame loop
 * and eased toward the cursor with `current += (target - current) * 0.14` — a
 * fixed-rate linear approach. It worked, and it always moved at the same rate
 * regardless of how fast the pointer arrived, which is the one thing a
 * "weighted" control should not do. A spring carries velocity: sweep across
 * the button quickly and it lags and catches up; approach it slowly and it
 * barely stirs. That difference is most of what makes the gesture read as
 * physical rather than as an animation being played at you.
 *
 * It is also ~50 fewer lines of imperative rAF, and the values it returns are
 * driven off the main thread by Framer where the browser allows it.
 *
 * The site's restraint is unchanged: 6px of travel, nothing on coarse
 * pointers, nothing under reduced motion.
 */
function useMagneticSpring(strength: number) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  /*
    Stiff and well-damped: this settles rather than wobbles. A lower damping
    ratio is where "magnetic button" turns into the elastic bouncing that reads
    as a template, which the previous implementation was deliberately tuned to
    avoid and which is not worth losing to a library default.
  */
  const spring = { stiffness: 260, damping: 26, mass: 0.55 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  const active = strength > 0 && !reduced;

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Coarse pointers report as "touch"/"pen"; a magnet under a finger is
      // just a button that moves away from where it was tapped.
      if (!active || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      x.set(Math.max(-1, Math.min(1, dx)) * strength);
      y.set(Math.max(-1, Math.min(1, dy)) * strength);
    },
    [active, strength, x, y],
  );

  const onPointerLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { style: { x: sx, y: sy }, onPointerMove, onPointerLeave, reduced };
}

/**
 * The site's action. Magnetic attraction is capped at 6px and disabled for
 * coarse pointers and reduced motion. Enough that the control feels weighted,
 * far short of the elastic wobble that reads as a template.
 *
 * The press is new: `whileTap` takes the control down 2%, which every native
 * control on every platform does and which this site's buttons did not do at
 * all. It is the cheapest possible confirmation that a tap landed, and its
 * absence is felt long before it is noticed.
 */
export function CTA({
  children,
  href,
  className = "",
  variant = "primary",
  magnetic = true,
  ...rest
}: CTAProps) {
  const { style, onPointerMove, onPointerLeave, reduced } = useMagneticSpring(
    magnetic ? 6 : 0,
  );
  const classes = `${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`;

  /*
    Shared across all three renderings. The motion props go on the ELEMENT
    rather than on a wrapper, because call sites pass width classes through
    `className` — VisitCta sends `w-full sm:w-auto` — and a wrapping span
    would become the button's containing block and quietly break that.
  */
  const motionProps = {
    style,
    onPointerMove,
    onPointerLeave,
    whileTap: reduced ? undefined : { scale: 0.98 },
    transition: { type: "spring" as const, stiffness: 400, damping: 28 },
  };

  if (href) {
    const external =
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:");

    if (external) {
      return (
        <m.a
          href={href}
          className={classes}
          {...motionProps}
          {...rest}
        >
          <span className="relative z-10">{children}</span>
        </m.a>
      );
    }

    return (
      <MotionLink
        href={href}
        className={classes}
        {...motionProps}
        {...rest}
      >
        <span className="relative z-10">{children}</span>
      </MotionLink>
    );
  }

  return (
    <m.button
      type="button"
      className={classes}
      {...motionProps}
      {...rest}
    >
      <span className="relative z-10">{children}</span>
    </m.button>
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
