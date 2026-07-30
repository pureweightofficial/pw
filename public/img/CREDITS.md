# Image provenance

Every photograph served from this directory, its licence, and why it was chosen.

| File | Source | Licence | Used for |
| --- | --- | --- | --- |
| `jewellery.jpg` | [Unsplash](https://unsplash.com/photos/LQdSOAw13KE) | [Unsplash License](https://unsplash.com/license) | Gold Jewellery panel |
| `coins.jpg` | Openverse → rawpixel, public-domain museum work | **CC0 1.0** | Coins panel |

Both are served **pre-cropped to 900×1125 (4:5)** — the exact aspect the panels
render. Cropping at source rather than with `object-cover` matters because the
static build sets `images.unoptimized`, which disables Next's responsive
`srcSet` entirely: every visitor downloads one fixed file, so any pixel outside
the visible crop is waste on every single load.

---

## Selection rubric

Three rules, because a stock licence does not cover everything a photograph can
get a business into:

1. **No identifiable people.** A model release is separate from an image licence,
   and this business's customers expect discretion.
2. **No branded or serial-numbered bullion.** Refiner marks are trademarks, and
   showing another mint's bars alongside Pureweight's name implies a relationship
   that does not exist.
3. **No third-party premises.** A photograph of somebody else's shop on a
   trader's website is a misrepresentation, licence or not.

---

## Two images were removed for breaching rule 2

This is worth recording in full, because the rule existed and the images broke it
anyway.

### `bullion.jpg` — removed, was live

It showed three cast bars carrying, all legible at the rendered size:

- a refiner's crest and the wordmark **“Scottsdale Gold”** — a real company's
  trademark, displayed on the site of a business that buys gold;
- **“1 KILO / 999.9 FINE GOLD”** — the same purity-and-capacity claim the hero
  film was cut at 4.55 s to exclude and the OpenGraph card was re-cropped to
  avoid;
- three bar serial numbers: **202687, 202688, 202689**.

A 6×6 grid overlay was used to check whether any 4:5 crop could clear the marks.
None can — the crest sits centre, the fineness stamp centre-left, and the serials
at lower-left, lower-right and bottom-centre. **The image is unusable, not
mis-cropped.**

### `valuation.jpg` — removed, was already orphaned

Same refiner, same stamps. It had also stopped being referenced when the services
were rewritten from “Gold Valuation” to “Gold Jewellery”, so it was 198 KB
shipping to every visitor with nothing pointing at it.

**Net effect: 320.9 KB removed, 179.4 KB added. Site image weight is down ~142 KB.**

---

## `coins.jpg` — a treated public-domain work

A hammered gold sovereign, shield-and-Tudor-rose reverse. Public domain: the coin
is Tudor, so there is no live trademark, and the photograph is CC0.

It arrived as a **museum catalogue shot on flat grey**, which would have looked
wrong beside `jewellery.jpg`'s dark product photography. Treated with ffmpeg to
match the site's single warm key light:

```
crop to 4:5, scale 900x1125 lanczos,
curves all='0/0 0.34/0.02 0.62/0.38 1/1',   # crushes the grey backdrop to black
hqdn3d=4:3:6:4,                             # the curves amplify sensor noise
colorbalance=rm=0.06:gm=0.01:bm=-0.05,      # warm it into the palette
eq=saturation=1.18:contrast=1.06,
vignette=PI/4                               # close the frame
```

Modification is permitted under CC0. Verified side by side against
`jewellery.jpg` before adopting.

It is 179 KB against `jewellery.jpg`'s 113 KB. That is not slack — a coin's
engraving is high-frequency detail across the whole frame. Both WebP (193 KB at
q74) and denoising were tried and neither beat JPEG here, which is measured, not
assumed.

---

## Panels deliberately using the engraved plate, not a photograph

**Silver** and **Bars & Bullion** both fall back to the `ArchMotif` plate, and
that is a decision rather than an omission.

Two rounds of searching the CC0 pool (Openverse, across Wikimedia, rawpixel and
museum collections) produced nothing usable for either:

- silver returned **WPA watercolour illustrations** on cream paper with the
  artists' signatures visible, a costume bangle on white, and a museum
  documentation shot with the **colour calibration card still in frame**;
- “gold nugget” returned a **mango cultivar** and a **fish**.

The CC0 pool is museum and archive material. It does not contain the dark,
moody commercial product photography this site's visual language is built on.
An engraved plate is better than a watercolour teapot or a calibration chart.

**What would unlock these two properly**, in order of preference:

1. **Real photography of the actual counter, scales and stock.** The only images
   that will genuinely serve this site, and they double as the answer for the
   Visit panel.
2. **An Unsplash or Pexels API key.** Both have exactly this style — it is where
   `jewellery.jpg` came from — but their search pages are client-rendered, so
   there is no way to reach the catalogue without a key.
3. **Client-chosen images dropped into this directory.** Anything added here must
   be checked against the three rules above first; rule 2 is the one that has
   already caught this project out.
