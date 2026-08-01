/**
 * THE KEEPER'S ONLY DEPENDENCY: GitHub's REST API, spoken directly from the
 * owner's browser.
 *
 * There is no server. api.github.com sends `Access-Control-Allow-Origin: *`
 * and permits the Authorization header cross-origin, which is the entire
 * reason a purely static admin panel can exist: the browser authenticates
 * with a fine-grained personal access token and writes commits itself.
 *
 * DESIGN DECISIONS THAT ARE LOAD-BEARING
 *
 * ONE SAVE = ONE COMMIT, VIA THE GIT DATA API. The naive path — one
 * Contents-API PUT per file — would turn "edit three fields and swap a
 * photo" into four commits, and every commit triggers the full CI build,
 * which QUEUES (pages.yml sets cancel-in-progress: false). Four sequential
 * three.js builds for one editing session is how an owner learns to distrust
 * the tool. So a save collects every changed file into blobs, builds one
 * tree, one commit, one ref update.
 *
 * TextEncoder, NEVER btoa(). btoa throws on any code point above 255, and
 * this site's copy is full of em dashes and curly quotes — the first save of
 * real prose would have crashed the panel.
 *
 * THE REF UPDATE CAN RACE. If anything else committed to main since the tree
 * was based (the developer, another tab), the ref PATCH fails as non-fast-
 * forward. The recovery is refetch-and-retry ONCE against the new head; if it
 * fails again, surface it — never force, never loop.
 */

const API = "https://api.github.com";
export const REPO = "pureweightofficial/pw";

/** Files the keeper is allowed to touch. Nothing else, ever. */
export const CONTENT_PATHS = [
  "src/content/business.json",
  "src/content/services.json",
  "src/content/testimonials.json",
  "src/content/faq.json",
  "src/content/copy.json",
] as const;

export const INSIGHTS_DIR = "src/content/insights";

export const IMAGE_DIR = "public/img";

type Json = Record<string, unknown>;

async function gh<T>(
  token: string,
  path: string,
  init?: RequestInit & { allow404?: boolean },
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (init?.allow404 && res.status === 404) return null as T;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new KeeperApiError(res.status, path, body);
  }
  return (await res.json()) as T;
}

export class KeeperApiError extends Error {
  status: number;
  constructor(status: number, path: string, body: string) {
    super(`GitHub ${status} on ${path}: ${body.slice(0, 200)}`);
    this.status = status;
  }
  /** A message the owner can act on, not a status code. */
  get friendly(): string {
    if (this.status === 401)
      return "GitHub did not accept the access key. It may have been revoked — sign out and paste it again, or create a new one.";
    if (this.status === 403)
      return "GitHub refused the request. The access key may lack write permission for the pw repository.";
    if (this.status === 404)
      return "Something the panel expected is missing on GitHub. Check the access key covers the pw repository.";
    return "GitHub returned an unexpected error. Wait a minute and try again; if it persists, contact your developer.";
  }
}

/* -------------------------------------------------------------------------- */
/* AUTH                                                                       */
/* -------------------------------------------------------------------------- */

export type Signee = { login: string; canWrite: boolean };

/**
 * Validates a token by asking for the repository itself. `permissions.push`
 * in the response is GitHub's own verdict on whether this token can commit —
 * testing it here means the owner finds out at sign-in, not at first save.
 */
