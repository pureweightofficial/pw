/**
 * THE PANEL'S OWN COPY OF THE LAW — imported from the same schema the site
 * builds with, so the two cannot drift.
 *
 * scripts/check-content.mjs enforces these rules in CI and is the backstop
 * nothing can route around. But a rule that only fires in CI reads, to the
 * owner, as "I hit Save, nothing happened, the site never changed" — a
 * failure with no face. Running the identical checks here, live as they
 * type, turns every violation into a sentence next to the field before Save
 * is even enabled. Same law, better courtroom.
 */

import {
  BUSINESS_RULES,
  COPY_FIELDS,
  COPY_SECTIONS,
  FORBIDDEN_IN_PROSE,
  INSIGHT_DATE_PATTERN,
  INSIGHT_SLUG_PATTERN,
  SERVICE_IDS,
} from "@/lib/content-schema";

export type FieldIssue = { field: string; message: string };

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function forbiddenIn(text: string): { phrase: string; why: string } | null {
  for (const { pattern, why } of FORBIDDEN_IN_PROSE) {
    const m = text.match(new RegExp(pattern, "i"));
    if (m) return { phrase: m[0], why };
  }
  return null;
}

const BUSINESS_PROSE_KEYS = [
  "serviceArea",
  "appointmentProcess",
  "settlementMethods",
  "securityProcedures",
  "weighingEquipment",
  "founderMessage",
  "foundingStory",
] as const;

export function validateBusiness(doc: Record<string, unknown>): FieldIssue[] {
  const issues: FieldIssue[] = [];

  for (const [key, rule] of Object.entries(BUSINESS_RULES)) {
    if (key === "social") continue;
    const value = s(doc[key]);
    if (value === "") continue; // empty is legal — it renders the placeholder
    if (value.includes("[INSERT")) {
      issues.push({
        field: key,
        message: `Leave this empty instead of typing the placeholder — the site shows "${rule.placeholder}" for you.`,
      });
    }
    if ("pattern" in rule && rule.pattern && !new RegExp(rule.pattern).test(value)) {
      issues.push({
        field: key,
        message: `This doesn't look right — ${("patternHint" in rule && rule.patternHint) || "check the format"}.`,
      });
    }
    if ("requires" in rule && rule.requires) {
      for (const companion of rule.requires) {
        if (s(doc[companion]) === "") {
          issues.push({
            field: companion,
            message: `Needed before "${rule.label}" can appear on the site — a credential must name its source.`,
          });
        }
      }
    }
  }

  for (const key of BUSINESS_PROSE_KEYS) {
    const hit = forbiddenIn(s(doc[key]));
    if (hit) {
      issues.push({
        field: key,
        message: `Contains "${hit.phrase}" — ${hit.why}. The site will refuse to publish this.`,
      });
    }
  }

  const social = Array.isArray(doc.social) ? doc.social : [];
  for (const url of social) {
    if (s(url) !== "" && !/^https:\/\//.test(s(url))) {
      issues.push({
        field: "social",
        message: `"${s(url)}" must be a full address starting with https://`,
      });
    }
  }

  return issues;
}

export function validateServices(doc: Record<string, unknown>): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const id of SERVICE_IDS) {
    const svc = (doc[id] ?? {}) as Record<string, unknown>;
    const at = (f: string) => `${id}.${f}`;

    if (s(svc.summary) === "")
      issues.push({ field: at("summary"), message: "The one-line summary cannot be empty." });
    if (s(svc.body) === "")
      issues.push({ field: at("body"), message: "The description cannot be empty." });

    const points = Array.isArray(svc.points) ? svc.points : [];
    if (points.length < 1)
      issues.push({ field: at("points"), message: "At least one bullet point is needed." });
    if (points.some((p) => s(p) === ""))
      issues.push({ field: at("points"), message: "Remove the empty bullet point." });

    if (s(svc.image) !== "") {
      if (!/^\/img\//.test(s(svc.image)))
        issues.push({ field: at("image"), message: "Image paths must start with /img/." });
      if (s(svc.imageAlt) === "")
        issues.push({
          field: at("imageAlt"),
          message: "A photo needs a one-sentence description — it is what screen readers say out loud.",
        });
    }

    for (const f of ["summary", "body"] as const) {
      const hit = forbiddenIn(s(svc[f]));
      if (hit)
        issues.push({
          field: at(f),
          message: `Contains "${hit.phrase}" — ${hit.why}.`,
        });
    }
    for (const p of points) {
      const hit = forbiddenIn(s(p));
      if (hit)
        issues.push({
          field: at("points"),
          message: `A bullet contains "${hit.phrase}" — ${hit.why}.`,
        });
    }
  }
  return issues;
}

