/**
 * IS THE KEEPER'S DOOR ACTUALLY LOCKED?
 *
 * The Supabase anon key ships in the public JavaScript BY DESIGN, so the only
 * thing standing between "anyone on the internet" and the GitHub token in
 * keeper_secrets is Row Level Security — policies that live in the database,
 * outside this repository, applied by hand from docs/supabase-keeper.sql.
 *
 * That is exactly the kind of security that rots silently: nothing in this
 * repo can break it, and nothing in this repo would notice it breaking. A
 * fresh Supabase project, a re-run migration, a well-meaning "let me just
 * disable RLS to debug" — any of them would expose a repository-write
 * credential to every visitor, and every build gate would stay green.
 *
 * So this check attacks the live site the way a stranger would:
 *
 *   1. loads /keeper and pulls the Supabase URL + anon key out of the bundle
 *      (public by design — if WE cannot find them, the check is stale);
 *   2. asks keeper_secrets and keeper_admins for rows, holding only the anon
 *      key. RLS must return zero rows or an error; ANY row is a failure that
 *      should stop a deploy and a heartbeat;
 *   3. tries to sign up a new account. Supabase must refuse — sign-ups are
 *      meant to be disabled so strangers cannot hold accounts at all. (If
 *      this ever succeeds it creates a throwaway user, which is itself the
 *      finding: delete the user, then disable sign-ups.)
 *
 * Usage:  node scripts/check-keeper-door.mjs [origin]
 *         (default origin: https://pureweight.gold)
 *
 * Exits non-zero on any exposure. Run it after touching the Supabase project,
 * rotating the token, or re-running the migration.
 */

const ORIGIN = (process.argv[2] || "https://pureweight.gold").replace(/\/$/, "");

/* ------------------------------------------------------------------ */
/* 1. Harvest the public credentials from the live bundle              */
/* ------------------------------------------------------------------ */

async function text(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

const page = await text(`${ORIGIN}/keeper/`);

const chunkPaths = [...page.matchAll(/src="([^"]*\/_next\/static\/chunks\/[^"]+\.js)"/g)]
  .map((m) => m[1]);

if (chunkPaths.length === 0) {
  console.error("  could not find any script chunks on /keeper — page shape changed?");
  process.exit(1);
}

let supaUrl = null;
let anonKey = null;

for (const path of chunkPaths) {
  const js = await text(path.startsWith("http") ? path : `${ORIGIN}${path}`);

  // The project URL: https://<ref>.supabase.co with a real ref, not the
  // bare ".supabase.co" fragment supabase-js carries as library boilerplate.
  supaUrl ??= js.match(/https:\/\/[a-z0-9]{15,}\.supabase\.co/)?.[0] ?? null;

  // The anon key is a JWT (legacy) or an sb_publishable_ key (new format).
  anonKey ??=
    js.match(/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/)?.[0] ??
    js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ??
    null;

  if (supaUrl && anonKey) break;
}

if (!supaUrl || !anonKey) {
  console.error(
    "  the live bundle carries no Supabase URL/key — either the email door is" +
    "\n  not deployed yet (env vars missing at build time) or the bundle shape" +
    "\n  changed. Nothing to attack; nothing verified.",
  );
  process.exit(1);
}

console.log(`  target: ${supaUrl}  (key ${anonKey.slice(0, 12)}…, from the public bundle)`);

/* ------------------------------------------------------------------ */
/* 2. The tables must refuse the anon key                              */
/* ------------------------------------------------------------------ */

const failures = [];

async function probeTable(table) {
  const res = await fetch(`${supaUrl}/rest/v1/${table}?select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });

  if (!res.ok) {
    // 401/403/404 all mean the stranger got nothing. Good.
    console.log(`  ${table}: HTTP ${res.status} — refused`);
    return;
  }

  const rows = await res.json();
  if (Array.isArray(rows) && rows.length === 0) {
    // RLS's normal shape: the query "succeeds" and returns nothing.
    console.log(`  ${table}: 200 with zero rows — RLS holding`);
    return;
  }

  failures.push(
    `${table} RETURNED ${Array.isArray(rows) ? rows.length : "?"} ROW(S) TO THE ANON KEY. ` +
    (table === "keeper_secrets"
      ? "The GitHub token is exposed to anyone. Rotate it NOW, then re-run docs/supabase-keeper.sql."
      : "Re-run docs/supabase-keeper.sql — its policies are not in effect."),
  );
}

await probeTable("keeper_secrets");
await probeTable("keeper_admins");

/* ------------------------------------------------------------------ */
/* 3. Sign-ups must be closed                                          */
/* ------------------------------------------------------------------ */

const signup = await fetch(`${supaUrl}/auth/v1/signup`, {
  method: "POST",
  headers: { apikey: anonKey, "content-type": "application/json" },
  body: JSON.stringify({
    // .invalid is reserved (RFC 2606): can never receive mail, clearly a probe.
    email: `door-check-${Date.now()}@keeper-probe.invalid`,
    password: `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }),
});

const signupBody = await signup.json().catch(() => ({}));

if (signup.ok && (signupBody.id || signupBody.user?.id)) {
  failures.push(
    "SIGN-UPS ARE OPEN: the probe just created a user. Delete it " +
    "(Authentication -> Users, the @keeper-probe.invalid address) and disable " +
    '"Allow new users to sign up" under Sign In / Providers -> Email.',
  );
} else {
  console.log(
    `  signup: HTTP ${signup.status}${signupBody.msg ? ` — ${signupBody.msg}` : signupBody.error_description ? ` — ${signupBody.error_description}` : ""} — closed`,
  );
}

/* ------------------------------------------------------------------ */

if (failures.length) {
  console.error(`\nKEEPER DOOR CHECK FAILED — ${failures.length} exposure(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log("\n  keeper door: locked. Anon key reads nothing; sign-ups closed.");
