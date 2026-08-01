"use client";

/**
 * THE KEEPER — Pureweight's own admin panel, in Pureweight's own hand.
 *
 * The first version of this route vendored a third-party CMS. It worked, and
 * the owner's first words on seeing it were that it did not look professional
 * next to the site it edits — stock grey chrome, someone else's logo, a
 * mobile-app banner. He was right: a tool the owner uses monthly IS part of
 * the brand, and this one now speaks the same language as the site — the same
 * faces, the same gold on the same black, the same engraved restraint.
 *
 * WHAT DID NOT CHANGE, BECAUSE IT WAS NEVER ABOUT LOOKS:
 *
 *   - no server, no OAuth proxy, no third-party service, $0/month. The owner
 *     signs in with a fine-grained GitHub token and this page commits through
 *     api.github.com directly.
 *   - status is DERIVED, never asserted. There is no "verified" switch: a
 *     field filled in becomes a fact, a field left empty renders the site's
 *     visible placeholder. The [INSERT …] labels live in content-schema.ts,
 *     which this panel reads but never exposes for editing.
 *   - the same rules the CI gate enforces run here, live, as the owner types
 *     — imported from the same schema file, so they cannot drift. A violation
 *     is a sentence next to the field, not a silent non-deploy.
 *
 * ONE SAVE IS ONE COMMIT (src/lib/keeper/github.ts), and after saving the
 * panel polls the build so "published" is a statement, not a hope.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetPath } from "@/lib/asset";
import {
  BUSINESS_RULES,
  COMPANION_FIELDS,
  SERVICE_IDS,
} from "@/lib/content-schema";
import {
  CONTENT_PATHS,
  KeeperApiError,
  loadContent,
  publishStatus,
  save,
  validateToken,
  type PublishStatus,
  type Signee,
} from "@/lib/keeper/github";
import { prepareImage, type PreparedImage } from "@/lib/keeper/image";
import {
  validateBusiness,
  validateServices,
  validateTestimonials,
  type FieldIssue,
} from "@/lib/keeper/validate";

/* -------------------------------------------------------------------------- */
/* SMALL PIECES                                                               */
/* -------------------------------------------------------------------------- */

/**
 * localStorage on *.github.io is shared across every project site the owning
 * account publishes, so the key is namespaced and the token is the ONLY thing
 * stored. Sign out erases it. sessionStorage would be safer still, but a
 * shop owner who must re-create a token every time the tab closes will stop
 * using the panel — and the token is scoped to this one repository's contents.
 */
const TOKEN_KEY = "pw:keeper:token";

const MONO_LABEL =
  "font-mono text-[0.62rem] font-medium tracking-[0.24em] uppercase";

const INPUT_CLASS =
  "w-full border border-gold-antique/25 bg-void/60 px-4 py-3 text-sm text-ivory " +
  "placeholder:text-ash/40 focus:border-gold-rich focus:outline-none " +
  "focus:ring-1 focus:ring-gold-rich/50 transition-colors duration-200";

type Doc = Record<string, unknown>;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Mirrors the adapter in site.ts: would this field render as fact? */
function isFact(doc: Doc, key: keyof typeof BUSINESS_RULES): boolean {
  const rule = BUSINESS_RULES[key];
  const value = s(doc[key]);
  if (value === "") return false;
  if ("pattern" in rule && rule.pattern && !new RegExp(rule.pattern).test(value)) return false;
  if ("requires" in rule && rule.requires) {
    for (const c of rule.requires) if (s(doc[c]) === "") return false;
  }
  return true;
}

function FieldStatus({ fact, placeholder }: { fact: boolean; placeholder: string }) {
  return fact ? (
    <span className={`${MONO_LABEL} text-gold-high`}>Shown as fact</span>
  ) : (
    <span className={`${MONO_LABEL} text-ash/70`} title={placeholder}>
      Site shows placeholder
    </span>
  );
}

function IssueLine({ text }: { text: string }) {
  return (
    <p className="mt-2 text-xs leading-relaxed text-[#d8825a]">
      <span aria-hidden="true">✗ </span>
      {text}
    </p>
  );
}