export function validateTestimonials(doc: Record<string, unknown>): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const list = Array.isArray(doc.testimonials) ? doc.testimonials : [];
  list.forEach((raw, i) => {
    const t = (raw ?? {}) as Record<string, unknown>;
    const n = i + 1;
    if (s(t.quote) === "")
      issues.push({ field: `t${i}.quote`, message: `Testimonial ${n} has no quote.` });
    if (s(t.name) === "")
      issues.push({
        field: `t${i}.name`,
        message: `Testimonial ${n} needs the customer's name — an unattributed quote reads as invented.`,
      });
    if (s(t.context) === "")
      issues.push({
        field: `t${i}.context`,
        message: `Testimonial ${n} needs context, e.g. "Sold a gold chain, June 2026".`,
      });
    const hit = forbiddenIn(s(t.quote));
    if (hit)
      issues.push({
        field: `t${i}.quote`,
        message: `Contains "${hit.phrase}" — ${hit.why}. Real customers may say this, but the site cannot print promises the business has not verified, even quoted.`,
      });
  });
  return issues;
}

export function validateFaq(doc: Record<string, unknown>): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const list = Array.isArray(doc.general) ? doc.general : [];
  if (list.length < 1) {
    issues.push({
      field: "faq",
      message: "At least one question is needed — an empty FAQ page is worse than none.",
    });
  }
  list.forEach((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const n = i + 1;
    if (s(item.question) === "") {
      issues.push({ field: `faq${i}.question`, message: `Question ${n} is empty.` });
    } else if (!s(item.question).endsWith("?")) {
      issues.push({
        field: `faq${i}.question`,
        message: `Question ${n} should end with a question mark.`,
      });
    }
    if (s(item.answer) === "") {
      issues.push({ field: `faq${i}.answer`, message: `Question ${n} has no answer.` });
    }
    const hit = forbiddenIn(s(item.answer));
    if (hit) {
      issues.push({
        field: `faq${i}.answer`,
        message: `Contains "${hit.phrase}" — ${hit.why}. FAQ answers are trade knowledge, not business promises; promises belong in Business Details where they are evidence-gated.`,
      });
    }
  });
  return issues;
}

export function validateCopy(doc: Record<string, unknown>): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const [key, meta] of Object.entries(COPY_SECTIONS)) {
    const section = (doc[key] ?? {}) as Record<string, unknown>;
    for (const field of COPY_FIELDS) {
      if (field === "lead" && !meta.leadRequired) continue;
      if (s(section[field]) === "") {
        issues.push({
          field: `copy.${key}.${field}`,
          message: `${meta.label}: ${field} cannot be empty — the site would quietly revert to the original line and your edit would vanish.`,
        });
      }
    }
    for (const field of COPY_FIELDS) {
      const hit = forbiddenIn(s(section[field]));
      if (hit) {
        issues.push({
          field: `copy.${key}.${field}`,
          message: `Contains "${hit.phrase}" — ${hit.why}.`,
        });
      }
    }
  }
  return issues;
}

/** One article, as edited in the panel. `takenSlugs` = the other articles. */
export function validateInsight(
  doc: Record<string, unknown>,
  takenSlugs: string[],
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (s(doc.title) === "")
    issues.push({ field: "insight.title", message: "The article needs a title." });
  if (s(doc.summary) === "")
    issues.push({
      field: "insight.summary",
      message: "The summary cannot be empty — it becomes the page description and the index card.",
    });
  if (s(doc.body) === "")
    issues.push({ field: "insight.body", message: "The article has no body text." });
  if (!new RegExp(INSIGHT_SLUG_PATTERN).test(s(doc.slug)))
    issues.push({
      field: "insight.slug",
      message: "The web address may only contain lowercase letters, digits and hyphens, e.g. how-gold-is-weighed.",
    });
  if (takenSlugs.includes(s(doc.slug)))
    issues.push({
      field: "insight.slug",
      message: "Another article already uses this web address.",
    });
  if (!new RegExp(INSIGHT_DATE_PATTERN).test(s(doc.date)))
    issues.push({
      field: "insight.date",
      message: "The date must look like 2026-08-01 (year-month-day).",
    });
  for (const field of ["title", "summary", "body"] as const) {
    const hit = forbiddenIn(s(doc[field]));
    if (hit)
      issues.push({
        field: `insight.${field}`,
        message: `Contains "${hit.phrase}" — ${hit.why}.`,
      });
  }
  return issues;
}
