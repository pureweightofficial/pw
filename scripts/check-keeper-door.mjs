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
    /*
      A PLAUSIBLE DOMAIN, because the point is to reach the sign-up POLICY.

      Two earlier attempts never got that far. "@keeper-probe.invalid" and
      "@example.com" are both RFC 2606 reserved — correct instinct, wrong
      result: Supabase rejects each as malformed before it ever consults
      whether sign-ups are enabled, and the script read that 400 as "closed".
      It would have certified a locked door on a project standing wide open.

      So the address is now shaped like a real one. It is unmistakably a probe
      and the domain is not registered, so nothing can be delivered to it.
    */
    email: `keeper-door-probe-${Date.now()}@pw-security-probe.com`,
    password: `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }),
});

const signupBody = await signup.json().catch(() => ({}));

/*
  Distinguish "refused the sign-up" from "refused the address". A 400 whose
  message is about the email being invalid is the probe's own fault and proves
  nothing either way — say so rather than banking it as a pass.
*/
const msg = `${signupBody.msg || signupBody.error_description || signupBody.message || ""}`;

/*
  READ THE ACTUAL SIGNAL, do not infer from the status code.

  Supabase says something specific when the policy is what refused you —
  "Signups not allowed for this instance". That sentence is the only thing
  that proves the door is shut. A bare 400 could equally mean the address was
  malformed, the password was too short, or a rate limit was hit, and treating
  any of those as a pass is how a security check becomes decoration.

  Three outcomes, named honestly: OPEN (a user was created), CLOSED (the
  policy said so), or INCONCLUSIVE (anything else) — and inconclusive is
  reported as a failure, because "we did not find out" must never look like
  "we checked and it was fine".
*/
const signupsClosed = /signups?\s+(are\s+)?not\s+allowed|signups?\s+disabled/i.test(msg);

if (signup.ok && (signupBody.id || signupBody.user?.id)) {
  failures.push(
    "SIGN-UPS ARE OPEN: the probe just created a user. Delete it " +
    "(Authentication -> Users, the @pw-security-probe.com address) and disable " +
    '"Allow new users to sign up" under Sign In / Providers -> Email.',
  );
} else if (/rate limit/i.test(msg)) {
  /*
    A rate limit on the EMAIL step is not a neutral outcome — it is evidence
    the other way. Supabase checks its disable_signup policy before it ever
    tries to send a confirmation, so a reply about email quota means the
    sign-up was ACCEPTED and only the mail failed. A project with sign-ups
    switched off answers "Signups not allowed for this instance" immediately
    and never reaches the mailer.
  */
  failures.push(
    `SIGN-UPS APPEAR TO BE OPEN: the API answered "${msg}" — a limit on ` +
    "SENDING THE CONFIRMATION EMAIL, which Supabase only reaches after it has " +
    "accepted the sign-up. A project with sign-ups disabled refuses before " +
    "that, with \"Signups not allowed for this instance\". Turn them off: " +
    "Authentication -> Sign In / Providers -> Email -> \"Allow new users to " +
    "sign up\" OFF. Then check Authentication -> Users for any " +
    "@pw-security-probe.com account and delete it.",
  );
} else if (signupsClosed) {
  console.log(`  signup: refused by policy — "${msg}"`);
} else {
  failures.push(
    `SIGN-UP CHECK INCONCLUSIVE: HTTP ${signup.status}${msg ? ` — "${msg}"` : ""}. ` +
    "That is not Supabase's \"signups not allowed\" message, so this run does " +
    "NOT prove sign-ups are closed — it may have been refused for some other " +
    "reason. Confirm by hand: Authentication -> Sign In / Providers -> Email " +
    "-> \"Allow new users to sign up\" must be OFF.",
  );
}

/* ------------------------------------------------------------------ */

if (failures.length) {
  console.error(`\nKEEPER DOOR CHECK FAILED — ${failures.length} exposure(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log("\n  keeper door: locked. Anon key reads nothing; sign-ups closed.");
