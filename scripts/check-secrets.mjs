/**
 * IS THERE A REAL CREDENTIAL IN THE TREE?
 *
 * A last line of defence in front of `git commit`, and it exists because the
 * line in front of it already failed once: the Keeper's Supabase migration is
 * a template with a REPLACE_WITH_GITHUB_PAT placeholder, the owner pasted a
 * live fine-grained token over it to run the SQL, saved the file, and the next
 * `git add -A` swept it into a commit. GitHub's push protection rejected the
 * push. That worked — but relying on the far end of the pipe to catch your own
 * secrets is not a plan, and on a repository whose whole premise is being
 * public it is the one mistake with no undo.
 *
 * Scans tracked files only, so build output and node_modules are irrelevant.
 * Matches the SHAPES of real credentials, never the placeholders the UI and
 * the docs legitimately contain — "github_pat_…" with an ellipsis is copy,
 * "github_pat_" followed by eighty characters is a key.
 *
 *   npm run check:secrets
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  [/github_pat_[A-Za-z0-9_]{30,}/, "GitHub fine-grained personal access token"],
  [/\bghp_[A-Za-z0-9]{30,}/, "GitHub classic personal access token"],
  [/\bgho_[A-Za-z0-9]{30,}/, "GitHub OAuth token"],
  [/\bsb_secret_[A-Za-z0-9_-]{20,}/, "Supabase secret key (bypasses RLS)"],
  [
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}/,
    "a JWT — if this is a Supabase service_role key it bypasses RLS entirely",
  ],
  [/\bvcp_[A-Za-z0-9]{20,}/, "Vercel access token"],
  [/\bgoldapi-[a-z0-9]{20,}/, "GoldAPI key"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "a private key"],
];

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const hits = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // binary or unreadable — nothing to match
  }
  if (text.includes("\u0000")) continue;

  for (const [pattern, what] of PATTERNS) {
    const m = pattern.exec(text);
    if (!m) continue;
    const line = text.slice(0, m.index).split("\n").length;
    hits.push({ file, line, what, head: m[0].slice(0, 12) });
  }
}

if (hits.length) {
  console.error(`\nSECRET CHECK FAILED — ${hits.length} credential(s) in tracked files:\n`);
  for (const h of hits) {
    // The prefix only, never the key. A gate that prints the secret it caught
    // has copied it into your terminal history and your CI log.
    console.error(`  ✗ ${h.file}:${h.line}`);
    console.error(`      looks like ${h.what}`);
    console.error(`      starts "${h.head}…" — not printing the rest\n`);
  }
  console.error("  Remove it, then ROTATE it. Anything that reached a file has");
  console.error("  to be assumed compromised, whether or not it was pushed.\n");
  process.exit(1);
}

console.log(`  secret check: ${files.length} tracked files, no credentials`);
