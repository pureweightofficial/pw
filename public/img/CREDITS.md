# Image provenance

All photographs here are from **Unsplash**, used under the
[Unsplash License](https://unsplash.com/license): free for commercial use,
modification permitted, no attribution required. Attribution is recorded anyway
so the client can verify provenance independently.

| File | Source | Used for |
| --- | --- | --- |
| `valuation.jpg` | https://unsplash.com/photos/LyaBFrZod7A | Gold Valuation panel |
| `bullion.jpg` | https://unsplash.com/photos/XHikIfxVZdY | Bullion Exchange panel |
| `jewellery.jpg` | https://unsplash.com/photos/LQdSOAw13KE | Jewellery Evaluation panel |

All three are served **pre-cropped to 900x1125 (4:5)** — the exact aspect the
service panels render. Cropping at source rather than with `object-cover` matters
here because the GitHub Pages build sets `images.unoptimized`, which disables
Next's responsive `srcSet` entirely: every visitor downloads one fixed file, so
any pixel outside the visible crop is pure waste on every load.

## Selection constraints

Chosen against three rules, because a stock licence does not cover everything a
photograph can get a business into:

1. **No identifiable people.** A model release is separate from an image
   licence, and this business's customers expect discretion.
2. **No branded or serial-numbered bullion.** Refiner marks are trademarks, and
   showing another mint's bars alongside Pureweight's name implies a
   relationship that does not exist.
3. **No third-party premises.** A photograph of somebody else's shop on a
   trader's website is a misrepresentation, licence or not.

## Private Appointments panel

Deliberately still uses the engraved `ArchMotif` plate rather than a photograph.
Every available stock image of a "private consultation" reads as generic
corporate office and would cheapen the section. Replace it when real
photography of the actual premises exists — that is the only image that will
genuinely serve it.