export async function validateToken(token: string): Promise<Signee> {
  const me = await gh<{ login: string }>(token, "/user");
  const repo = await gh<{ permissions?: { push?: boolean } }>(
    token,
    `/repos/${REPO}`,
  );
  return { login: me.login, canWrite: Boolean(repo.permissions?.push) };
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

export type LoadedContent = {
  /** Parsed JSON per content path. */
  files: Record<string, Json>;
  /** The commit the content was read at — the base for the next save. */
  headSha: string;
};

/**
 * Reads all content files at ONE consistent commit. Reading each file "from
 * main" individually could straddle a concurrent push and hand back a mix of
 * two states; resolving the head first and reading blobs at that exact commit
 * cannot.
 */
export async function loadContent(token: string): Promise<LoadedContent> {
  const head = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${REPO}/git/ref/heads/main`,
  );
  const headSha = head.object.sha;

  const files: Record<string, Json> = {};
  for (const path of CONTENT_PATHS) {
    const file = await gh<{ content: string; encoding: string }>(
      token,
      `/repos/${REPO}/contents/${path}?ref=${headSha}`,
    );
    // Contents API base64 is line-wrapped; atob handles it after unwrapping.
    const bytes = Uint8Array.from(atob(file.content.replace(/\n/g, "")), (c) =>
      c.charCodeAt(0),
    );
    files[path] = JSON.parse(new TextDecoder().decode(bytes)) as Json;
  }
  return { files, headSha };
}

/* -------------------------------------------------------------------------- */
/* SAVE                                                                       */
/* -------------------------------------------------------------------------- */

export type SavePlan = {
  /** JSON files to write, keyed by repo path. */
  json: Record<string, Json>;
  /** Binary uploads (already resized): repo path -> bytes. */
  binaries: Record<string, Uint8Array>;
  /**
   * Repo paths to DELETE in the same commit — used when the owner removes an
   * article. Restricted by save() to the insights directory: nothing else the
   * panel touches is deletable, and a bug here must not be able to delete
   * site code.
   */
  deletes?: string[];
  message: string;
  /** The head the editor loaded from; the save rebases once if it moved. */
  baseSha: string;
  /** Target ref. Always "main" in production; overridable for testing. */
  branch?: string;
};

/* -------------------------------------------------------------------------- */
/* INSIGHTS (articles)                                                        */
/* -------------------------------------------------------------------------- */

export type InsightFile = { path: string; slug: string };

/** Lists article files. A missing directory is an empty blog, not an error. */
export async function listInsightFiles(token: string): Promise<InsightFile[]> {
  const entries = await gh<{ name: string; path: string; type: string }[] | null>(
    token,
    `/repos/${REPO}/contents/${INSIGHTS_DIR}`,
    { allow404: true },
  );
  if (!entries) return [];
  return entries
    .filter((e) => e.type === "file" && e.name.endsWith(".json"))
    .map((e) => ({ path: e.path, slug: e.name.replace(/\.json$/, "") }));
}

export async function loadInsight(token: string, path: string): Promise<Json> {
  const file = await gh<{ content: string }>(
    token,
    `/repos/${REPO}/contents/${path}`,
  );
  const bytes = Uint8Array.from(atob(file.content.replace(/\n/g, "")), (c) =>
    c.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as Json;
}

export type SaveResult = { commitSha: string; commitUrl: string };

function toBase64(bytes: Uint8Array): string {
  // Chunked to stay under argument-count limits on large images.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function encodeJson(value: Json): string {
  // Two-space indent and trailing newline — byte-identical to what prettier
  // and the repo's existing files use, so a keeper commit never shows churn.
  return JSON.stringify(value, null, 2) + "\n";
}

async function attemptSave(
  token: string,
  plan: SavePlan,
  baseSha: string,
): Promise<SaveResult> {
  const branch = plan.branch ?? "main";

  // 1. Blobs.
  const treeEntries: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }[] = [];

  for (const [path, value] of Object.entries(plan.json)) {
    const bytes = new TextEncoder().encode(encodeJson(value));
    const blob = await gh<{ sha: string }>(token, `/repos/${REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: toBase64(bytes), encoding: "base64" }),
    });
    treeEntries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }
  for (const [path, bytes] of Object.entries(plan.binaries)) {
    const blob = await gh<{ sha: string }>(token, `/repos/${REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: toBase64(bytes), encoding: "base64" }),
    });
    treeEntries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }

  // Deletions: a tree entry with sha null removes the path. Scope-limited to
  // the insights directory — the only thing the panel is allowed to delete.
  for (const path of plan.deletes ?? []) {
    if (!path.startsWith(`${INSIGHTS_DIR}/`)) {
      throw new Error(`Refusing to delete outside ${INSIGHTS_DIR}: ${path}`);
    }
    // The Git Data API accepts sha:null for deletion; the SDK type here is
    // ours, so widen locally rather than weakening the shared entry type.
    (treeEntries as unknown as { path: string; mode: string; type: string; sha: null }[]).push({
      path,
      mode: "100644",
      type: "blob",
      sha: null,
    });
  }

  // 2. One tree on the base commit's tree.
  const baseCommit = await gh<{ tree: { sha: string } }>(
    token,
    `/repos/${REPO}/git/commits/${baseSha}`,
  );
  const tree = await gh<{ sha: string }>(token, `/repos/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeEntries }),
  });

  // 3. One commit.
  const commit = await gh<{ sha: string; html_url: string }>(
    token,
    `/repos/${REPO}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: plan.message,
        tree: tree.sha,
        parents: [baseSha],
      }),
    },
  );

  // 4. Advance the ref — fast-forward only, never force.
  await gh(token, `/repos/${REPO}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { commitSha: commit.sha, commitUrl: commit.html_url };
}

