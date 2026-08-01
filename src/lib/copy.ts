import copyContent from "@/content/copy.json";

/**
 * SITE COPY — the owner's words for the hero and the chapter openers, edited
 * through the Keeper's Site Copy tab and stored in src/content/copy.json.
 *
 * THE FALLBACKS ARE THE CONTRACT. Every section keeps its original line as a
 * default, so a blanked or malformed field in the JSON can never blank a
 * heading on the live site — the worst an editing accident can do is revert
 * a line to the original copy. The Keeper's own validation refuses empty
 * required fields long before this guard matters; this is the second wall,
 * not the first.
 *
 * `pillars.lead` is legitimately empty (that section has no lead paragraph),
 * which is why the accessor treats empty-with-empty-default as valid rather
 * than as an accident.
 */

export type OpenerCopy = {
  eyebrow: string;
  heading: string;
  accent: string;
  lead: string;
};

type SectionKey = keyof typeof copyContent;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function opener(key: SectionKey, defaults: OpenerCopy): OpenerCopy {
  const raw = (copyContent[key] ?? {}) as Partial<OpenerCopy>;
  return {
    eyebrow: s(raw.eyebrow) || defaults.eyebrow,
    heading: s(raw.heading) || defaults.heading,
    accent: s(raw.accent) || defaults.accent,
    // Empty lead is a valid state (pillars has none); only fall back when the
    // DEFAULT expects text, so a section that should have a lead never loses it.
    lead: defaults.lead === "" ? s(raw.lead) : s(raw.lead) || defaults.lead,
  };
}
