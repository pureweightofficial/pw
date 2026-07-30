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
`public/video/hero-atmosphere.mp4` with the audio track removed, and mirrored
into a **palindrome** so it can loop without a visible cut (see below).

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
# The shipped film. `split` + `reverse` + `concat` mirrors the cut, so the file is
# 4.58s forward then 4.58s back. Its first and last frames are the same frame,
# which is what lets it loop with no visible cut.
"$FF" -ss 0 -t 4.55 -i media/masters/pureweight-brand-animation.mp4 \
  -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]" -map "[v]" \
  -an -c:v libx264 -crf 30 -preset veryslow -profile:v high -level 4.0 \
  -pix_fmt yuv420p -g 48 -movflags +faststart \
  public/video/hero-atmosphere.mp4 -y
```

Result: **659 KB, 9.17 s, silent, 1280×720 H.264**.

The still frame (`hero-still.jpg`, 39 KB) is the lit instrument, which is now the
palindrome's **midpoint** rather than its end. It does not need regenerating
unless the cut point moves; if it does, take it from `-ss 4.55`, not `-sseof`,
because the file now *ends* on darkness.

Three decisions worth not re-litigating:

- **`-an` is not cosmetic.** The element is muted so the audio would never be
  heard, but an un-stripped track still costs 160 KB of download.
- **CRF 30, not 27.** Doubling the duration doubled the bytes, and at 100% crop
  30 is indistinguishable from 27 on this content — the chain links, the beam
  craquelure and the PW filigree all hold. It is then dimmed to 82% and scrimmed
  on top of that. 27 would cost 910 KB for no visible gain.
- **No WebM.** A VP9 sibling was built and discarded: on dark, soft-gradient
  content it came out at **785 KB against H.264's 659 KB**. Fewer bytes was
  WebM's entire justification, and it lost. H.264 is universally supported, so
  one file is the whole story.

### Why it loops, and what that obliges

The client asked for continuous motion. A straight loop of a build-up shot would
hard-cut from full light back to black every few seconds, so the file is mirrored
instead — verified at **0.25/255 mean channel difference** across the seam.

Looping has an accessibility consequence that the one-shot version did not have.
**WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide)** requires a control for motion that
starts automatically and runs beyond five seconds. A 4.58 s one-shot cleared that
threshold outright; an indefinite loop does not. The hero therefore renders a
real pause control, and it must not be removed while the film loops.

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