export async function save(token: string, plan: SavePlan): Promise<SaveResult> {
  try {
    return await attemptSave(token, plan, plan.baseSha);
  } catch (error) {
    // Non-fast-forward: something else landed on the branch since we loaded.
    // Rebase our changes onto the new head ONCE. Content files are whole-file
    // writes from the editor's state, so "rebase" is simply re-basing the
    // tree — no merge is meaningful for a JSON the owner just authored.
    if (error instanceof KeeperApiError && (error.status === 409 || error.status === 422)) {
      const branch = plan.branch ?? "main";
      const head = await gh<{ object: { sha: string } }>(
        token,
        `/repos/${REPO}/git/ref/heads/${branch}`,
      );
      return await attemptSave(token, plan, head.object.sha);
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* PUBLISH STATUS                                                             */
/* -------------------------------------------------------------------------- */

export type RunSummary = {
  status: string;
  conclusion: string | null;
  createdAt: string;
  durationSec: number | null;
  htmlUrl: string;
  headSha: string;
};

/**
 * Recent builds, for the dashboard's publish-history card. Real numbers from
 * the repository's own CI — this dashboard shows nothing it cannot prove.
 */
export async function listRuns(token: string, count = 10): Promise<RunSummary[]> {
  const runs = await gh<{
    workflow_runs: {
      status: string;
      conclusion: string | null;
      created_at: string;
      updated_at: string;
      html_url: string;
      head_sha: string;
    }[];
  }>(token, `/repos/${REPO}/actions/runs?per_page=${count}`);
  return runs.workflow_runs.map((r) => ({
    status: r.status,
    conclusion: r.conclusion,
    createdAt: r.created_at,
    durationSec:
      r.status === "completed"
        ? Math.round(
            (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 1000,
          )
        : null,
    htmlUrl: r.html_url,
    headSha: r.head_sha,
  }));
}

export type EditSummary = {
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
};

/** Recent commits touching the owner-editable content — the edit history. */
export async function listContentEdits(
  token: string,
  count = 8,
): Promise<EditSummary[]> {
  const commits = await gh<
    {
      commit: { message: string; author: { name: string; date: string } };
      html_url: string;
    }[]
  >(token, `/repos/${REPO}/commits?path=src/content&per_page=${count}`);
  return commits.map((c) => ({
    message: c.commit.message.split("\n")[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    htmlUrl: c.html_url,
  }));
}

export type PublishStatus =
  | { state: "publishing" }
  | { state: "published" }
  | { state: "failed"; runUrl: string }
  | { state: "unknown" };

/**
 * The owner's commit only becomes the live site once the Actions build for it
 * completes — minutes, not seconds, plus GitHub Pages' own ten-minute cache.
 * Without this status, every owner eventually concludes that Save is broken
 * and clicks it five more times, queueing five more full builds. The repo is
 * public, so runs are readable with the same token.
 */
export async function publishStatus(
  token: string,
  commitSha: string,
): Promise<PublishStatus> {
  const runs = await gh<{
    workflow_runs: {
      head_sha: string;
      status: string;
      conclusion: string | null;
      html_url: string;
    }[];
  }>(token, `/repos/${REPO}/actions/runs?per_page=10`);

  const run = runs.workflow_runs.find((r) => r.head_sha === commitSha);
  if (!run) return { state: "unknown" };
  if (run.status !== "completed") return { state: "publishing" };
  if (run.conclusion === "success") return { state: "published" };
  return { state: "failed", runUrl: run.html_url };
}