function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="border-b border-gold-antique/20 pb-4">
      <h2 className="font-display text-2xl text-ivory lg:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ash">{note}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* THE PAGE                                                                   */
/* -------------------------------------------------------------------------- */

type Tab = "business" | "services" | "testimonials";

export default function KeeperPage() {
  const [token, setToken] = useState<string | null>(null);
  const [signee, setSignee] = useState<Signee | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [docs, setDocs] = useState<Record<string, Doc> | null>(null);
  const [baseSha, setBaseSha] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, PreparedImage>>({});

  const [tab, setTab] = useState<Tab>("business");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publish, setPublish] = useState<PublishStatus | null>(null);
  const pollRef = useRef<number | null>(null);

  /** Test hook: ?branch=x redirects saves away from main. Visibly bannered. */
  const branchOverride = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("branch") ?? undefined;
  }, []);

  /* ------------------------------ auth ------------------------------ */

  const signIn = useCallback(async (candidate: string) => {
    setChecking(true);
    setAuthError(null);
    try {
      const who = await validateToken(candidate.trim());
      if (!who.canWrite) {
        setAuthError(
          `Signed in as ${who.login}, but this key cannot save changes — it needs "Contents: read and write" on the pw repository.`,
        );
        return;
      }
      localStorage.setItem(TOKEN_KEY, candidate.trim());
      setToken(candidate.trim());
      setSignee(who);
    } catch (error) {
      setAuthError(
        error instanceof KeeperApiError
          ? error.friendly
          : "Could not reach GitHub. Check the connection and try again.",
      );
    } finally {
      setChecking(false);
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSignee(null);
    setDocs(null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) void signIn(stored);
  }, [signIn]);

  /* ----------------------------- content ---------------------------- */

  useEffect(() => {
    if (!token || !signee || docs) return;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadContent(token);
        if (cancelled) return;
        setDocs(loaded.files);
        setBaseSha(loaded.headSha);
      } catch (error) {
        if (!cancelled)
          setSaveError(
            error instanceof KeeperApiError ? error.friendly : String(error),
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, signee, docs]);

  const [businessPath, servicesPath, testimonialsPath] = CONTENT_PATHS;
  const business = (docs?.[businessPath] ?? null) as Doc | null;
  const services = (docs?.[servicesPath] ?? null) as Doc | null;
  const testimonials = (docs?.[testimonialsPath] ?? null) as Doc | null;

  const update = useCallback(
    (path: string, next: Doc) => {
      setDocs((prev) => (prev ? { ...prev, [path]: next } : prev));
      setDirty(true);
      setPublish(null);
    },
    [],
  );

  /* --------------------------- validation --------------------------- */

  const issues: FieldIssue[] = useMemo(() => {
    if (!business || !services || !testimonials) return [];
    return [
      ...validateBusiness(business),
      ...validateServices(services),
      ...validateTestimonials(testimonials),
    ];
  }, [business, services, testimonials]);

  /* ------------------------------ save ------------------------------ */

  const doSave = useCallback(async () => {
    if (!token || !docs || !baseSha || issues.length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const binaries: Record<string, Uint8Array> = {};
      for (const img of Object.values(pendingImages)) {
        binaries[img.repoPath] = img.bytes;
      }
      const result = await save(token, {
        json: docs,
        binaries,
        message: `Keeper: content update by ${signee?.login ?? "owner"}`,
        baseSha,
        branch: branchOverride,
      });
      setDirty(false);
      setPendingImages({});
      setBaseSha(result.commitSha);
      setPublish({ state: "publishing" });

      // Poll the build until it settles. 15s cadence; a build takes minutes.
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          const status = await publishStatus(token, result.commitSha);
          if (status.state === "published" || status.state === "failed") {
            setPublish(status);
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        } catch {
          /* transient poll failure — keep trying */
        }
      }, 15000);
    } catch (error) {
      setSaveError(
        error instanceof KeeperApiError ? error.friendly : String(error),
      );
    } finally {
      setSaving(false);
    }
  }, [token, docs, baseSha, issues, pendingImages, signee, branchOverride]);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */

  if (!signee) {
    return (
      <SignIn
        onSubmit={signIn}
        error={authError}
        checking={checking}
      />
    );
  }

  if (!business || !services || !testimonials) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className={`${MONO_LABEL} text-ash`}>Opening the ledger…</p>
      </main>
    );
  }

  return (
    <main className="min-h-svh pb-40">
      {branchOverride ? (
        <div className="border-b border-[#d8825a]/40 bg-[#d8825a]/10 px-6 py-2 text-center">
          <span className={`${MONO_LABEL} text-[#d8825a]`}>
            Test mode — saving to branch “{branchOverride}”, not the live site
          </span>
        </div>
      ) : null}

      {/* ------------------------------ header ------------------------ */}
      <header className="border-b border-gold-antique/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-display text-xl leading-none text-ivory">
              Pureweight
            </p>
            <p className={`${MONO_LABEL} mt-1.5 text-gold-antique`}>
              The Keeper
            </p>
          </div>
          <div className="flex items-center gap-6">
            <a
              href={assetPath("/")}
              target="_blank"
              rel="noopener"
              className={`${MONO_LABEL} text-ash transition-colors hover:text-gold-high`}
            >
              View site ↗
            </a>
            <div className="text-right">
              <p className="text-xs text-ash">{signee.login}</p>
              <button
                type="button"
                onClick={signOut}
                className={`${MONO_LABEL} text-gold-antique transition-colors hover:text-gold-high`}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* tabs */}
        <nav className="mx-auto flex max-w-5xl gap-8 px-6" aria-label="Sections">
          {(
            [
              ["business", "Business Details"],
              ["services", "What We Buy"],
              ["testimonials", "Testimonials"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`${MONO_LABEL} border-b-2 pb-3 transition-colors ${
                tab === key
                  ? "border-gold-rich text-gold-high"
                  : "border-transparent text-ash hover:text-ivory"
              }`}
              aria-current={tab === key ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ------------------------------ body -------------------------- */}
      <div className="mx-auto max-w-5xl px-6 pt-10">
        {tab === "business" ? (
          <BusinessEditor
            doc={business}
            issues={issues}
            onChange={(next) => update(businessPath, next)}
          />
        ) : null}
        {tab === "services" ? (
          <ServicesEditor
            doc={services}
            issues={issues}
            onChange={(next) => update(servicesPath, next)}
            onImage={(img) =>
              setPendingImages((prev) => ({ ...prev, [img.repoPath]: img }))
            }
          />
        ) : null}
        {tab === "testimonials" ? (
          <TestimonialsEditor
            doc={testimonials}
            issues={issues}
            onChange={(next) => update(testimonialsPath, next)}
          />
        ) : null}
      </div>

      {/* ---------------------------- save bar ------------------------ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-antique/25 bg-void/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0 flex-1">
            {issues.length > 0 ? (
              <p className="text-xs text-[#d8825a]">
                {issues.length} thing{issues.length === 1 ? "" : "s"} to fix
                before saving — marked next to the fields.
              </p>
            ) : saveError ? (
              <p className="text-xs text-[#d8825a]">{saveError}</p>
            ) : publish?.state === "publishing" ? (
              <p className="text-xs text-ash">
                Publishing… the site rebuilds itself; this takes a few minutes.
              </p>
            ) : publish?.state === "published" ? (
              <p className="text-xs text-gold-high">
                Published. Allow up to ten minutes for the old page to leave
                the cache, then hard-refresh (Ctrl+Shift+R).
              </p>
            ) : publish?.state === "failed" ? (
              <p className="text-xs text-[#d8825a]">
                The site refused this change and nothing was published.{" "}
                <a
                  className="underline"
                  href={(publish as { runUrl: string }).runUrl}
                  target="_blank"
                  rel="noopener"
                >
                  See why
                </a>{" "}
                or contact your developer.
              </p>
            ) : dirty ? (
              <p className="text-xs text-ash">Unsaved changes.</p>
            ) : (
              <p className="text-xs text-ash/60">Everything is saved.</p>
            )}
          </div>
          <button
            type="button"
            onClick={doSave}
            disabled={!dirty || saving || issues.length > 0}
            className="border border-gold-rich/60 bg-gold-antique/10 px-8 py-3 font-mono text-[0.68rem] font-medium tracking-[0.28em] text-gold-high uppercase transition-all duration-300 enabled:hover:border-gold-high enabled:hover:bg-gold-antique/20 disabled:opacity-35"
          >
            {saving ? "Saving…" : "Save & Publish"}
          </button>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* SIGN-IN                                                                    */
/* -------------------------------------------------------------------------- */

function SignIn({
  onSubmit,
  error,
  checking,
}: {
  onSubmit: (token: string) => void;
  error: string | null;
  checking: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="border border-gold-antique/25 bg-char/80 p-10">
          <p className="font-display text-3xl leading-none text-ivory">
            Pureweight
          </p>
          <p className={`${MONO_LABEL} mt-2 text-gold-antique`}>The Keeper</p>
          <p className="mt-6 text-sm leading-relaxed text-ash">
            Your website&apos;s ledger. Sign in with your access key to edit
            business details, the buying panels and testimonials.
          </p>

          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) onSubmit(value);
            }}
          >
            <label htmlFor="keeper-token" className={`${MONO_LABEL} text-ash`}>
              Access key
            </label>
            <input
              id="keeper-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${INPUT_CLASS} mt-2 font-mono`}
              placeholder="github_pat_…"
            />
            {error ? <IssueLine text={error} /> : null}
            <button
              type="submit"
              disabled={checking || value.trim() === ""}
              className="mt-6 w-full border border-gold-rich/60 bg-gold-antique/10 py-3.5 font-mono text-[0.68rem] font-medium tracking-[0.28em] text-gold-high uppercase transition-all duration-300 enabled:hover:border-gold-high enabled:hover:bg-gold-antique/20 disabled:opacity-35"
            >
              {checking ? "Checking…" : "Open the Keeper"}
            </button>
          </form>

          <details className="mt-8 border-t border-gold-antique/15 pt-5">
            <summary
              className={`${MONO_LABEL} cursor-pointer list-none text-gold-antique transition-colors hover:text-gold-high`}
            >
              How do I get my access key?
            </summary>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-ash">
              <li>
                Open{" "}
                <a
                  className="text-gold-antique underline hover:text-gold-high"
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener"
                >
                  GitHub&apos;s token page
                </a>{" "}
                (sign in to GitHub if asked).
              </li>
              <li>
                Repository access → <em>Only select repositories</em> →{" "}
                <strong>pw</strong>.
              </li>
              <li>
                Permissions → <em>Contents</em> → <strong>Read and write</strong>.
              </li>
              <li>
                Expiration → <em>No expiration</em> → <strong>Generate</strong>,
                copy, paste above. Keep a copy in a password manager — it is a
                key to the website.
              </li>
            </ol>
          </details>
        </div>
        <p className="mt-4 text-center text-[0.65rem] leading-relaxed text-ash/50">
          The key stays in this browser and is sent only to GitHub. Nothing on
          this page is stored anywhere else.
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* BUSINESS EDITOR                                                            */
/* -------------------------------------------------------------------------- */

const BUSINESS_GROUPS: {
  title: string;
  note: string;
  keys: (keyof typeof BUSINESS_RULES | (typeof COMPANION_FIELDS)[number])[];
  long?: string[];
}[] = [
  {
    title: "Contact & Location",
    note: "The facts a visitor needs to walk in. These feed the contact page, the footer and the map listing.",
    keys: ["address", "telephone", "email", "openingHours", "serviceArea"],
  },
  {
    title: "Business Identity",
    note: "As registered. These appear in the evidence ledger, exactly as written here.",
    keys: ["legalName", "registrationNumber", "vatNumber", "yearEstablished"],
  },
  {
    title: "How You Work",
    note: "Shown where visitors read about the process. Plain statements only — the site refuses promises it cannot check.",
    keys: [
      "appointmentProcess",
      "settlementMethods",
      "priceReferenceSource",
      "securityProcedures",
      "weighingEquipment",
    ],
    long: ["appointmentProcess", "securityProcedures"],
  },
  {
    title: "Credentials",
    note: "A credential must name who issued it — insurance needs its insurer, a review score needs its public source. Until both halves are filled, the site keeps showing the honest placeholder.",
    keys: [
      "insurance",
      "insuranceIssuer",
      "memberships",
      "certifications",
      "licences",
      "reviewScore",
      "reviewScoreSource",
    ],
  },
  {
    title: "Your Story",
    note: "In your own words. Longer is fine.",
    keys: ["founderMessage", "foundingStory"],
    long: ["founderMessage", "foundingStory"],
  },
];

function BusinessEditor({
  doc,
  issues,
  onChange,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...doc, [key]: value });
  const issueFor = (key: string) => issues.filter((i) => i.field === key);

  const social = (Array.isArray(doc.social) ? doc.social : []) as string[];

  return (
    <div className="space-y-14">
      <SectionHeading
        title="Business Details"
        note="Fill a field in and it appears on the site as fact. Leave it empty and the site shows a visible “[INSERT …]” slot instead — honest about what has not been confirmed. There is no publish switch: filling the field in is the confirmation."
      />

      {BUSINESS_GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend className="font-display text-lg text-gold-high">
            {group.title}
          </legend>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ash/80">
            {group.note}
          </p>
          <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {group.keys.map((key) => {
              const companion = (COMPANION_FIELDS as readonly string[]).includes(key);
              const rule = companion
                ? null
                : BUSINESS_RULES[key as keyof typeof BUSINESS_RULES];
              const long = group.long?.includes(key);
              const fieldIssues = issueFor(key);
              const label = rule
                ? rule.label
                : key === "insuranceIssuer"
                  ? "Insurance — issuer"
                  : "Review score — source URL";
              return (
                <div key={key} className={long ? "sm:col-span-2" : undefined}>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={`biz-${key}`} className={`${MONO_LABEL} text-ash`}>
                      {label}
                    </label>
                    {rule ? (
                      <FieldStatus
                        fact={isFact(doc, key as keyof typeof BUSINESS_RULES)}
                        placeholder={rule.placeholder}
                      />
                    ) : null}
                  </div>
                  {long ? (
                    <textarea
                      id={`biz-${key}`}
                      rows={4}
                      value={s(doc[key])}
                      onChange={(e) => set(key, e.target.value)}
                      className={`${INPUT_CLASS} mt-2 resize-y`}
                    />
                  ) : (
                    <input
                      id={`biz-${key}`}
                      type="text"
                      value={s(doc[key])}
                      onChange={(e) => set(key, e.target.value)}
                      className={`${INPUT_CLASS} mt-2`}
                    />
                  )}
                  {fieldIssues.map((issue, i) => (
                    <IssueLine key={i} text={issue.message} />
                  ))}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* social list */}
      <fieldset>
        <legend className="font-display text-lg text-gold-high">Online</legend>
        <p className="mt-1 text-xs leading-relaxed text-ash/80">
          Full https:// addresses of your profiles. These also feed the
          structured data search engines read.
        </p>
        <div className="mt-6 space-y-3">
          {social.map((url, i) => (
            <div key={i} className="flex gap-3">
              <input
                type="text"
                aria-label={`Social profile ${i + 1}`}
                value={url}
                onChange={(e) => {
                  const next = [...social];
                  next[i] = e.target.value;
                  set("social", next);
                }}
                className={INPUT_CLASS}
                placeholder="https://…"
              />
              <button
                type="button"
                onClick={() => set("social", social.filter((_, j) => j !== i))}
                className={`${MONO_LABEL} shrink-0 border border-gold-antique/25 px-4 text-ash transition-colors hover:border-gold-rich hover:text-gold-high`}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("social", [...social, ""])}
            className={`${MONO_LABEL} border border-gold-antique/25 px-5 py-3 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
          >
            + Add profile
          </button>
          {issueFor("social").map((issue, i) => (
            <IssueLine key={i} text={issue.message} />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SERVICES EDITOR                                                            */
/* -------------------------------------------------------------------------- */

const SERVICE_LABELS: Record<(typeof SERVICE_IDS)[number], string> = {
  jewellery: "Gold Jewellery",
  silver: "Silver",
  coins: "Coins",
  bullion: "Bars & Bullion",
};

function ServicesEditor({
  doc,
  issues,
  onChange,
  onImage,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
  onImage: (img: PreparedImage) => void;
}) {
  const issueFor = (field: string) => issues.filter((i) => i.field === field);
  const [imgBusy, setImgBusy] = useState<string | null>(null);

  return (
    <div className="space-y-14">
      <SectionHeading
        title="What We Buy"
        note="The four buying panels. Wording, bullet points and photos are yours; the panels themselves and their titles are fixed. Photos follow three rules: no identifiable people, no branded or serial-numbered bullion, no one else’s premises."
      />

      {SERVICE_IDS.map((id) => {
        const svc = (doc[id] ?? {}) as Record<string, unknown>;
        const points = (Array.isArray(svc.points) ? svc.points : []) as string[];
        const setSvc = (patch: Record<string, unknown>) =>
          onChange({ ...doc, [id]: { ...svc, ...patch } });

        return (
          <fieldset key={id} className="border border-gold-antique/15 p-7">
            <legend className="px-3 font-display text-lg text-gold-high">
              {SERVICE_LABELS[id]}
            </legend>

            <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
              {/* image column */}
              <div>
                <span className={`${MONO_LABEL} text-ash`}>Photo</span>
                <div className="mt-2 aspect-4/5 w-full overflow-hidden border border-gold-antique/20 bg-void">
                  {s(svc.image) !== "" ? (
                    /* Plain <img> on purpose: the preview may point at a
                       just-staged upload that exists only in this browser,
                       and next/image is a no-op under `images.unoptimized`
                       anyway. Admin-only route; LCP is irrelevant here. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assetPath(s(svc.image))}
                      alt={s(svc.imageAlt)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className={`${MONO_LABEL} text-ash/50`}>
                        Engraved plate
                      </span>
                    </div>
                  )}
                </div>
                <label
                  className={`${MONO_LABEL} mt-3 block cursor-pointer border border-gold-antique/25 px-4 py-2.5 text-center text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
                >
                  {imgBusy === id ? "Preparing…" : "Replace photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setImgBusy(id);
                      try {
                        const prepared = await prepareImage(file);
                        onImage(prepared);
                        setSvc({ image: prepared.contentPath });
                      } finally {
                        setImgBusy(null);
                      }
                    }}
                  />
                </label>
                {issueFor(`${id}.image`).map((issue, i) => (
                  <IssueLine key={i} text={issue.message} />
                ))}
              </div>

              {/* copy column */}
              <div className="space-y-5">
                <div>
                  <label htmlFor={`${id}-summary`} className={`${MONO_LABEL} text-ash`}>
                    One-line summary
                  </label>
                  <input
                    id={`${id}-summary`}
                    type="text"
                    value={s(svc.summary)}
                    onChange={(e) => setSvc({ summary: e.target.value })}
                    className={`${INPUT_CLASS} mt-2`}
                  />
                  {issueFor(`${id}.summary`).map((issue, i) => (
                    <IssueLine key={i} text={issue.message} />
                  ))}
                </div>
                <div>
                  <label htmlFor={`${id}-body`} className={`${MONO_LABEL} text-ash`}>
                    Description
                  </label>
                  <textarea
                    id={`${id}-body`}
                    rows={3}
                    value={s(svc.body)}
                    onChange={(e) => setSvc({ body: e.target.value })}
                    className={`${INPUT_CLASS} mt-2 resize-y`}
                  />
                  {issueFor(`${id}.body`).map((issue, i) => (
                    <IssueLine key={i} text={issue.message} />
                  ))}
                </div>
                <div>
                  <span className={`${MONO_LABEL} text-ash`}>Bullet points</span>
                  <div className="mt-2 space-y-2">
                    {points.map((p, i) => (
                      <div key={i} className="flex gap-3">
                        <input
                          type="text"
                          aria-label={`${SERVICE_LABELS[id]} bullet ${i + 1}`}
                          value={p}
                          onChange={(e) => {
                            const next = [...points];
                            next[i] = e.target.value;
                            setSvc({ points: next });
                          }}
                          className={INPUT_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => setSvc({ points: points.filter((_, j) => j !== i) })}
                          className={`${MONO_LABEL} shrink-0 border border-gold-antique/25 px-4 text-ash transition-colors hover:border-gold-rich hover:text-gold-high`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSvc({ points: [...points, ""] })}
                      className={`${MONO_LABEL} border border-gold-antique/25 px-5 py-2.5 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
                    >
                      + Add point
                    </button>
                  </div>
                  {issueFor(`${id}.points`).map((issue, i) => (
                    <IssueLine key={i} text={issue.message} />
                  ))}
                </div>
                <div>
                  <label htmlFor={`${id}-alt`} className={`${MONO_LABEL} text-ash`}>
                    Photo description
                  </label>
                  <input
                    id={`${id}-alt`}
                    type="text"
                    value={s(svc.imageAlt)}
                    onChange={(e) => setSvc({ imageAlt: e.target.value })}
                    className={`${INPUT_CLASS} mt-2`}
                    placeholder="One sentence: what is in the photo?"
                  />
                  {issueFor(`${id}.imageAlt`).map((issue, i) => (
                    <IssueLine key={i} text={issue.message} />
                  ))}
                </div>
              </div>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* TESTIMONIALS EDITOR                                                        */
/* -------------------------------------------------------------------------- */

function TestimonialsEditor({
  doc,
  issues,
  onChange,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
}) {
  const list = (Array.isArray(doc.testimonials) ? doc.testimonials : []) as {
    quote?: string;
    name?: string;
    context?: string;
  }[];
  const issueFor = (field: string) => issues.filter((i) => i.field === field);
  const setList = (next: typeof list) => onChange({ ...doc, testimonials: next });

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Testimonials"
        note="Real customer words only, with the customer's name and a line of context. The site refuses anonymous quotes, and refuses quotes containing promises the business has not verified — prices, timescales, guarantees — even when a customer genuinely said them."
      />

      {list.length === 0 ? (
        <p className="text-sm text-ash/70">
          None yet. The site currently shows its honest “no testimonials have
          been supplied” state — add the first real one below.
        </p>
      ) : null}

      {list.map((t, i) => (
        <fieldset key={i} className="border border-gold-antique/15 p-7">
          <legend className={`${MONO_LABEL} px-3 text-gold-antique`}>
            Testimonial {i + 1}
          </legend>
          <div className="space-y-5">
            <div>
              <label htmlFor={`t${i}-quote`} className={`${MONO_LABEL} text-ash`}>
                Quote
              </label>
              <textarea
                id={`t${i}-quote`}
                rows={3}
                value={t.quote ?? ""}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...t, quote: e.target.value };
                  setList(next);
                }}
                className={`${INPUT_CLASS} mt-2 resize-y`}
              />
              {issueFor(`t${i}.quote`).map((issue, j) => (
                <IssueLine key={j} text={issue.message} />
              ))}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`t${i}-name`} className={`${MONO_LABEL} text-ash`}>
                  Customer name
                </label>
                <input
                  id={`t${i}-name`}
                  type="text"
                  value={t.name ?? ""}
                  onChange={(e) => {
                    const next = [...list];
                    next[i] = { ...t, name: e.target.value };
                    setList(next);
                  }}
                  className={`${INPUT_CLASS} mt-2`}
                />
                {issueFor(`t${i}.name`).map((issue, j) => (
                  <IssueLine key={j} text={issue.message} />
                ))}
              </div>
              <div>
                <label htmlFor={`t${i}-context`} className={`${MONO_LABEL} text-ash`}>
                  Context
                </label>
                <input
                  id={`t${i}-context`}
                  type="text"
                  value={t.context ?? ""}
                  onChange={(e) => {
                    const next = [...list];
                    next[i] = { ...t, context: e.target.value };
                    setList(next);
                  }}
                  className={`${INPUT_CLASS} mt-2`}
                  placeholder="Sold a gold chain, June 2026"
                />
                {issueFor(`t${i}.context`).map((issue, j) => (
                  <IssueLine key={j} text={issue.message} />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setList(list.filter((_, j) => j !== i))}
              className={`${MONO_LABEL} border border-gold-antique/25 px-5 py-2.5 text-ash transition-colors hover:border-[#d8825a] hover:text-[#d8825a]`}
            >
              Remove testimonial
            </button>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setList([...list, { quote: "", name: "", context: "" }])}
        className={`${MONO_LABEL} border border-gold-antique/25 px-6 py-3.5 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
      >
        + Add testimonial
      </button>
    </div>
  );
}
