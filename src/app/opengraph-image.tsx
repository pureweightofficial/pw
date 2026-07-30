import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Required by `output: 'export'`, harmless on a server build — this route has no
// request-time dependencies, so it is generated once at build.
export const dynamic = 'force-static';

/**
 * OPEN GRAPH IMAGE
 *
 * Generated rather than designed in a file, so it cannot drift out of sync with
 * the brand — which it had already done once: this card was still carrying the
 * pre-rebrand palette and the wrong display face. Everything visual here now
 * comes from the same two sources as the site itself: the real logo file, and
 * the palette sampled from it.
 *
 * The logo is inlined as a data URI read from disk at build time. Satori cannot
 * fetch relative URLs, and the absolute origin is not reliably known during a
 * static export, so reading the bytes directly is the only approach that works
 * on both deployment targets.
 */

export const alt =
  'Pureweight Gold Exchange — private gold evaluation and exchange, guided by precision.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* --- Palette, sampled from the logo (see globals.css) -------------------- */
const VOID = '#050406';
const GOLD_ANTIQUE = '#b87914';
const GOLD_RICH = '#d99a33';
const GOLD_HIGH = '#fcc933';
const GOLD_PALE = '#fffdda';
const IVORY = '#fef3c7';
const ASH = '#a2977f';

/** Pulls a single static font file out of the Google Fonts CSS response. */
async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Rye&display=swap',
      {
        // The modern UA returns woff2, which Satori cannot parse. An older one
        // gets a plain TTF.
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)' },
      },
    ).then((r) => (r.ok ? r.text() : ''));

    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
    if (!url) return null;

    const font = await fetch(url);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    // A share card without Rye is a small loss; a build that fails because
    // a font server was slow is a large one.
    return null;
  }
}

/** Inlines the supplied logo so Satori can render it without a network fetch. */
async function loadLogo(): Promise<string | null> {
  try {
    const bytes = await readFile(join(process.cwd(), 'src/assets/pureweight-logo.png'));
    return `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const [displayFont, logo] = await Promise.all([loadDisplayFont(), loadLogo()]);
  const display = displayFont ? 'Rye' : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: VOID,
          // The warm key entering upper-left, exactly as in the 3D rig.
          backgroundImage: `radial-gradient(1000px 620px at 20% -12%, rgba(184,121,20,0.30), rgba(5,4,6,0) 62%), radial-gradient(760px 480px at 96% 110%, rgba(87,50,2,0.42), rgba(5,4,6,0) 60%)`,
        }}
      >
        {/* --- Left: the message ------------------------------------- */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '76px 0 76px 84px',
            width: 720,
          }}
        >
          {/* Micro-label with its struck rule — the site's section marking. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ display: 'flex', width: 46, height: 1, backgroundColor: GOLD_RICH }} />
            <div style={{ fontSize: 19, letterSpacing: 8, color: GOLD_ANTIQUE }}>
              PRECISION IN EVERY GRAM
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 74,
              lineHeight: 1.06,
              letterSpacing: 1,
              fontFamily: display,
              backgroundImage: `linear-gradient(135deg, ${IVORY} 0%, ${GOLD_HIGH} 45%, ${GOLD_ANTIQUE} 100%)`,
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            <div>Where Gold Finds</div>
            <div>Its True Weight.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                display: 'flex',
                height: 1,
                width: 540,
                backgroundImage: `linear-gradient(90deg, ${GOLD_RICH} 0%, rgba(184,121,20,0) 100%)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 540 }}>
              <div style={{ fontSize: 21, color: ASH }}>
                Private gold evaluation and exchange.
              </div>
              <div style={{ fontSize: 15, letterSpacing: 5, color: GOLD_PALE }}>
                REQUEST A VALUATION
              </div>
            </div>
          </div>
        </div>

        {/* --- Right: the actual mark --------------------------------- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 480,
          }}
        >
          {logo ? (
            /**
             * THE MONOGRAM ONLY — NOT THE FULL LOCKUP.
             *
             * The supplied artwork's centre panel is a balance carrying a bar
             * struck "999.9 FINE GOLD / 1 KILO GOLD" on one pan and banded US
             * $100 notes on the other. Both are claims this site is not in a
             * position to make: a purity-and-capacity claim, and a settlement
             * currency for a business whose trading jurisdiction is still an
             * unconfirmed placeholder. They are the same two claims the hero film
             * was cut at 4.55s to exclude.
             *
             * This card was previously drawing the full lockup at 400px wide, on a
             * 1200x630 image — large enough that both are plainly readable, and
             * this is the asset that gets pasted into social and messaging
             * previews. So it is cropped to the PW roundel, which is unambiguous
             * brand and carries no assertion at all.
             *
             * The crop numbers are the `monogram` window from Logo.tsx, scaled:
             * source 520x537, window x 4.2% y 18.5% w 23.5% h 22.5%, at 2.4547x.
             *
             * NOTE: this does not fix the artwork itself, which is still rendered
             * whole in the footer, the loader and the 404 page, and is downloadable
             * at full resolution. That needs the client's decision, and it is
             * logged in CONTENT-PLACEHOLDERS.md.
             */
            <div
              style={{
                display: 'flex',
                position: 'relative',
                overflow: 'hidden',
                width: 300,
                height: 297,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                width={1276}
                height={1318}
                alt=""
                style={{ position: 'absolute', left: -54, top: -244 }}
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                letterSpacing: 12,
                color: GOLD_RICH,
                fontFamily: display,
              }}
            >
              PW
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: displayFont
        ? [{ name: 'Rye', data: displayFont, style: 'normal', weight: 400 as const }]
        : [],
    },
  );
}
