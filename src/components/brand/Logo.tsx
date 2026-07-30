import Image from "next/image";
import { assetPath } from "@/lib/asset";

/**
 * THE REAL PUREWEIGHT LOGO
 *
 * One supplied file — a 1200×1239 lockup containing the ornamental frame, the
 * PW medallion, the balance scale and the PUREWEIGHT / GOLD EXCHANGE cartouche.
 *
 * Nothing here recolours, redraws or filters the artwork. What it does is CROP,
 * because a single square lockup cannot serve every slot: at a 40px navigation
 * height the whole mark renders about 39px wide and the 4pt "GOLD EXCHANGE"
 * lettering turns to mud. So each variant windows the region of the original
 * that actually reads at its size:
 *
 *   full      the entire mark — loader, footer, brand story
 *   wordmark  the cartouche band — desktop navigation
 *   monogram  the PW medallion — mobile navigation, compact slots
 *
 * The crop is done by oversizing the image inside an `overflow: hidden` frame
 * and offsetting it, so the source pixels are never resampled beyond a plain
 * scale. Percentages are measured from the supplied file; if the artwork is
 * ever re-exported at different proportions, these are the four numbers to
 * re-measure.
 *
 * REPLACE WITH VECTOR WHEN AVAILABLE. This is a 256-colour indexed PNG, so the
 * gold gradients carry some banding and the filigree softens under 200px. An
 * SVG would fix both and is the correct long-term asset.
 */

const SRC = assetPath("/brand/pureweight-logo.webp");
/**
 * The shipped asset is a 520px WebP (63KB) generated from the 1200px original —
 * 2x of the largest render (260px), so nothing is upscaled. The original PNG
 * lives in src/assets/ as the build-time source for the OG card and for
 * regenerating this file; it no longer ships to visitors (it was 640KB,
 * preloaded at high priority, on every page). Crop windows below are
 * fractional, so they are resolution-independent.
 * Regenerate: node -e with sharp — see git history of this line.
 */
const NATURAL = { w: 520, h: 537 };

/** Windows into the supplied file, as fractions of its natural size. */
const CROPS = {
  full: { x: 0, y: 0, w: 1, h: 1 },
  // The cartouche: PUREWEIGHT above GOLD EXCHANGE, full bleed left to right.
  wordmark: { x: 0.015, y: 0.618, w: 0.97, h: 0.245 },
  // The circular PW medallion at upper left, with its filigree surround.
  monogram: { x: 0.042, y: 0.185, w: 0.235, h: 0.225 },
} as const;

export type LogoVariant = keyof typeof CROPS;

/**
 * Rendered width per variant, so next/image can pick a sane candidate.
 *
 * Without this, next/image emits a 1x/2x srcSet and the 2x entry asks for a
 * 3840px render of a 1200px source — an upscale nobody benefits from, fetched
 * at high priority on the preload link. Declaring `sizes` switches it to a
 * width-based srcSet that never exceeds the source.
 */
const SIZES: Record<LogoVariant, string> = {
  full: "(max-width: 1024px) 200px, 260px",
  wordmark: "(max-width: 1024px) 180px, 240px",
  monogram: "64px",
};

export type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  /** Rendered for screen readers; the image itself is the brand mark. */
  alt?: string;
  priority?: boolean;
};

export function Logo({
  variant = "full",
  className = "",
  alt = "Pureweight Gold Exchange",
  priority = false,
}: LogoProps) {
  const crop = CROPS[variant];

  // Aspect ratio of the *cropped window*, so the frame sizes itself correctly
  // from whatever height or width the caller constrains.
  const aspect = (NATURAL.w * crop.w) / (NATURAL.h * crop.h);

  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{ aspectRatio: String(aspect) }}
    >
      <Image
        src={SRC}
        alt={alt}
        width={NATURAL.w}
        height={NATURAL.h}
        priority={priority}
        sizes={SIZES[variant]}
        // Oversize and offset so only the chosen window is visible. Widths are
        // expressed relative to the frame, which is why they exceed 100%.
        style={{
          position: "absolute",
          width: `${100 / crop.w}%`,
          height: `${100 / crop.h}%`,
          left: `${(-crop.x / crop.w) * 100}%`,
          top: `${(-crop.y / crop.h) * 100}%`,
          maxWidth: "none",
          objectFit: "fill",
        }}
      />
    </span>
  );
}
