import { ImageResponse } from 'next/og';

/**
 * OPEN GRAPH IMAGE
 *
 * Generated rather than designed in a file, so it never drifts out of sync with
 * the brand tokens. Same near-black ground, same five-stop gold ramp, same beam
 * and fulcrum as the site.
 *
 * The display serif is fetched at generation time and falls back to the bundled
 * default if that fetch fails — a share card without Cormorant is a small loss,
 * a build that fails because a font server was slow is a large one.
 */

export const alt =
  'Pureweight Gold Exchange — private gold evaluation and exchange, guided by precision.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Pulls a single static font file out of the Google Fonts CSS response. */
async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&display=swap',
      {
        headers: {
          // The modern UA string returns woff2, which Satori cannot parse.
          // An older one gets us a plain TTF.
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)',
        },
      },
    ).then((r) => (r.ok ? r.text() : ''));

    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
    if (!url) return null;

    const font = await fetch(url);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const displayFont = await loadDisplayFont();
  const display = displayFont ? 'Cormorant Garamond' : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#030303',
          // The warm key entering from upper left, exactly as in the 3D rig.
          backgroundImage:
            'radial-gradient(1000px 620px at 22% -10%, rgba(185,130,32,0.26), rgba(3,3,3,0) 62%), radial-gradient(760px 480px at 92% 108%, rgba(77,53,21,0.3), rgba(3,3,3,0) 60%)',
          padding: '72px 84px',
        }}
      >
        {/* --- Mark --- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <svg width="76" height="76" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="112" fill="none" stroke="#b98220" strokeWidth="3" />
            <circle cx="120" cy="120" r="98" fill="none" stroke="#8a5f18" strokeWidth="1.5" />
            <path d="M 96 158 L 144 158" stroke="#d7a83d" strokeWidth="6" strokeLinecap="round" />
            <path d="M 120 152 L 120 92" stroke="#d7a83d" strokeWidth="5" strokeLinecap="round" />
            <path d="M 70 92 L 170 92" stroke="#f2ce72" strokeWidth="5" strokeLinecap="round" />
            <path d="M 120 92 L 120 78" stroke="#f2ce72" strokeWidth="4" strokeLinecap="round" />
            <path d="M 56 118 L 84 118 L 70 132 Z" fill="#d7a83d" />
            <path d="M 156 118 L 184 118 L 170 132 Z" fill="#d7a83d" />
            <path d="M 70 92 L 70 118" stroke="#8a5f18" strokeWidth="2.5" />
            <path d="M 170 92 L 170 118" stroke="#8a5f18" strokeWidth="2.5" />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 26,
                letterSpacing: 11,
                color: '#e8e0d2',
                fontFamily: display,
              }}
            >
              PUREWEIGHT
            </div>
            <div style={{ fontSize: 13, letterSpacing: 7, color: '#918d84', marginTop: 8 }}>
              GOLD EXCHANGE
            </div>
          </div>
        </div>

        {/* --- Statement --- */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 9,
              color: '#b98220',
              marginBottom: 28,
            }}
          >
            PRECISION IN EVERY GRAM
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 92,
              lineHeight: 1.03,
              fontFamily: display,
              // The five-stop light path, clipped to the type — the same ramp
              // the CSS `.gold-leaf` treatment uses on the live page.
              backgroundImage:
                'linear-gradient(100deg, #8a5f18 0%, #d7a83d 22%, #ffe9a8 42%, #d7a83d 58%, #b98220 78%, #6b4a12 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            <div>Where Gold Finds</div>
            <div>Its True Weight.</div>
          </div>
        </div>

        {/* --- Beam and fulcrum --- */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              height: 2,
              width: '100%',
              backgroundImage:
                'linear-gradient(90deg, rgba(185,130,32,0) 0%, rgba(215,168,61,0.85) 50%, rgba(185,130,32,0) 100%)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: -1 }}>
            <svg width="22" height="16" viewBox="0 0 22 16">
              <path d="M 11 16 L 2 1 L 20 1 Z" fill="#b98220" />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 26,
              fontSize: 22,
              color: '#918d84',
            }}
          >
            <div>Private gold evaluation and exchange.</div>
            <div style={{ letterSpacing: 6, color: '#b98220', fontSize: 18 }}>
              REQUEST A VALUATION
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: displayFont
        ? [{ name: 'Cormorant Garamond', data: displayFont, style: 'normal', weight: 500 }]
        : [],
    },
  );
}
