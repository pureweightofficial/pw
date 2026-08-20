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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { assetPath } from "@/lib/asset";
import { brand } from "@/lib/site";
import {
  BUSINESS_RULES,
  COMPANION_FIELDS,
  DAYS,
  HERO_HEADING_SOFT_MAX,
  COPY_SECTIONS,
  composeTitle,
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_PAGES,
  SEO_TITLE_SOFT_MAX,
  SERVICE_IDS,
  TIME_PATTERN,
} from "@/lib/content-schema";
import {
  CONTENT_PATHS,
  INSIGHTS_DIR,
  KeeperApiError,
  REPO,
  listContentEdits,
  listImages,
  listInsightFiles,
  listRuns,
  loadContent,
  loadInsight,
  publishStatus,
  save,
  validateToken,
  type EditSummary,
  type InsightFile,
  type RepoImage,
  type PublishStatus,
  type RunSummary,
  type Signee,
} from "@/lib/keeper/github";
import {
  currentSession,
  fetchGithubToken,
  signInWithPassword,
  signOut as supabaseSignOut,
  supabaseConfigured,
} from "@/lib/keeper/supabase";
import { prepareImage, type PreparedImage } from "@/lib/keeper/image";
import {
  validateBusiness,
  validateCopy,
  validateFaq,
  validateInsight,
  validateSeo,
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

/*
  SUPABASE IS THE DOOR; GITHUB IS STILL THE LEDGER.

  When this build has Supabase credentials the owner signs in with an email
  and a password, and the GitHub token is fetched from a row only a Keeper
  admin can read (see lib/keeper/supabase.ts and docs/supabase-keeper.sql).
  The token then lives in React state for the session and is never written to
  localStorage — which is the actual security gain, since the old flow parked
  a repository-write credential in browser storage indefinitely.

  When this build does NOT have those credentials, everything below falls back
  to the original paste-a-token screen, unchanged. That is deliberate: a
  missing environment variable must not be able to lock a live business out of
  its own admin panel, and possessing a valid fine-grained PAT for the repo is
  itself proof of authorisation, so the fallback is not a weaker door.
*/

const MONO_LABEL =
  "font-mono text-[0.62rem] font-medium tracking-[0.24em] uppercase";

const INPUT_CLASS =
  "w-full border border-gold-antique/25 bg-void/60 px-4 py-3 text-sm text-ivory " +
  "placeholder:text-ash/40 focus:border-gold-rich focus:outline-none " +
  "focus:ring-1 focus:ring-gold-rich/50 transition-colors duration-200";

/**
 * SECTION ICONS
 *
 * Drawn inline rather than pulled from an icon package, for the same reason the
 * site's 3D is procedural: this panel ships no binary assets and adds no
 * dependency for nine small glyphs. Each is a 16px stroke drawing on
 * `currentColor`, so it inherits the nav item's own selected/hover colour
 * without a second styling rule.
 *
 * They are decoration. Every one is aria-hidden and the nav item's text label
 * stays exactly as it was — an icon that conveyed meaning on its own would put
 * the whole strip behind a guess for anyone using a screen reader, and the
 * keeper a11y gate reads those names.
 */
const NAV_ICONS: Record<Tab, ReactNode> = {
  dashboard: (
    <>
      <rect x="2" y="2" width="5.5" height="5.5" />
      <rect x="10.5" y="2" width="5.5" height="5.5" />
      <rect x="2" y="10.5" width="5.5" height="5.5" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" />
    </>
  ),
  business: (
    <>
      <path d="M2 16V6l7-4 7 4v10" />
      <path d="M6.5 16v-5h5v5" />
    </>
  ),
  services: (
    <>
      <path d="M9 2v14" />
      <path d="M3 6h12" />
      <path d="M3 6 1 11h4L3 6Z" />
      <path d="M15 6l-2 5h4l-2-5Z" />
    </>
  ),
  testimonials: (
    <>
      <path d="M2 3h14v9H6l-4 3V3Z" />
      <path d="M5.5 7.5h2M9 7.5h3.5" />
    </>
  ),
  faq: (
    <>
      <circle cx="9" cy="9" r="7" />
      <path d="M7 7a2 2 0 1 1 2.6 1.9c-.4.15-.6.5-.6.9v.4" />
      <path d="M9 13h.01" />
    </>
  ),
  copy: (
    <>
      <path d="M3.5 2h7l4 4v10h-11V2Z" />
      <path d="M10.5 2v4h4" />
      <path d="M6 9.5h6M6 12.5h6" />
    </>
  ),
  insights: (
    <>
      <path d="M3 15.5 2 17l1.5-1" />
      <path d="M4 14.5 13.5 5a1.8 1.8 0 0 0-2.5-2.5L1.5 12l-.5 4 4-.5Z" />
      <path d="M10 4.5 13.5 8" />
    </>
  ),
  media: (
    <>
      <rect x="2" y="3" width="14" height="12" />
      <circle cx="6.5" cy="7" r="1.3" />
      <path d="m2 12 4-3.5 4 3.5 3-2.5 3 2.5" />
    </>
  ),
  seo: (
    <>
      <circle cx="7.5" cy="7.5" r="5.5" />
      <path d="m11.5 11.5 4.5 4.5" />
    </>
  ),
};

function NavIcon({ tab }: { tab: Tab }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 18 18"
      className="h-[1.05rem] w-[1.05rem] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {NAV_ICONS[tab]}
    </svg>
  );
}

/**
 * A section with nothing in it yet.
 *
 * The editors used to say "No articles yet." on a bare line and leave seven
 * hundred pixels of black underneath, which reads as a page that failed to load
 * rather than one that is simply empty. A bordered card the same width as the
 * content that will eventually replace it says the state is deliberate, and
 * carries the action that ends it.
 */
