"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * SUPABASE AUTH FOR THE KEEPER — a real email and password, instead of pasting
 * a GitHub token.
 *
 * WHAT CHANGED AND WHAT DELIBERATELY DID NOT
 *
 * Only the DOOR changed. The Keeper still commits content straight to GitHub
 * from the browser, `src/content/*.json` is still the source of truth, and
 * every build-time guarantee that rests on that — Verifiable<T>, check-content,
 * check-prose, the whole no-invented-facts apparatus — is untouched. Moving the
 * content itself into a database would have dissolved all of it, because those
 * gates run at build time against files, not against rows.
 *
 * So Supabase does exactly one job here: prove who is at the keyboard, and
 * hand over the GitHub token afterwards.
 *
 * WHY THAT IS AN IMPROVEMENT RATHER THAN AN EXTRA MOVING PART
 *
 * The old flow kept a fine-grained GitHub PAT in localStorage, permanently, on
 * a domain shared with every other project site the account publishes. It was
 * a considered trade at the time — an owner forced to re-mint a token every
 * session stops using the panel — but it means a token with write access to a
 * live business's repository sits in browser storage indefinitely.
 *
 * Now the token lives in a Supabase row that only an authenticated Keeper
 * admin can read, is fetched into memory after sign-in, and is never written
 * to localStorage at all. Closing the tab drops it. Rotating it is one UPDATE
 * rather than a message to whoever is holding a copy.
 *
 * THE ANON KEY IS PUBLIC, AND THAT IS FINE — BUT ONLY WITH RLS
 *
 * Supabase's anon key is designed to ship in client bundles; this is a static
 * export, so anything NEXT_PUBLIC_ is baked into JavaScript that anyone can
 * read, and this repository is public besides. The key is not the security
 * boundary. ROW LEVEL SECURITY IS. The migration in docs/supabase-keeper.sql
 * is not optional setup — without it the anon key alone would read the token
 * table, and the whole arrangement would be worse than what it replaced.
 *
 * The `service_role` key must never appear in this repository, in an env var
 * prefixed NEXT_PUBLIC_, or in any file the build can reach. It bypasses RLS
 * entirely.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether this build was given Supabase credentials at all.
 *
 * Read at module scope so the sign-in screen can decide which door to show
 * before it renders anything. A build without them keeps the token-paste flow
 * exactly as it was — which is what stops a missing environment variable from
 * locking the owner out of their own website's admin panel.
 */
export const supabaseConfigured = Boolean(URL_ENV && ANON_ENV);

let client: SupabaseClient | null = null;

/** The one client, created lazily so a build without credentials never calls it. */
function db(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase is not configured for this build (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  if (!client) {
    client = createClient(URL_ENV as string, ANON_ENV as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // No magic links or OAuth redirects here: the panel is a single page
        // and the only credential is an email and password the owner was given.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export type KeeperSession = {
  email: string;
  userId: string;
};

/** Signs in with email and password. Throws with a readable message. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<KeeperSession> {
  const { data, error } = await db().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    /*
      Supabase says "Invalid login credentials" for a wrong password AND for an
      address that has no account. That is correct behaviour — distinguishing
      them tells an attacker which emails exist — so the message is passed
      through rather than "helpfully" expanded.
    */
    throw new Error(error.message);
  }
  if (!data.user?.email) throw new Error("Signed in, but no account came back.");

  return { email: data.user.email, userId: data.user.id };
}

/** Restores a session from storage, or null. Never throws. */
export async function currentSession(): Promise<KeeperSession | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data } = await db().auth.getSession();
    const user = data.session?.user;
    if (!user?.email) return null;
    return { email: user.email, userId: user.id };
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    await db().auth.signOut();
  } catch {
    // Signing out must never fail loudly. The caller clears local state
    // regardless, which is the part that actually matters to the owner.
  }
}

/**
 * Fetches the GitHub token this panel commits with.
 *
 * RLS decides whether this returns a row. An authenticated user who is not in
 * `keeper_admins` gets zero rows rather than an error, which is exactly how
 * Postgres row security is supposed to behave — so "no rows" is treated as
 * "not authorised", not as "misconfigured".
 */
export async function fetchGithubToken(): Promise<string> {
  const { data, error } = await db()
    .from("keeper_secrets")
    .select("value")
    .eq("id", "github_token")
    .maybeSingle();

  if (error) throw new Error(`Could not read the access key: ${error.message}`);
  if (!data?.value) {
    throw new Error(
      "Signed in, but this account is not a Keeper admin — or no GitHub token has been stored yet. See docs/supabase-keeper.sql.",
    );
  }
  return data.value;
}
