# Media masters

Source files kept for reference and re-cutting. **Nothing in this folder is
served.** It sits outside `public/`, so no build can publish it and no URL can
reach it. Move a file into `public/` only after deciding it is safe to publish.

---

## `pureweight-brand-animation.mp4`

Supplied by the client, 30 July 2026.

| | |
| --- | --- |
| Duration | 10.01 s |
| Video | H.264 High, 1280×720, 24 fps, 2165 kb/s |
| Audio | AAC-LC, 48 kHz stereo, 128 kb/s |
| Size | 2.79 MB |
| `encoder` metadata | `Google` — consistent with a Veo / Google Flow generation |

### What ships, and what does not

The homepage hero uses **only the first 4.55 seconds**, re-encoded to
`public/video/hero-atmosphere.{mp4,webm}` with the audio track removed.

That window is darkness, a gold line, the ornamental PW ring, the ring
dissolving, and the instrument standing with **empty pans**. It contains no text
and makes no assertion about the business.

Everything after it was cut, and each cut has a reason:

| From | Content | Why it cannot ship |
| --- | --- | --- |
| ~4.8 s | A bar struck **`999.9 FINE GOLD` / `1 KILO GOLD`** | A purity claim and a handling-capacity claim. Both are business facts, and neither is verified — see `CONTENT-PLACEHOLDERS.md`. |
| ~6.0 s | Stacks of **US dollar bills** | Asserts a settlement currency and implies a jurisdiction. `settlementMethods` is still a placeholder. The brief also directs away from literal cash imagery. |
| ~7.0 s | The **`®`** glyph on `PUREWEIGHT` | A registered-trademark assertion. Same category as the licences and certifications the brief explicitly forbids inventing. |
| ~7.8 s | A **`CALL TO NOW`** button | Duplicates the page's real CTAs, points at a telephone number that is still `[INSERT VERIFIED TELEPHONE NUMBER]`, and is baked-in raster text — invisible to screen readers and to crawlers, and unresizable. |

If the client confirms the trademark registration, the bar's fineness, the
settlement currency and the phone number, more of the clip becomes usable. Until
then the 4.55 s cut is the defensible boundary.

### Re-cutting

`ffmpeg` is **not** a project dependency. Install it transiently:

```bash
npm i --no-save ffmpeg-static
FF=node_modules/ffmpeg-static/ffmpeg.exe   # or just `ffmpeg` if on PATH
```

Then, from the repository root:

```bash
# H.264 — universal fallback
"$FF" -ss 0 -t 4.55 -i media/masters/pureweight-brand-animation.mp4 \
  -an -c:v libx264 -crf 27 -preset veryslow -profile:v high -level 4.0 \
  -pix_fmt yuv420p -g 48 -movflags +faststart \
  public/video/hero-atmosphere.mp4 -y

# VP9 — smaller, listed first so browsers that support it take it
"$FF" -ss 0 -t 4.55 -i media/masters/pureweight-brand-animation.mp4 \
  -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 \
  -pix_fmt yuv420p public/video/hero-atmosphere.webm -y

# Still — the FINAL frame, so the instrument is presented already at rest on
# every path that does not play the film
"$FF" -sseof -0.15 -i public/video/hero-atmosphere.mp4 \
  -frames:v 1 -q:v 6 public/video/hero-still.jpg -y
```

Result: 484 KB MP4, 437 KB WebM, 39 KB JPEG, silent, 4.58 s.

`-an` is not cosmetic. The element is muted, so the audio would never be heard,
but an un-stripped track still costs 160 KB of download.

### After any re-cut, re-run the contrast gate

The hero copy sits on top of this film, and the film throws specular highlights
brighter than the text over them. Changing the cut can break WCAG AA silently:

```bash
"$FF" -i public/video/hero-atmosphere.mp4 -vf "fps=4,scale=320:180" \
  -pix_fmt rgb24 -f rawvideo frames.raw -y
node scripts/check-hero-contrast.mjs frames.raw
```

It reads the scrim stops and the film dim straight out of `globals.css`, so it
cannot drift from what ships. It is **not** in `npm run verify`, because it needs
ffmpeg — it is a manual gate, also listed in `docs/GO-LIVE.md`.