function EmptyState({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-gold-antique/25 bg-gold-antique/[0.03] px-8 py-12 text-center">
      <p className={`${MONO_LABEL} text-gold-antique`}>{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ash">
        {note}
      </p>
      {children ? <div className="mt-7 flex justify-center">{children}</div> : null}
    </div>
  );
}

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

/**
 * A validation message.
 *
 * `control` is the id of the field the message belongs to, and passing it is
 * what turns a sentence sitting near a box into a sentence attached to it —
 * `aria-invalid` and `aria-describedby` are wired from these nodes by the
 * effect in KeeperPage.
 *
 * IT IS PASSED, NOT DERIVED. The obvious shortcut is to compute the control id
 * from the field name, since most of them differ only by a dot. Checked
 * against the real markup, that rule is wrong five times out of thirteen —
 * `faq0.question` is on a control called `faq0-q`, and `imageAlt` on one
 * called `-alt`. A derived id that misses does not fail loudly; it points
 * assistive technology at nothing. So the caller states it.
 *
 * Without `control` the message is a standalone error — sign-in, uploads —
 * and announces itself, because nothing else on screen will say it.
 */
function IssueLine({ text, control }: { text: string; control?: string }) {
  return (
    <p
      data-error-for={control}
      role={control ? undefined : "alert"}
      className="mt-2 text-xs leading-relaxed text-[#d8825a]"
    >
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

type Tab = "dashboard" | "business" | "services" | "testimonials" | "faq" | "copy" | "insights" | "media" | "seo";

/** "3 minutes ago" — dates in an admin panel should read like speech. */
function timeAgo(iso: string): string {
  const sec = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

export default function KeeperPage() {
  const [token, setToken] = useState<string | null>(null);
  /** The Supabase account signed in, when that is how they got here. */
  const [account, setAccount] = useState<string | null>(null);
  const [signee, setSignee] = useState<Signee | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [docs, setDocs] = useState<Record<string, Doc> | null>(null);
  const [baseSha, setBaseSha] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, PreparedImage>>({});
  /*
    Two refs that exist because SAVING IS NOT INSTANT and the owner keeps
    typing. `editSeq` increments on every edit; doSave captures it before the
    network round-trip and only clears `dirty` if nothing moved meanwhile —
    the old unconditional setDirty(false) silently marked mid-save edits as
    saved, and they were lost on the next navigation with no warning.
    `pristine` holds the serialised form of every content file as last LOADED
    or SAVED, so a save can send ONLY what actually changed: sending all six
    files re-based a stale snapshot over any concurrent commit and silently
    reverted it (confirmed against the real retry path in github.ts).
  */
  const editSeq = useRef(0);
  const pristine = useRef<Record<string, string>>({});

  const [tab, setTab] = useState<Tab>("dashboard");
  const [focusField, setFocusField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publish, setPublish] = useState<PublishStatus | null>(null);
  const pollRef = useRef<number | null>(null);

  /*
    THE PANEL USED TO CHANGE IN COMPLETE SILENCE.

    Switching section, saving, the build going green, a save failing — all of it
    was communicated by colour and position alone. A sighted owner sees the
    content swap; someone using a screen reader hears nothing at all and has no
    way to know whether pressing Save did anything.

    One polite live region fixes the whole class, which is why it is the first
    thing a serious admin template implements. Polite, not assertive: these are
    progress reports, and interrupting whatever the owner is reading to announce
    "Saving…" would be worse than the silence it replaces. The one genuinely
    urgent case — a save that failed — is a role="alert" next to the button,
    where the person who pressed it is already looking.
  */
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback((message: string) => {
    // Re-announce identical text (e.g. two saves in a row) by clearing first;
    // a live region ignores an unchanged value.
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 60);
  }, []);

  /** Test hook: ?branch=x redirects saves away from main. Visibly bannered. */
  const branchOverride = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("branch") ?? undefined;
  }, []);

  /* ------------------------------ auth ------------------------------ */

  /*
    Sign-in with email and password. On success it reads the GitHub token out
    of Supabase and hands it to the SAME validateToken path the pasted-token
    flow uses — so a stored token that has expired or lost its permissions
    fails with the identical, already-written explanation instead of a new one.
  */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setChecking(true);
      setAuthError(null);
      try {
        const session = await signInWithPassword(email, password);
        const ghToken = await fetchGithubToken();
        const who = await validateToken(ghToken.trim());
        if (!who.canWrite) {
          setAuthError(
            `Signed in as ${session.email}, but the stored GitHub key cannot save changes — it needs "Contents: read and write" on the pw repository. Update it in Supabase (keeper_secrets).`,
          );
          await supabaseSignOut();
          return;
        }
        // NOT localStorage. The session cookie is Supabase's business; the
        // repository credential stays in memory and dies with the tab.
        setToken(ghToken.trim());
        setSignee(who);
        setAccount(session.email);
      } catch (error) {
        setAuthError(
          error instanceof KeeperApiError
            ? error.friendly
            : error instanceof Error
              ? error.message
              : "Could not sign in. Check the connection and try again.",
        );
      } finally {
        setChecking(false);
      }
    },
    [],
  );

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
    // The panel does not unmount on sign-out — state just flips — so the
    // publish poll must be stopped here or it keeps calling api.github.com
    // every 15 seconds with a token the owner believes is out of use.
    if (pollRef.current) window.clearInterval(pollRef.current);
    setPublish(null);
    localStorage.removeItem(TOKEN_KEY);
    // Ends the Supabase session too when there is one. It resolves either way
    // and never throws, so the local teardown below always runs.
    void supabaseSignOut();
    setToken(null);
    setSignee(null);
    setAccount(null);
    setDocs(null);
  }, []);

  /*
    RESUME. A live Supabase session is preferred over a stored token: if both
    exist, the account is the newer and more revocable credential, and letting
    a stale localStorage token win would quietly defeat the point of moving the
    credential into the database.
  */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (supabaseConfigured) {
        const session = await currentSession();
        if (cancelled) return;
        if (session) {
          setChecking(true);
          try {
            const ghToken = await fetchGithubToken();
            const who = await validateToken(ghToken.trim());
            if (!cancelled && who.canWrite) {
              setToken(ghToken.trim());
              setSignee(who);
              setAccount(session.email);
            }
          } catch {
            // A resumed session whose token has been rotated or revoked just
            // lands on the sign-in screen. Announcing it on a page the owner
            // has not interacted with yet would be noise.
          } finally {
            if (!cancelled) setChecking(false);
          }
          return;
        }
      }

      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored && !cancelled) void signIn(stored);
    })();

    return () => {
      cancelled = true;
    };
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
        // The comparison baseline for only-sending-what-changed, below.
        pristine.current = Object.fromEntries(
          Object.entries(loaded.files).map(([k, v]) => [k, JSON.stringify(v)]),
        );
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

  const [businessPath, servicesPath, testimonialsPath, faqPath, copyPath, seoPath] =
    CONTENT_PATHS;
  const business = (docs?.[businessPath] ?? null) as Doc | null;
  const services = (docs?.[servicesPath] ?? null) as Doc | null;
  const testimonials = (docs?.[testimonialsPath] ?? null) as Doc | null;
  const faq = (docs?.[faqPath] ?? null) as Doc | null;
  const siteCopy = (docs?.[copyPath] ?? null) as Doc | null;
  const seo = (docs?.[seoPath] ?? null) as Doc | null;

  const update = useCallback(
    (path: string, next: Doc) => {
      setDocs((prev) => (prev ? { ...prev, [path]: next } : prev));
      editSeq.current += 1;
      setDirty(true);
      setPublish(null);
    },
    [],
  );

  /* --------------------------- validation --------------------------- */

  const issues: FieldIssue[] = useMemo(() => {
    if (!business || !services || !testimonials || !faq || !siteCopy || !seo) return [];
    return [
      ...validateBusiness(business),
      ...validateServices(services),
      ...validateTestimonials(testimonials),
      ...validateFaq(faq),
      ...validateCopy(siteCopy),
      ...validateSeo(seo),
    ];
  }, [business, services, testimonials, faq, siteCopy, seo]);

  /* ------------------------------ save ------------------------------ */

  /*
    One publish-watcher for EVERY commit this panel makes. Article saves and
    media uploads used to set { state: "publishing" } and then never poll, so
    the bar said "Publishing…" forever until a page reload — the state machine
    had states nothing could leave.
  */
  const watchPublish = useCallback(
    (commitSha: string) => {
      if (!token) return;
      setPublish({ state: "publishing" });
      if (pollRef.current) window.clearInterval(pollRef.current);
      // 15s cadence; a build takes minutes.
      pollRef.current = window.setInterval(async () => {
        try {
          const status = await publishStatus(token, commitSha);
          if (status.state === "published" || status.state === "failed") {
            setPublish(status);
            announce(
              status.state === "published"
                ? "Published. Your changes are live."
                : "The build failed, so the site was not updated.",
            );
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        } catch {
          /* transient poll failure — keep trying */
        }
      }, 15000);
    },
    [token, announce],
  );

  const doSave = useCallback(async () => {
    if (!token || !docs || !baseSha || issues.length > 0) return;
    setSaving(true);
    setSaveError(null);
    announce("Saving your changes.");
    try {
      const binaries: Record<string, Uint8Array> = {};
      const imagesInFlight = pendingImages;
      for (const img of Object.values(imagesInFlight)) {
        binaries[img.repoPath] = img.bytes;
      }

      /*
        ONLY THE FILES THAT CHANGED. Sending all six re-based this panel's
        stale snapshot of untouched files onto whatever HEAD had become — so a
        colleague's concurrent commit to, say, services.json was silently
        reverted by an owner who only edited the FAQ. The audit confirmed the
        full chain through the 422 retry in github.ts. Diffing against the
        pristine serialisation confines every save to what the owner actually
        did.
      */
      const changed: Record<string, Doc> = {};
      const changedSerialised: Record<string, string> = {};
      for (const [path, value] of Object.entries(docs)) {
        const now = JSON.stringify(value);
        if (pristine.current[path] !== now) {
          changed[path] = value;
          changedSerialised[path] = now;
        }
      }

      if (Object.keys(changed).length === 0 && Object.keys(binaries).length === 0) {
        setDirty(false);
        announce("Nothing has changed since the last save.");
        return;
      }

      const seqAtSave = editSeq.current;
      const result = await save(token, {
        json: changed,
        binaries,
        message: `Keeper: content update by ${signee?.login ?? "owner"}`,
        baseSha,
        branch: branchOverride,
      });

      // What we sent is the new baseline for those paths.
      Object.assign(pristine.current, changedSerialised);
      setBaseSha(result.commitSha);

      /*
        Edits made WHILE the request was in flight stay dirty. The old
        unconditional setDirty(false) marked them as saved; they were not, and
        left with the next navigation. Same for images: clear only the ones
        this save actually carried, not whatever was staged since.
      */
      setPendingImages((prev) => {
        const next = { ...prev };
        for (const [key, img] of Object.entries(imagesInFlight)) {
          if (next[key] === img) delete next[key];
        }
        return next;
      });
      if (editSeq.current === seqAtSave) {
        setDirty(false);
      }
      announce("Saved. The site is rebuilding — this usually takes a few minutes.");
      watchPublish(result.commitSha);
    } catch (error) {
      const friendly =
        error instanceof KeeperApiError ? error.friendly : String(error);
      setSaveError(friendly);
      announce(`Save failed. ${friendly}`);
    } finally {
      setSaving(false);
    }
  }, [token, docs, baseSha, issues, pendingImages, signee, branchOverride, announce, watchPublish]);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  /*
    ATTACH EACH VALIDATION MESSAGE TO ITS CONTROL.

    The messages have always been rendered right under the field they concern,
    which is enough if you can see them. A screen reader moving through the
    form reads the label and the box and then moves on: the sentence explaining
    why the box is refused sits in a separate paragraph with nothing linking
    the two. `aria-invalid` says the field is wrong; `aria-describedby` says
    what is wrong with it.

    Wired here rather than at thirty call sites so there is one implementation
    to be right, and it re-runs whenever the issue list changes.

    THE APPEND MATTERS. Several fields already carry a hint through
    `aria-describedby` — the character counters, the note about the business
    name being added automatically. Overwriting the attribute would silently
    delete that guidance the moment a field became invalid, which is exactly
    when someone needs the most help. Existing ids are preserved and the error
    ids are added to them; the originals are remembered so removing the error
    restores precisely what was there before, rather than blanking it.
  */
  const baseDescribedBy = useRef(new Map<string, string>());
  useEffect(() => {
    const root = document.getElementById("keeper-panel");
    if (!root) return;

    const errorsByControl = new Map<string, string[]>();
    root.querySelectorAll<HTMLElement>("[data-error-for]").forEach((node, i) => {
      const control = node.dataset.errorFor;
      if (!control) return;
      if (!node.id) node.id = `${control}-error-${i}`;
      errorsByControl.set(control, [...(errorsByControl.get(control) ?? []), node.id]);
    });

    const touched: HTMLElement[] = [];
    for (const [controlId, errorIds] of errorsByControl) {
      const field = document.getElementById(controlId);
      if (!field) {
        // A message pointing at a control that does not exist helps nobody and
        // would be invisible in review — say so where a developer will see it.
        console.warn(`[keeper] validation message references missing control "${controlId}"`);
        continue;
      }
      if (!baseDescribedBy.current.has(controlId)) {
        baseDescribedBy.current.set(controlId, field.getAttribute("aria-describedby") ?? "");
      }
      const base = baseDescribedBy.current.get(controlId) ?? "";
      field.setAttribute("aria-describedby", [base, ...errorIds].filter(Boolean).join(" "));
      field.setAttribute("aria-invalid", "true");
      touched.push(field);
    }

    // Fields that were invalid and no longer are must be restored, not left
    // permanently flagged.
    for (const [controlId, base] of baseDescribedBy.current) {
      if (errorsByControl.has(controlId)) continue;
      const field = document.getElementById(controlId);
      if (!field) continue;
      field.removeAttribute("aria-invalid");
      if (base) field.setAttribute("aria-describedby", base);
      else field.removeAttribute("aria-describedby");
    }

    return () => {
      for (const field of touched) field.removeAttribute("aria-invalid");
    };
  }, [issues, tab, docs]);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */

  if (!signee) {
    return (
      <SignIn
        onEmailSubmit={signInWithEmail}
        account={account}
        onSubmit={signIn}
        error={authError}
        checking={checking}
      />
    );
  }

  if (!business || !services || !testimonials || !faq || !siteCopy || !seo) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className={`${MONO_LABEL} text-ash`}>Opening the ledger…</p>
      </main>
    );
  }

  /*
    THE SHELL — a dashboard, not a form with tabs.

    The owner's reference for "professional" was a classic admin layout:
    permanent sidebar, an overview page of cards, sections as destinations.
    That shape carries meaning beyond looks — the dashboard view gives the
    site a face the owner can read at a glance (what is confirmed, what is
    missing, whether the last publish landed) before deciding what to edit.

    Every number on it is REAL: derived from the content itself or from the
    repository's CI history. This site's entire discipline is that nothing
    unverified renders as fact, and its own admin panel does not get an
    exemption — there are no invented visitor counts here, and there will be
    no analytics cards until an analytics service actually exists to back
    them.
  */
  const unconfirmedCount = (Object.keys(BUSINESS_RULES) as (keyof typeof BUSINESS_RULES)[])
    .filter((k) => !isFact(business, k)).length;

  const NAV: { key: Tab; label: string; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "business", label: "Business Details", badge: unconfirmedCount },
    { key: "services", label: "What We Buy" },
    { key: "testimonials", label: "Testimonials" },
    { key: "faq", label: "FAQ" },
    { key: "copy", label: "Site Copy" },
    { key: "insights", label: "Insights" },
    { key: "media", label: "Media" },
    { key: "seo", label: "Search (SEO)" },
  ];

  const goTo = (nextTab: Tab, field?: string) => {
    setTab(nextTab);
    if (field) setFocusField(field);
    const label = NAV.find((n) => n.key === nextTab)?.label ?? nextTab;
    announce(`${label} section.`);
  };

  /*
    ARROW KEYS ACROSS THE SECTION STRIP.

    Nine sections meant nine tab stops before reaching the editor, every time.
    The tab pattern replaces that with one stop plus arrow keys, which is both
    the documented behaviour for a tab strip and markedly faster to drive.

    Two deliberate restraints, both learned from templates that got them wrong:

      - The keys are handled ONLY on the tabs themselves. A panel-wide arrow
        handler is how people end up unable to move the caret inside a text
        field, which is a far worse bug than the one it set out to fix.
      - Focus is NOT wrapped at the ends of the document anywhere in this panel.
        Trapping Tab at the page boundary reads as thorough and is actually a
        keyboard trap; the browser's own chrome must stay reachable.
  */
  const onTabKeys = (event: React.KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1, ArrowDown: index + 1,
      ArrowLeft: index - 1, ArrowUp: index - 1,
      Home: 0, End: NAV.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const wrapped = (next + NAV.length) % NAV.length;
    goTo(NAV[wrapped].key);
    // Focus follows selection, which is the expected behaviour when panels
    // switch immediately rather than on activation.
    const strip = (event.currentTarget as HTMLElement).parentElement;
    (strip?.children[wrapped] as HTMLElement | undefined)?.focus();
  };

  return (
    <main className="min-h-svh lg:flex">
      {/*
        The panel's name, once, as the document's only level-one heading.
        The axe gate flagged its absence: the wordmark in the corner is a
        picture of a name, and the editors below start at level two, so the
        document had a heading outline with no root. Visually hidden because
        the brand block already says it far better than a line of text would.
      */}
      <h1 className="sr-only">Pureweight Keeper — content admin</h1>

      {/*
        Skip link. Nine section tabs sit before the editor in source order, so
        without this a keyboard visitor crosses the whole strip on every page
        view. Hidden until focused, which is the point: it costs sighted users
        nothing and saves everyone else nine keystrokes.
      */}
      <a
        href="#keeper-panel"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-gold-rich focus:bg-void focus:px-4 focus:py-2 focus:text-gold-high"
      >
        Skip to the editor
      </a>

      {/*
        The panel's voice. Polite, atomic, and always present in the DOM —
        a live region inserted at the moment it has something to say is
        frequently missed by screen readers, because they watch regions that
        already exist.
      */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {/* ---------------------------- sidebar ------------------------- */}
      {/* w-72, not w-64: at 64 the icon and the "21 still to confirm" badge
          together pushed "Business Details" into an ellipsis, and a nav item
          you cannot read is worse than one without an icon. */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-gold-antique/20 lg:flex">
        <div className="border-b border-gold-antique/15 px-6 py-7">
          <p className="font-display text-2xl leading-none text-ivory">
            Pureweight
          </p>
          <p className={`${MONO_LABEL} mt-2 text-gold-antique`}>The Keeper</p>
        </div>
        <div className="flex-1 px-3 py-6" role="tablist" aria-orientation="vertical" aria-label="Sections">
          {NAV.map((item, i) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`keeper-tab-${item.key}`}
              aria-selected={tab === item.key}
              aria-controls="keeper-panel"
              /* Roving tabindex: the strip is one stop, arrows move within it. */
              tabIndex={tab === item.key ? 0 : -1}
              onKeyDown={(e) => onTabKeys(e, i)}
              onClick={() => goTo(item.key)}
              className={`${MONO_LABEL} mb-1 flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                tab === item.key
                  ? "border-l-2 border-gold-rich bg-gold-antique/10 text-gold-high"
                  : "border-l-2 border-transparent text-ash hover:bg-gold-antique/5 hover:text-ivory"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <NavIcon tab={item.key} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <>
                  {/*
                    The count reads as part of the tab's name, so it has to say
                    what it counts. Driving the strip with a screen reader
                    announced "Business Details 22", which is a number with no
                    noun attached. The pill stays exactly as drawn and the
                    meaning is supplied for anyone listening.
                  */}
                  <span
                    aria-hidden="true"
                    className="ml-3 rounded-full border border-gold-antique/40 px-2 py-0.5 text-[0.58rem] text-gold-antique"
                  >
                    {item.badge}
                  </span>
                  <span className="sr-only">, {item.badge} still to confirm</span>
                </>
              ) : null}
            </button>
          ))}
        </div>
        {/*
          Who you are and what you are editing, at the foot of the strip. The
          identity moved UP into the top bar as well, where a panel of this
          shape expects it; what stays here is the thing the top bar has no
          room to say — which repository these commits land in.
        */}
        <div className="border-t border-gold-antique/15 px-6 py-5">
          <p className={`${MONO_LABEL} text-ash/50`}>Editing</p>
          <p className="mt-2 break-all font-mono text-[0.68rem] leading-relaxed text-ash/80">
            {REPO}
          </p>
          <p className="mt-1 font-mono text-[0.68rem] text-ash/60">
            branch {branchOverride ?? "main"}
          </p>
        </div>
      </aside>

      {/* -------------------------- main column ----------------------- */}
      <div className="min-w-0 flex-1 pb-40">
        {branchOverride ? (
          <div className="border-b border-[#d8825a]/40 bg-[#d8825a]/10 px-6 py-2 text-center">
            <span className={`${MONO_LABEL} text-[#d8825a]`}>
              Test mode — saving to branch “{branchOverride}”, not the live site
            </span>
          </div>
        ) : null}

        {/*
          DESKTOP TOP BAR.

          The panel had no header on desktop at all: the section you were in was
          only stated by the page's own heading, and the two things you reach for
          when you have finished — the live site, and signing out — were pinned to
          the bottom edge of a full-height sidebar, below nine nav items and a
          screen's worth of empty space. On a tall display they sat hundreds of
          pixels away from anything else and were routinely missed.

          It is a bar, not a banner: no second <h1> (the gate allows exactly one,
          and the sr-only heading above is it), and no live region (the gate
          allows exactly one of those too, and the panel already has its voice).
          It states where you are and offers the two exits.
        */}
        <header className="hidden items-center justify-between gap-6 border-b border-gold-antique/20 px-8 py-4 lg:flex">
          <p className={`${MONO_LABEL} truncate text-gold-high`}>
            {NAV.find((n) => n.key === tab)?.label ?? tab}
          </p>
          <div className="flex shrink-0 items-center gap-6">
            <a
              href={assetPath("/")}
              target="_blank"
              rel="noopener"
              className={`${MONO_LABEL} text-ash transition-colors hover:text-gold-high`}
            >
              View site ↗
            </a>
            <span aria-hidden="true" className="h-4 w-px bg-gold-antique/25" />
            <p className="max-w-[14rem] truncate font-mono text-[0.68rem] text-ash/70">
              {signee.login}
            </p>
            <button
              type="button"
              onClick={signOut}
              className={`${MONO_LABEL} text-gold-antique transition-colors hover:text-gold-high`}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Mobile header + nav (the sidebar is desktop-only). */}
        <header className="border-b border-gold-antique/20 lg:hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-display text-lg leading-none text-ivory">
                Pureweight
              </p>
              <p className={`${MONO_LABEL} mt-1 text-gold-antique`}>The Keeper</p>
            </div>
            {/* Narrow screens never see the sidebar, so this is the only place
                the live site is reachable from. It was missing entirely. */}
            <div className="flex items-center gap-4">
              <a
                href={assetPath("/")}
                target="_blank"
                rel="noopener"
                className={`${MONO_LABEL} text-ash`}
              >
                View site ↗
              </a>
              <button
                type="button"
                onClick={signOut}
                className={`${MONO_LABEL} text-gold-antique`}
              >
                Sign out
              </button>
            </div>
          </div>
          {/*
            The same nine sections as the sidebar, for narrow screens. Both
            strips drive one panel, so the panel is labelled by its own name
            rather than by a tab — with two possible controlling tabs there is
            no single correct aria-labelledby target, and naming the panel
            directly is both valid and unambiguous.
          */}
          <div className="flex gap-6 overflow-x-auto px-5" role="tablist" aria-label="Sections">
            {NAV.map((item, i) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`keeper-tab-m-${item.key}`}
                aria-selected={tab === item.key}
                aria-controls="keeper-panel"
                tabIndex={tab === item.key ? 0 : -1}
                onKeyDown={(e) => onTabKeys(e, i)}
                onClick={() => goTo(item.key)}
                className={`${MONO_LABEL} whitespace-nowrap border-b-2 pb-3 transition-colors ${
                  tab === item.key
                    ? "border-gold-rich text-gold-high"
                    : "border-transparent text-ash"
                }`}
              >
                {item.label}
                {item.badge ? (
                  <>
                    <span aria-hidden="true"> ({item.badge})</span>
                    <span className="sr-only">, {item.badge} still to confirm</span>
                  </>
                ) : null}
              </button>
            ))}
          </div>
        </header>

        <div
          id="keeper-panel"
          role="tabpanel"
          aria-label={`${NAV.find((n) => n.key === tab)?.label ?? tab} section`}
          tabIndex={-1}
          className="mx-auto max-w-5xl px-6 pt-10"
        >
          {tab === "dashboard" ? (
            <DashboardView
              token={token!}
              business={business}
              services={services}
              testimonials={testimonials}
              issues={issues}
              dirty={dirty}
              goTo={goTo}
            />
          ) : null}
          {tab === "business" ? (
            <BusinessEditor
              doc={business}
              issues={issues}
              focusField={focusField}
              onFocused={() => setFocusField(null)}
              onChange={(next) => update(businessPath, next)}
            />
          ) : null}
          {tab === "services" ? (
            <ServicesEditor
              doc={services}
              issues={issues}
              onChange={(next) => update(servicesPath, next)}
              onImage={(img) =>
                { editSeq.current += 1; setPendingImages((prev) => ({ ...prev, [img.repoPath]: img })); }
              }
            />
          ) : null}
          {tab === "testimonials" ? (
            <TestimonialsEditor
              doc={testimonials}
              issues={issues}
              onChange={(next) => update(testimonialsPath, next)}
              onImage={(img) =>
                { editSeq.current += 1; setPendingImages((prev) => ({ ...prev, [img.repoPath]: img })); }
              }
            />
          ) : null}
          {tab === "faq" ? (
            <FaqEditor
              doc={faq}
              issues={issues}
              onChange={(next) => update(faqPath, next)}
            />
          ) : null}
          {tab === "copy" ? (
            <CopyEditor
              doc={siteCopy}
              issues={issues}
              onChange={(next) => update(copyPath, next)}
            />
          ) : null}
          {tab === "insights" ? (
            <InsightsEditor
              token={token!}
              signee={signee}
              branchOverride={branchOverride}
              onPublishStateChange={watchPublish}
            />
          ) : null}
          {tab === "seo" ? (
            <SeoEditor
              doc={seo}
              issues={issues}
              onChange={(next) => update(seoPath, next)}
            />
          ) : null}
          {tab === "media" ? (
            <MediaLibrary
              token={token!}
              docs={docs!}
              signee={signee}
              branchOverride={branchOverride}
              onPublishStateChange={watchPublish}
            />
          ) : null}
        </div>
      </div>

      {/* ---------------------------- save bar ------------------------ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-antique/25 bg-void/95 backdrop-blur lg:left-72">
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
/* DASHBOARD                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The overview the owner lands on. Four cards, a publish history, an edit
 * history, and the to-confirm list — every figure computed from the content
 * itself or read from the repository's CI. Nothing is estimated and nothing
 * is invented; the deliberate absence is visitor analytics, which would
 * require an analytics service this site does not have. A dashboard that
 * shows a made-up conversion rate would be this project's cardinal sin with
 * a chart on it.
 */
function DashboardView({
  token,
  business,
  services,
  testimonials,
  issues,
  dirty,
  goTo,
}: {
  token: string;
  business: Doc;
  services: Doc;
  testimonials: Doc;
  issues: FieldIssue[];
  dirty: boolean;
  goTo: (tab: Tab, field?: string) => void;
}) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [edits, setEdits] = useState<EditSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, e] = await Promise.all([
          listRuns(token, 8),
          listContentEdits(token, 6),
        ]);
        if (!cancelled) {
          setRuns(r);
          setEdits(e);
        }
      } catch {
        if (!cancelled) {
          setRuns([]);
          setEdits([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const ruleKeys = Object.keys(BUSINESS_RULES) as (keyof typeof BUSINESS_RULES)[];
  const confirmed = ruleKeys.filter((k) => isFact(business, k));
  const missing = ruleKeys.filter((k) => !isFact(business, k));
  const pct = Math.round((confirmed.length / ruleKeys.length) * 100);

  const panelsWithPhotos = SERVICE_IDS.filter(
    (id) => s(((services[id] ?? {}) as Doc).image) !== "",
  ).length;
  const testimonialCount = (
    Array.isArray(testimonials.testimonials) ? testimonials.testimonials : []
  ).length;

  const ring = 2 * Math.PI * 34;

  return (
    <div className="space-y-12">
      <SectionHeading
        title="Dashboard"
        note="A reading of the site as it stands. Every number here is real — computed from the content or from the build history. There are no visitor statistics because no analytics service is connected; this panel does not invent figures."
      />

      {/* ------------------------------ cards ------------------------- */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* completeness */}
        <div className="border border-gold-antique/20 bg-char/60 p-6">
          <p className={`${MONO_LABEL} text-ash`}>Facts confirmed</p>
          <div className="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#b87914" strokeOpacity="0.18" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none" stroke="#d99a33" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * ring} ${ring}`}
              />
            </svg>
            <div>
              <p className="font-display text-3xl text-ivory">
                {confirmed.length}
                <span className="text-lg text-ash">/{ruleKeys.length}</span>
              </p>
              <p className="mt-1 text-xs text-ash">{pct}% of the ledger</p>
            </div>
          </div>
        </div>

        {/* publish readiness */}
        <div className="border border-gold-antique/20 bg-char/60 p-6">
          <p className={`${MONO_LABEL} text-ash`}>Ready to publish</p>
          {issues.length === 0 ? (
            <>
              <p className="mt-4 font-display text-3xl text-gold-high">Yes</p>
              <p className="mt-1 text-xs text-ash">
                {dirty ? "Unsaved changes waiting" : "Everything checks out"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 font-display text-3xl text-[#d8825a]">
                {issues.length} issue{issues.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs text-ash">
                Marked in red next to the fields
              </p>
            </>
          )}
        </div>

        {/* testimonials */}
        <button
          type="button"
          onClick={() => goTo("testimonials")}
          className="border border-gold-antique/20 bg-char/60 p-6 text-left transition-colors hover:border-gold-rich/50"
        >
          <p className={`${MONO_LABEL} text-ash`}>Testimonials</p>
          <p className="mt-4 font-display text-3xl text-ivory">{testimonialCount}</p>
          <p className="mt-1 text-xs text-ash">
            {testimonialCount === 0
              ? "The site shows its honest empty state"
              : "Live on the site"}
          </p>
        </button>

        {/* photos */}
        <button
          type="button"
          onClick={() => goTo("services")}
          className="border border-gold-antique/20 bg-char/60 p-6 text-left transition-colors hover:border-gold-rich/50"
        >
          <p className={`${MONO_LABEL} text-ash`}>Panel photos</p>
          <p className="mt-4 font-display text-3xl text-ivory">
            {panelsWithPhotos}
            <span className="text-lg text-ash">/{SERVICE_IDS.length}</span>
          </p>
          <p className="mt-1 text-xs text-ash">
            {panelsWithPhotos === SERVICE_IDS.length
              ? "Every panel carries a photo"
              : "Panels without one show the engraved plate"}
          </p>
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* --------------------------- publish history ---------------- */}
        <div className="border border-gold-antique/20 bg-char/60 p-6">
          <p className={`${MONO_LABEL} text-ash`}>Publish history</p>
          <div className="mt-5 space-y-3">
            {runs === null ? (
              <p className="text-xs text-ash/60">Reading the build history…</p>
            ) : runs.length === 0 ? (
              <p className="text-xs text-ash/60">No builds found.</p>
            ) : (
              runs.map((run, i) => (
                <a
                  key={i}
                  href={run.htmlUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-3 text-xs transition-colors hover:text-gold-high"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      run.status !== "completed"
                        ? "animate-pulse bg-ash"
                        : run.conclusion === "success"
                          ? "bg-gold-rich"
                          : "bg-[#d8825a]"
                    }`}
                  />
                  <span className="text-ivory/80">
                    {run.status !== "completed"
                      ? "Building now"
                      : run.conclusion === "success"
                        ? "Published"
                        : "Refused"}
                  </span>
                  <span className="ml-auto text-ash/70">
                    {run.durationSec ? `${Math.round(run.durationSec / 60)}m · ` : ""}
                    {timeAgo(run.createdAt)}
                  </span>
                </a>
              ))
            )}
          </div>
        </div>

        {/* ----------------------------- recent edits ----------------- */}
        <div className="border border-gold-antique/20 bg-char/60 p-6">
          <p className={`${MONO_LABEL} text-ash`}>Recent content edits</p>
          <div className="mt-5 space-y-3">
            {edits === null ? (
              <p className="text-xs text-ash/60">Reading the ledger…</p>
            ) : edits.length === 0 ? (
              <p className="text-xs text-ash/60">
                No content edits yet — saves from this panel will appear here.
              </p>
            ) : (
              edits.map((edit, i) => (
                <a
                  key={i}
                  href={edit.htmlUrl}
                  target="_blank"
                  rel="noopener"
                  className="block text-xs transition-colors hover:text-gold-high"
                >
                  <span className="text-ivory/80">{edit.message}</span>
                  <span className="mt-0.5 block text-ash/70">
                    {edit.author} · {timeAgo(edit.date)}
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --------------------------- still to confirm ----------------- */}
      {missing.length > 0 ? (
        <div className="border border-gold-antique/20 bg-char/60 p-6">
          <p className={`${MONO_LABEL} text-ash`}>Still to confirm</p>
          <p className="mt-2 text-xs leading-relaxed text-ash/80">
            Each of these currently shows as a visible placeholder on the site.
            Click one to go straight to the field.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {missing.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => goTo("business", key)}
                className={`${MONO_LABEL} border border-gold-antique/30 px-4 py-2 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
              >
                {BUSINESS_RULES[key].label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SIGN-IN                                                                    */
/* -------------------------------------------------------------------------- */

function SignIn({
  onSubmit,
  onEmailSubmit,
  error,
  checking,
}: {
  onSubmit: (token: string) => void;
  onEmailSubmit: (email: string, password: string) => void;
  account: string | null;
  error: string | null;
  checking: boolean;
}) {
  const [value, setValue] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /*
    Which door is showing. Defaults to the account form wherever this build has
    Supabase credentials, and to the token form where it does not — so a
    deployment without the environment variables behaves exactly as it always
    did rather than presenting a login that cannot possibly work.

    The token door stays reachable either way. It is not a weaker credential:
    holding a fine-grained PAT with write access to the repository IS
    authorisation. It exists so that a Supabase outage, a rotated password or a
    mistyped environment variable can never lock a live business out of its own
    website.
  */
  const [useToken, setUseToken] = useState(!supabaseConfigured);

  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="border border-gold-antique/25 bg-char/80 p-10">
          {/*
            The wordmark is the heading, so it should be marked as one. It was
            two paragraphs styled to look important, which left the sign-in
            screen with no heading at all — the axe gate's first finding here.
            Splitting it across an h1 and a span keeps the two-line lockup
            exactly as drawn while giving the document a root.
          */}
          <h1 className="font-display text-3xl leading-none text-ivory">
            Pureweight
            <span className={`${MONO_LABEL} mt-2 block text-gold-antique`}>
              The Keeper
            </span>
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-ash">
            Your website&apos;s ledger. Sign in to edit business details, the
            buying panels and testimonials.
          </p>

          {!useToken ? (
            <form
              className="mt-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim() && password) onEmailSubmit(email, password);
              }}
            >
              <label htmlFor="keeper-email" className={`${MONO_LABEL} text-ash`}>
                Email
              </label>
              <input
                id="keeper-email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT_CLASS} mt-2`}
                placeholder="you@example.com"
              />

              <label
                htmlFor="keeper-password"
                className={`${MONO_LABEL} mt-6 block text-ash`}
              >
                Password
              </label>
              <input
                id="keeper-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASS} mt-2`}
              />

              {error ? <IssueLine text={error} /> : null}

              <button
                type="submit"
                disabled={checking || !email.trim() || !password}
                className="mt-6 w-full border border-gold-rich/60 bg-gold-antique/10 py-3.5 font-mono text-[0.68rem] font-medium tracking-[0.28em] text-gold-high uppercase transition-all duration-300 enabled:hover:border-gold-high enabled:hover:bg-gold-antique/20 disabled:opacity-35"
              >
                {checking ? "Signing in…" : "Open the Keeper"}
              </button>

              {supabaseConfigured ? (
                <button
                  type="button"
                  onClick={() => setUseToken(true)}
                  className={`${MONO_LABEL} mt-6 w-full text-ash transition-colors hover:text-gold-antique`}
                >
                  Use an access key instead
                </button>
              ) : null}
            </form>
          ) : (
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

            {supabaseConfigured ? (
              <button
                type="button"
                onClick={() => setUseToken(false)}
                className={`${MONO_LABEL} mt-6 w-full text-ash transition-colors hover:text-gold-antique`}
              >
                Back to email sign-in
              </button>
            ) : null}
          </form>
          )}

          {/* Only relevant to the token door — an owner signing in with an
              email has no token to mint. */}
          <details
            className="mt-8 border-t border-gold-antique/15 pt-5"
            hidden={!useToken}
          >
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
        {/*
          The privacy line is per-door: the token door's promise ("sent only to
          GitHub") is untrue of the email door, whose credentials go to
          Supabase — and a privacy note that is even slightly wrong is worse
          than none, on the one screen whose subject is being careful.
        */}
        <p className="mt-4 text-center text-[0.65rem] leading-relaxed text-ash/50">
          {useToken
            ? "The key stays in this browser and is sent only to GitHub. Nothing on this page is stored anywhere else."
            : "Your sign-in goes to this site's own Supabase project, and the publishing key it unlocks stays in memory until you close the tab."}
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
  focusField,
  onFocused,
  onChange,
}: {
  doc: Doc;
  issues: FieldIssue[];
  focusField: string | null;
  onFocused: () => void;
  onChange: (next: Doc) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...doc, [key]: value });
  const issueFor = (key: string) => issues.filter((i) => i.field === key);

  /*
    Jump-to-field: the dashboard's "still to confirm" list lands the owner on
    the exact input, focused and centred — "go fill in the phone number" is a
    click, not a hunt through five fieldsets.
  */
  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(`biz-${focusField}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      (el as HTMLElement).focus({ preventScroll: true });
    }
    onFocused();
  }, [focusField, onFocused]);

  const social = (Array.isArray(doc.social) ? doc.social : []) as string[];
  const hours = (doc.hours ?? {}) as Record<string, unknown>;

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
                    <IssueLine key={i} control={`biz-${key}`} text={issue.message} />
                  ))}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* social list */}
      {/* ----------------------------- opening hours -------------------- */}
      <fieldset>
        <legend className="font-display text-lg text-gold-high">Opening hours</legend>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ash/80">
          Fill in all seven days and the site publishes a real opening-hours
          table that search engines can read and show beside your listing. Leave
          any day blank and it falls back to the written line above — which is
          the right answer if you trade by appointment. Times are 24-hour, e.g.
          09:00 and 17:30.
        </p>
        <div className="mt-6 space-y-2">
          {DAYS.map((day) => {
            const row = ((hours[day.key] ?? {}) as Record<string, unknown>);
            const closed = row.closed === true;
            const setRow = (patch: Record<string, unknown>) =>
              set("hours", { ...hours, [day.key]: { ...row, ...patch } });
            const bad = (v: unknown) =>
              s(v) !== "" && !new RegExp(TIME_PATTERN).test(s(v));
            return (
              <div key={day.key} className="flex flex-wrap items-center gap-4">
                <span className={`${MONO_LABEL} w-28 shrink-0 text-ash`}>{day.label}</span>
                <label className="flex items-center gap-2 text-xs text-ash">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={(e) => setRow({ closed: e.target.checked })}
                    className="h-4 w-4 accent-[#d99a33]"
                  />
                  Closed
                </label>
                {!closed ? (
                  <>
                    <input
                      type="text"
                      aria-label={`${day.label} opening time`}
                      value={s(row.open)}
                      onChange={(e) => setRow({ open: e.target.value })}
                      placeholder="09:00"
                      className={`${INPUT_CLASS} w-28 font-mono ${bad(row.open) ? "border-[#d8825a]" : ""}`}
                    />
                    <span className="text-ash">to</span>
                    <input
                      type="text"
                      aria-label={`${day.label} closing time`}
                      value={s(row.close)}
                      onChange={(e) => setRow({ close: e.target.value })}
                      placeholder="17:30"
                      className={`${INPUT_CLASS} w-28 font-mono ${bad(row.close) ? "border-[#d8825a]" : ""}`}
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
        {issueFor("hours").map((issue, i) => (
          <IssueLine key={i} text={issue.message} />
        ))}
      </fieldset>

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
  const [imgError, setImgError] = useState<string | null>(null);

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
                      setImgError(null);
                      try {
                        const prepared = await prepareImage(file);
                        onImage(prepared);
                        setSvc({ image: prepared.contentPath });
                      } catch {
                        // Without this, a photo the browser cannot decode was
                        // an unhandled rejection: busy spinner ends, nothing
                        // appears, no message, no error. Silence reads as "it
                        // worked" right up until the site shows no photo.
                        setImgError(id);
                      } finally {
                        setImgBusy(null);
                      }
                    }}
                  />
                </label>
                {imgError === id ? (
                  <IssueLine text="That image could not be read. Try a different photo (JPG or PNG)." />
                ) : null}
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
                    <IssueLine key={i} control={`${id}-summary`} text={issue.message} />
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
                    <IssueLine key={i} control={`${id}-body`} text={issue.message} />
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
                    <IssueLine key={i} control={`${id}-alt`} text={issue.message} />
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
  onImage,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
  onImage: (img: PreparedImage) => void;
}) {
  const [photoBusy, setPhotoBusy] = useState<number | null>(null);
  const [photoError, setPhotoError] = useState<number | null>(null);
  const list = (Array.isArray(doc.testimonials) ? doc.testimonials : []) as {
    quote?: string;
    name?: string;
    context?: string;
    photo?: string;
    featured?: boolean;
  }[];
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  const issueFor = (field: string) => issues.filter((i) => i.field === field);
  const setList = (next: typeof list) => onChange({ ...doc, testimonials: next });

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Testimonials"
        note="Real customer words only, with the customer's name and a line of context. The site refuses anonymous quotes, and refuses quotes containing promises the business has not verified — prices, timescales, guarantees — even when a customer genuinely said them."
      />

      {list.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          note="The site is currently showing its honest “no testimonials have been supplied” state, which is the correct thing for it to show. Add the first real one below — anonymous quotes and quotes containing unverified promises are refused."
        />
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
                <IssueLine key={j} control={`t${i}-quote`} text={issue.message} />
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
                  <IssueLine key={j} control={`t${i}-name`} text={issue.message} />
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
                  <IssueLine key={j} control={`t${i}-context`} text={issue.message} />
                ))}
              </div>
            </div>
            {/* --- photo + flags --------------------------------------- */}
            <div className="flex flex-wrap items-center gap-5">
              {t.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetPath(t.photo)}
                  alt=""
                  className="h-14 w-14 rounded-full border border-gold-antique/40 object-cover"
                />
              ) : null}
              <label
                className={`${MONO_LABEL} cursor-pointer border border-gold-antique/25 px-4 py-2.5 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
              >
                {photoBusy === i ? "Preparing…" : t.photo ? "Replace photo" : "Add photo (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setPhotoBusy(i);
                    setPhotoError(null);
                    try {
                      const prepared = await prepareImage(file);
                      onImage(prepared);
                      const next = [...list];
                      next[i] = { ...t, photo: prepared.contentPath };
                      setList(next);
                    } catch {
                      // Same silent-failure class as the service uploader.
                      setPhotoError(i);
                    } finally {
                      setPhotoBusy(null);
                    }
                  }}
                />
              </label>
              {photoError === i ? (
                <IssueLine text="That photo could not be read. Try a different file (JPG or PNG)." />
              ) : null}
              {t.photo ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...list];
                    next[i] = { ...t, photo: "" };
                    setList(next);
                  }}
                  className={`${MONO_LABEL} text-ash transition-colors hover:text-[#d8825a]`}
                >
                  Remove photo
                </button>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-ash">
                <input
                  type="checkbox"
                  checked={Boolean(t.featured)}
                  onChange={(e) => {
                    const next = [...list];
                    next[i] = { ...t, featured: e.target.checked };
                    setList(next);
                  }}
                  className="h-4 w-4 accent-[#d99a33]"
                />
                Featured — shown first
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-30`}
              >
                ↑ Move up
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-30`}
              >
                ↓ Move down
              </button>
              <button
                type="button"
                onClick={() => setList(list.filter((_, j) => j !== i))}
                className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors hover:border-[#d8825a] hover:text-[#d8825a]`}
              >
                Remove testimonial
              </button>
            </div>
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

/* -------------------------------------------------------------------------- */
/* FAQ EDITOR                                                                 */
/* -------------------------------------------------------------------------- */

function FaqEditor({
  doc,
  issues,
  onChange,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
}) {
  const list = (Array.isArray(doc.general) ? doc.general : []) as {
    question?: string;
    answer?: string;
  }[];
  const issueFor = (field: string) => issues.filter((i) => i.field === field);
  const setList = (next: typeof list) => onChange({ ...doc, general: next });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };

  return (
    <div className="space-y-10">
      <SectionHeading
        title="FAQ"
        note="The general questions on the FAQ page — trade knowledge, in your words. The order here is the order on the page. Business-specific answers (fees, payment, timing, ID) are deliberately not edited here: those are promises, and promises only appear by confirming the underlying fact in Business Details."
      />

      {issueFor("faq").map((issue, i) => (
        <IssueLine key={i} text={issue.message} />
      ))}

      {list.map((item, i) => (
        <fieldset key={i} className="border border-gold-antique/15 p-7">
          <legend className={`${MONO_LABEL} px-3 text-gold-antique`}>
            Question {i + 1}
          </legend>
          <div className="space-y-5">
            <div>
              <label htmlFor={`faq${i}-q`} className={`${MONO_LABEL} text-ash`}>
                Question
              </label>
              <input
                id={`faq${i}-q`}
                type="text"
                value={item.question ?? ""}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...item, question: e.target.value };
                  setList(next);
                }}
                className={`${INPUT_CLASS} mt-2`}
              />
              {issueFor(`faq${i}.question`).map((issue, j) => (
                <IssueLine key={j} control={`faq${i}-q`} text={issue.message} />
              ))}
            </div>
            <div>
              <label htmlFor={`faq${i}-a`} className={`${MONO_LABEL} text-ash`}>
                Answer
              </label>
              <textarea
                id={`faq${i}-a`}
                rows={4}
                value={item.answer ?? ""}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = { ...item, answer: e.target.value };
                  setList(next);
                }}
                className={`${INPUT_CLASS} mt-2 resize-y`}
              />
              {issueFor(`faq${i}.answer`).map((issue, j) => (
                <IssueLine key={j} control={`faq${i}-a`} text={issue.message} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-30`}
              >
                ↑ Move up
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-30`}
              >
                ↓ Move down
              </button>
              <button
                type="button"
                onClick={() => setList(list.filter((_, j) => j !== i))}
                className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors hover:border-[#d8825a] hover:text-[#d8825a]`}
              >
                Remove
              </button>
            </div>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setList([...list, { question: "", answer: "" }])}
        className={`${MONO_LABEL} border border-gold-antique/25 px-6 py-3.5 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
      >
        + Add question
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SITE COPY EDITOR                                                           */
/* -------------------------------------------------------------------------- */

function CopyEditor({
  doc,
  issues,
  onChange,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
}) {
  const issueFor = (field: string) => issues.filter((i) => i.field === field);

  const FIELD_LABELS: Record<string, string> = {
    eyebrow: "Small label above the heading",
    heading: "Heading",
    accent: "Heading — italic gold part",
    lead: "Paragraph under the heading",
  };

  return (
    <div className="space-y-12">
      <SectionHeading
        title="Site Copy"
        note="The hero and the big chapter headings, in your words. These are the most-seen lines on the site, so read each one aloud before saving. Emptying a field is refused — the site would quietly revert to its original line and your edit would vanish."
      />

      {(Object.entries(COPY_SECTIONS) as [string, { label: string; leadRequired: boolean }][]).map(
        ([key, meta]) => {
          const section = (doc[key] ?? {}) as Record<string, unknown>;
          const setField = (field: string, value: string) =>
            onChange({ ...doc, [key]: { ...section, [field]: value } });

          return (
            <fieldset key={key}>
              <legend className="font-display text-lg text-gold-high">
                {meta.label}
              </legend>
              <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {(["eyebrow", "heading", "accent", "lead"] as const).map((field) => {
                  const long = field === "lead";
                  if (field === "lead" && !meta.leadRequired && s(section.lead) === "") {
                    return null; // pillars has no lead — don't invite one
                  }
                  const value =
                    typeof section[field] === "string" ? (section[field] as string) : "";
                  const overSoftMax =
                    key === "hero" &&
                    field === "heading" &&
                    value.trim().length > HERO_HEADING_SOFT_MAX;
                  return (
                    <div key={field} className={long ? "sm:col-span-2" : undefined}>
                      <label
                        htmlFor={`copy-${key}-${field}`}
                        className={`${MONO_LABEL} text-ash`}
                      >
                        {FIELD_LABELS[field]}
                      </label>
                      {long ? (
                        <textarea
                          id={`copy-${key}-${field}`}
                          rows={3}
                          value={value}
                          onChange={(e) => setField(field, e.target.value)}
                          className={`${INPUT_CLASS} mt-2 resize-y`}
                        />
                      ) : (
                        <input
                          id={`copy-${key}-${field}`}
                          type="text"
                          value={value}
                          onChange={(e) => setField(field, e.target.value)}
                          className={`${INPUT_CLASS} mt-2`}
                        />
                      )}
                      {overSoftMax ? (
                        <p className="mt-2 text-xs leading-relaxed text-ash">
                          Longer than {HERO_HEADING_SOFT_MAX} characters — on a laptop this may
                          wrap to a second line. Not an error, just worth checking after
                          publishing.
                        </p>
                      ) : null}
                      {issueFor(`copy.${key}.${field}`).map((issue, j) => (
                        <IssueLine key={j} control={`copy-${key}-${field}`} text={issue.message} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        },
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INSIGHTS EDITOR                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Articles get their own save flow, deliberately separate from the main Save
 * bar: an article is one file with its own lifecycle (create, publish as
 * draft, delete), and folding it into the five-file batch would make "Save &
 * Publish" mean two different things depending on which tab was open.
 */
function InsightsEditor({
  token,
  signee,
  branchOverride,
  onPublishStateChange,
}: {
  token: string;
  signee: Signee | null;
  branchOverride?: string;
  /*
    Called with the COMMIT SHA so the parent can poll that build to a
    terminal state. The old contract took a PublishStatus, and the children
    passed { state: "publishing" } — a state nothing could ever leave,
    because nothing polled these commits. The save bar said "Publishing…
    this takes a few minutes" forever, until a full page reload.
  */
  onPublishStateChange: (commitSha: string) => void;
}) {
  const [files, setFiles] = useState<InsightFile[] | null>(null);
  const [editing, setEditing] = useState<{ doc: Doc; originalSlug: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFiles(await listInsightFiles(token));
    } catch (e) {
      setError(e instanceof KeeperApiError ? e.friendly : String(e));
      setFiles([]);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doc = editing?.doc ?? null;
  const takenSlugs = (files ?? [])
    .map((f) => f.slug)
    .filter((slug) => slug !== editing?.originalSlug);
  const articleIssues = doc ? validateInsight(doc, takenSlugs) : [];
  const issueFor = (field: string) => articleIssues.filter((i) => i.field === field);

  const slugify = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

  const startNew = () => {
    setEditing({
      doc: {
        slug: "",
        title: "",
        date: new Date().toISOString().slice(0, 10),
        author: "Pureweight",
        summary: "",
        tags: [],
        draft: true,
        body: "",
      },
      originalSlug: null,
    });
    setPreview(null);
  };

  const openExisting = async (file: InsightFile) => {
    setBusy(true);
    setError(null);
    try {
      const loaded = await loadInsight(token, file.path);
      setEditing({ doc: loaded, originalSlug: file.slug });
      setPreview(null);
    } catch (e) {
      setError(e instanceof KeeperApiError ? e.friendly : String(e));
    } finally {
      setBusy(false);
    }
  };

  const set = (patch: Doc) =>
    setEditing((prev) => (prev ? { ...prev, doc: { ...prev.doc, ...patch } } : prev));

  const saveArticle = async () => {
    if (!doc || articleIssues.length > 0) return;
    setBusy(true);
    setError(null);
    try {
      const head = await loadContent(token); // fresh base for the commit
      const slug = s(doc.slug);
      const path = `${INSIGHTS_DIR}/${slug}.json`;
      const deletes =
        editing?.originalSlug && editing.originalSlug !== slug
          ? [`${INSIGHTS_DIR}/${editing.originalSlug}.json`]
          : [];
      const committed = await save(token, {
        json: { [path]: doc },
        binaries: {},
        deletes,
        message: `Keeper: ${editing?.originalSlug ? "update" : "new"} article "${s(doc.title)}" by ${signee?.login ?? "owner"}`,
        baseSha: head.headSha,
        branch: branchOverride,
      });
      onPublishStateChange(committed.commitSha);
      setEditing(null);
      /*
        Optimistic, THEN refreshed. The Contents API can lag a freshly
        committed file by a second or two, and a refresh that races it shows
        the owner a list without the article they just saved — which reads as
        the save having failed. Insert locally first; the listing catches up.
      */
      setFiles((prev) => {
        const next = (prev ?? []).filter((f) => f.slug !== slug);
        return [...next, { path, slug }].sort((a, b) => a.slug.localeCompare(b.slug));
      });
      void refresh();
    } catch (e) {
      setError(e instanceof KeeperApiError ? e.friendly : String(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteArticle = async (file: InsightFile) => {
    // A typed confirmation, not a yes/no — deleting published writing is the
    // one destructive act in this panel and it should cost a deliberate step.
    const answer = window.prompt(
      `This permanently removes "${file.slug}" from the site on the next publish.\nType DELETE to confirm.`,
    );
    if (answer !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const head = await loadContent(token);
      const committed = await save(token, {
        json: {},
        binaries: {},
        deletes: [file.path],
        message: `Keeper: delete article "${file.slug}" by ${signee?.login ?? "owner"}`,
        baseSha: head.headSha,
        branch: branchOverride,
      });
      onPublishStateChange(committed.commitSha);
      await refresh();
    } catch (e) {
      setError(e instanceof KeeperApiError ? e.friendly : String(e));
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async () => {
    if (!doc) return;
    // marked is loaded on demand: the site renders markdown at build time and
    // never ships it to visitors; only this preview needs it in a browser.
    const { marked } = await import("marked");
    const safe = s(doc.body).replace(/</g, "&lt;");
    setPreview(marked.parse(safe, { async: false }) as string);
  };

  /* ------------------------------- list view ------------------------------ */

  if (!editing) {
    // Declared once: it is the empty state's only action AND the list's footer
    // button, and two copies of it would drift apart the first time either changed.
    const writeButton = (
      <button
        type="button"
        onClick={startNew}
        className={`${MONO_LABEL} border border-gold-rich/60 bg-gold-antique/10 px-6 py-3.5 text-gold-high transition-colors hover:border-gold-high hover:bg-gold-antique/20`}
      >
        + Write a new article
      </button>
    );

    return (
      <div className="space-y-10">
        <SectionHeading
          title="Insights"
          note="Articles published under the business's name. Each one is its own page on the site, listed on the insights index and in the sitemap. Drafts are saved but invisible to visitors until the draft mark is removed."
        />
        {error ? <IssueLine text={error} /> : null}

        {files === null ? (
          <p className={`${MONO_LABEL} text-ash`}>Reading the shelf…</p>
        ) : files.length === 0 ? (
          <EmptyState
            title="No articles yet"
            note="Insights are the only pages here that can be added to over time, and each one becomes its own page in the sitemap. Nothing is published until you remove the draft mark."
          >
            {writeButton}
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {
              files.map((file) => (
                <div
                  key={file.slug}
                  className="flex flex-wrap items-center justify-between gap-3 border border-gold-antique/15 px-5 py-4"
                >
                  <span className="font-display text-lg text-ivory">{file.slug}</span>
                  <span className="flex gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void openExisting(file)}
                      className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-gold-antique transition-colors enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-40`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteArticle(file)}
                      className={`${MONO_LABEL} border border-gold-antique/25 px-4 py-2 text-ash transition-colors enabled:hover:border-[#d8825a] enabled:hover:text-[#d8825a] disabled:opacity-40`}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))
            }
          </div>
        )}

        {/* The empty state carries its own copy of this, so showing it again
            below would offer the same action twice on an empty shelf. */}
        {files && files.length > 0 ? writeButton : null}
      </div>
    );
  }

  /* ------------------------------ editor view ----------------------------- */

  return (
    <div className="space-y-8">
      <SectionHeading
        title={editing.originalSlug ? `Editing: ${editing.originalSlug}` : "New article"}
        note="Plain text with simple formatting: ## for a section heading, **bold**, - for a bullet list, a blank line between paragraphs. The preview shows exactly what the page will render. Keep it as a draft until it reads right — drafts are saved but never shown to visitors."
      />
      {error ? <IssueLine text={error} /> : null}

      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="ins-title" className={`${MONO_LABEL} text-ash`}>
            Title
          </label>
          <input
            id="ins-title"
            type="text"
            value={s(doc?.title)}
            onChange={(e) => {
              const patch: Doc = { title: e.target.value };
              // Auto-derive the slug until the article exists; after that the
              // URL is load-bearing (links, search) and only changes manually.
              if (!editing.originalSlug) patch.slug = slugify(e.target.value);
              set(patch);
            }}
            className={`${INPUT_CLASS} mt-2`}
          />
          {issueFor("insight.title").map((issue, j) => (
            <IssueLine key={j} control="ins-title" text={issue.message} />
          ))}
        </div>

        <div>
          <label htmlFor="ins-slug" className={`${MONO_LABEL} text-ash`}>
            Web address (slug)
          </label>
          <input
            id="ins-slug"
            type="text"
            value={s(doc?.slug)}
            onChange={(e) => set({ slug: e.target.value })}
            className={`${INPUT_CLASS} mt-2 font-mono`}
          />
          {issueFor("insight.slug").map((issue, j) => (
            <IssueLine key={j} control="ins-slug" text={issue.message} />
          ))}
        </div>

        <div>
          <label htmlFor="ins-date" className={`${MONO_LABEL} text-ash`}>
            Date
          </label>
          <input
            id="ins-date"
            type="text"
            value={s(doc?.date)}
            onChange={(e) => set({ date: e.target.value })}
            className={`${INPUT_CLASS} mt-2 font-mono`}
            placeholder="2026-08-01"
          />
          <p className="mt-2 text-xs leading-relaxed text-ash/70">
            A future date schedules the article: it publishes automatically on
            that morning. Today or earlier publishes on the next save.
          </p>
          {issueFor("insight.date").map((issue, j) => (
            <IssueLine key={j} control="ins-date" text={issue.message} />
          ))}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ins-summary" className={`${MONO_LABEL} text-ash`}>
            Summary
          </label>
          <textarea
            id="ins-summary"
            rows={2}
            value={s(doc?.summary)}
            onChange={(e) => set({ summary: e.target.value })}
            className={`${INPUT_CLASS} mt-2 resize-y`}
          />
          {issueFor("insight.summary").map((issue, j) => (
            <IssueLine key={j} control="ins-summary" text={issue.message} />
          ))}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ins-body" className={`${MONO_LABEL} text-ash`}>
            Article text
          </label>
          <textarea
            id="ins-body"
            rows={16}
            value={s(doc?.body)}
            onChange={(e) => set({ body: e.target.value })}
            className={`${INPUT_CLASS} mt-2 resize-y font-mono text-[0.82rem] leading-relaxed`}
          />
          {issueFor("insight.body").map((issue, j) => (
            <IssueLine key={j} control="ins-body" text={issue.message} />
          ))}
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <input
            id="ins-draft"
            type="checkbox"
            checked={Boolean(doc?.draft)}
            onChange={(e) => set({ draft: e.target.checked })}
            className="h-4 w-4 accent-[#d99a33]"
          />
          <label htmlFor="ins-draft" className="text-sm text-ash">
            Draft — keep it off the site until this is unticked
          </label>
        </div>
      </div>

      {preview ? (
        <div className="border border-gold-antique/20 p-7">
          <p className={`${MONO_LABEL} mb-5 text-ash`}>Preview</p>
          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 border-t border-gold-antique/16 pt-8">
        <button
          type="button"
          disabled={busy || articleIssues.length > 0}
          onClick={() => void saveArticle()}
          className="border border-gold-rich/60 bg-gold-antique/10 px-8 py-3 font-mono text-[0.68rem] font-medium tracking-[0.28em] text-gold-high uppercase transition-all duration-300 enabled:hover:border-gold-high enabled:hover:bg-gold-antique/20 disabled:opacity-35"
        >
          {busy ? "Saving…" : doc?.draft ? "Save draft" : "Save & Publish"}
        </button>
        <button
          type="button"
          onClick={() => void showPreview()}
          className={`${MONO_LABEL} border border-gold-antique/25 px-6 py-3 text-gold-antique transition-colors hover:border-gold-rich hover:text-gold-high`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className={`${MONO_LABEL} border border-gold-antique/25 px-6 py-3 text-ash transition-colors hover:border-gold-rich hover:text-ivory`}
        >
          Back to list
        </button>
      </div>
      {articleIssues.length > 0 ? (
        <p className="text-xs text-[#d8825a]">
          {articleIssues.length} thing{articleIssues.length === 1 ? "" : "s"} to fix before
          saving — marked above.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MEDIA LIBRARY                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Every image the site serves, with the one fact a filename cannot tell you:
 * WHERE IT IS USED. Usage is computed by scanning the live content — the four
 * buying panels, every testimonial photo, and every article body — so "not
 * used anywhere" is a measurement, not a guess. Deletion is only offered for
 * unused images, behind a typed confirmation, and the client refuses to
 * delete outside public/img even if a bug asks it to.
 *
 * Uploads land as their own commit immediately: an image is an asset, not a
 * draft, and holding it in the batch save would mean a photo the owner
 * uploaded "successfully" existing only in one browser tab.
 */
function MediaLibrary({
  token,
  docs,
  signee,
  branchOverride,
  onPublishStateChange,
}: {
  token: string;
  docs: Record<string, Doc>;
  signee: Signee | null;
  branchOverride?: string;
  /*
    Called with the COMMIT SHA so the parent can poll that build to a
    terminal state. The old contract took a PublishStatus, and the children
    passed { state: "publishing" } — a state nothing could ever leave,
    because nothing polled these commits. The save bar said "Publishing…
    this takes a few minutes" forever, until a full page reload.
  */
  onPublishStateChange: (commitSha: string) => void;
}) {
  const [images, setImages] = useState<RepoImage[] | null>(null);
  const [articleBodies, setArticleBodies] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [imgs, files] = await Promise.all([
          listImages(token),
          listInsightFiles(token),
        ]);
        const bodies: Record<string, string> = {};
        for (const file of files) {
          try {
            const article = await loadInsight(token, file.path);
            bodies[file.slug] = typeof article.body === "string" ? article.body : "";
          } catch {
            bodies[file.slug] = "";
          }
        }
        if (!cancelled) {
          setImages(imgs);
          setArticleBodies(bodies);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof KeeperApiError ? e.friendly : String(e));
          setImages([]);
          setArticleBodies({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /** Everywhere an /img/ path can legitimately appear, with a readable name. */
  const usageOf = (name: string): string[] => {
    const ref = `/img/${name}`;
    const uses: string[] = [];
    const services = (docs["src/content/services.json"] ?? {}) as Doc;
    for (const id of SERVICE_IDS) {
      const svc = (services[id] ?? {}) as Doc;
      if (s(svc.image) === ref) uses.push(`What We Buy — ${id}`);
    }
    const testimonials = (docs["src/content/testimonials.json"] ?? {}) as Doc;
    const list = Array.isArray(testimonials.testimonials) ? testimonials.testimonials : [];
    list.forEach((t, i) => {
      if (s((t as Doc).photo) === ref) uses.push(`Testimonial ${i + 1}`);
    });
    for (const [slug, body] of Object.entries(articleBodies ?? {})) {
      if (body.includes(ref)) uses.push(`Article: ${slug}`);
    }
    return uses;
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImage(file);
      const head = await loadContent(token);
      const committed = await save(token, {
        json: {},
        binaries: { [prepared.repoPath]: prepared.bytes },
        message: `Keeper: add image ${prepared.repoPath.split("/").pop()} by ${signee?.login ?? "owner"}`,
        baseSha: head.headSha,
        branch: branchOverride,
      });
      onPublishStateChange(committed.commitSha);
      setImages((prev) => [
        ...(prev ?? []),
        { name: prepared.repoPath.split("/").pop()!, path: prepared.repoPath, size: prepared.bytes.length },
      ]);
    } catch (e) {
      setError(e instanceof KeeperApiError ? e.friendly : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (img: RepoImage) => {
    const answer = window.prompt(
      `This permanently removes ${img.name} from the site's files.\nType DELETE to confirm.`,
    );
    if (answer !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const head = await loadContent(token);
      const committed = await save(token, {
        json: {},
        binaries: {},
        deletes: [img.path],
        message: `Keeper: delete unused image ${img.name} by ${signee?.login ?? "owner"}`,
        baseSha: head.headSha,
        branch: branchOverride,
      });
      onPublishStateChange(committed.commitSha);
      setImages((prev) => (prev ?? []).filter((i) => i.path !== img.path));
    } catch (e) {
      setError(e instanceof KeeperApiError ? e.friendly : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <SectionHeading
        title="Media"
        note="Every image the site serves, and where each one is used. Uploads are resized and compressed in your browser before anything is stored. Only images used nowhere can be deleted — removing one that a page still points at would leave a hole in the site, so the panel refuses."
      />
      {error ? <IssueLine text={error} /> : null}

      <label
        className={`${MONO_LABEL} inline-block cursor-pointer border border-gold-rich/60 bg-gold-antique/10 px-6 py-3.5 text-gold-high transition-colors hover:border-gold-high hover:bg-gold-antique/20`}
      >
        {busy ? "Working…" : "+ Upload image"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>

      {images === null || articleBodies === null ? (
        <p className={`${MONO_LABEL} text-ash`}>Reading the archive…</p>
      ) : images.length === 0 ? (
        <EmptyState
          title="No images yet"
          note="Anything uploaded here is committed to the repository and served from the site's own domain — there is no external image host to depend on. Use the button above to add the first one."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((img) => {
            const uses = usageOf(img.name);
            return (
              <div key={img.path} className="border border-gold-antique/15">
                <div className="aspect-4/3 w-full overflow-hidden bg-void">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetPath(`/img/${img.name}`)}
                    alt={img.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <p className="truncate font-mono text-xs text-ivory">{img.name}</p>
                  <p className="text-xs text-ash/70">{Math.round(img.size / 1024)} KB</p>
                  {uses.length > 0 ? (
                    <p className="text-xs leading-relaxed text-gold-antique">
                      Used in: {uses.join(", ")}
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-ash/60">Not used anywhere</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(img)}
                        className={`${MONO_LABEL} border border-gold-antique/25 px-3 py-1.5 text-ash transition-colors enabled:hover:border-[#d8825a] enabled:hover:text-[#d8825a] disabled:opacity-40`}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SEO EDITOR                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The title and description each page shows in a search result, with a live
 * preview of roughly how Google will render it. The preview is the point: a
 * character counter tells an owner a number, a preview tells them whether
 * their sentence survives being cut off.
 *
 * Article pages are absent — an article's title and summary ARE its search
 * fields, edited where the article is written.
 */
function SeoEditor({
  doc,
  issues,
  onChange,
}: {
  doc: Doc;
  issues: FieldIssue[];
  onChange: (next: Doc) => void;
}) {
  const issueFor = (field: string) => issues.filter((i) => i.field === field);

  return (
    <div className="space-y-12">
      <SectionHeading
        title="Search (SEO)"
        note="What each page shows in a search result. Titles are the clickable headline; descriptions are the grey text beneath. Write them for a person deciding whether to click, not for a search engine — and keep every page different from every other, which the site checks before publishing."
      />

      {(Object.entries(SEO_PAGES) as [string, { label: string; path: string }][]).map(
        ([key, meta]) => {
          const page = (doc[key] ?? {}) as Record<string, unknown>;
          const title = s(page.title);
          const description = s(page.description);
          /*
            The preview and the counter both measure the COMPOSED title — what
            the page will actually emit, business name included. Measuring the
            typed string instead understated every page by the length of the
            name, so a 58-character title reported "58 / 60, fine" while 85
            characters shipped and the end was cut off in the search result.
          */
          const fullTitle = composeTitle(title, brand.name);
          const brandAdded = fullTitle !== title;
          const setField = (field: string, value: string) =>
            onChange({ ...doc, [key]: { ...page, [field]: value } });

          return (
            <fieldset key={key}>
              <legend className="font-display text-lg text-gold-high">
                {meta.label}
              </legend>
              <p className={`${MONO_LABEL} mt-1 text-ash/60`}>{meta.path}</p>

              {/* Search-result preview */}
              <div className="mt-4 border border-gold-antique/15 bg-void/40 p-5">
                <p className={`${MONO_LABEL} mb-3 text-ash/60`}>
                  Roughly how this appears in search
                </p>
                <p className="truncate text-[0.95rem] text-[#8ab4f8]">
                  {title ? fullTitle : "(no title)"}
                </p>
                <p className="mt-1 text-xs text-gold-antique">
                  pureweight.example{meta.path}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ash">
                  {description
                    ? description.length > SEO_DESCRIPTION_SOFT_MAX
                      ? `${description.slice(0, SEO_DESCRIPTION_SOFT_MAX)}…`
                      : description
                    : "(no description)"}
                </p>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={`seo-${key}-title`} className={`${MONO_LABEL} text-ash`}>
                      Page title
                    </label>
                    <span
                      className={`${MONO_LABEL} ${fullTitle.length > SEO_TITLE_SOFT_MAX ? "text-[#d8825a]" : "text-ash/60"}`}
                    >
                      {fullTitle.length} / {SEO_TITLE_SOFT_MAX}
                    </span>
                  </div>
                  <input
                    id={`seo-${key}-title`}
                    type="text"
                    value={typeof page.title === "string" ? (page.title as string) : ""}
                    onChange={(e) => setField("title", e.target.value)}
                    className={`${INPUT_CLASS} mt-2`}
                  />
                  {brandAdded ? (
                    <p className="mt-2 text-xs leading-relaxed text-ash">
                      “ — {brand.name}” is added automatically, and counted above.
                      Write it yourself anywhere in the title and it will not be
                      added twice.
                    </p>
                  ) : null}
                  {fullTitle.length > SEO_TITLE_SOFT_MAX ? (
                    <p className="mt-2 text-xs leading-relaxed text-ash">
                      Longer than most search results show — the end may be cut off.
                      Fine if the important words come first.
                    </p>
                  ) : null}
                  {issueFor(`seo.${key}.title`).map((issue, j) => (
                    <IssueLine key={j} control={`seo-${key}-title`} text={issue.message} />
                  ))}
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={`seo-${key}-description`} className={`${MONO_LABEL} text-ash`}>
                      Description
                    </label>
                    <span
                      className={`${MONO_LABEL} ${description.length > SEO_DESCRIPTION_SOFT_MAX ? "text-[#d8825a]" : "text-ash/60"}`}
                    >
                      {description.length} / {SEO_DESCRIPTION_SOFT_MAX}
                    </span>
                  </div>
                  <textarea
                    id={`seo-${key}-description`}
                    rows={3}
                    value={typeof page.description === "string" ? (page.description as string) : ""}
                    onChange={(e) => setField("description", e.target.value)}
                    className={`${INPUT_CLASS} mt-2 resize-y`}
                  />
                  {issueFor(`seo.${key}.description`).map((issue, j) => (
                    <IssueLine key={j} control={`seo-${key}-description`} text={issue.message} />
                  ))}
                </div>
              </div>
            </fieldset>
          );
        },
      )}
    </div>
  );
}
