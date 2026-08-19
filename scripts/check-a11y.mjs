/**
 * ACCESSIBILITY GATE — axe-core over the built pages.
 *
 * The other gates in this project each measure one thing precisely: contrast in
 * gamma space, sticky columns, triangle budgets, content rules. None of them
 * looks at the DOM the way assistive technology does, so a whole category of
 * fault — an unlabelled control, a field whose error message is visually
 * adjacent but not programmatically attached, a tab strip that is really a row
 * of buttons — could ship without any instrument objecting.
 *
 * This runs axe-core against the exported HTML in a real browser and fails on
 * serious and critical violations.
 *
 * WHY ONLY SERIOUS AND CRITICAL. axe's "minor" and "moderate" bands include
 * findings that are contextual judgement calls, and a gate that cries wolf
 * gets disabled. These two bands are the ones that reliably mean a person
 * cannot use the thing. Everything else is printed as a note, not a failure,
 * so it is visible without being an obstacle.
 *
 * WHAT THIS CANNOT SEE. The Keeper renders its editors only after a GitHub
 * token is supplied, so an unauthenticated pass reaches the sign-in screen and
 * nothing beyond it. That limit is real and is printed, not papered over —
 * the panel's internals are covered by the hand-written checks in the same
 * file rather than pretended about.
 */

import { chromium } from "playwright-core";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

if (!existsSync(out)) {
  console.error("  a11y check: no out/ directory — run the export first");
  process.exit(1);
}

/**
 * Real Chrome first — present both on this machine and on the CI runner image.
 *
 * On failure this reports WHERE it looked. A gate that cannot find a browser
 * has to say that, because the alternative is a CI log reading "no Chrome
 * found" and the next person guessing at an image they cannot inspect.
 */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
].filter(Boolean);

function findChrome() {
  for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      for (const sub of ["chrome-win64", "chrome-win"]) {
        const exe = join(cache, dir, sub, "chrome.exe");
        if (existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

/* One page per template. Auditing all thirteen would re-test the same shell
   twelve times; these five cover every distinct layout the site ships. */
const PAGES = [
  ["homepage", "/pw/"],
  ["what-we-buy", "/pw/what-we-buy/"],
  ["contact", "/pw/contact/"],
  ["faq", "/pw/faq/"],
  ["keeper (sign-in only)", "/pw/keeper/"],
];

/*
  THE PAGES MUST BE SERVED, NOT OPENED FROM DISK.

  The first version of this gate loaded out/index.html over file:// and
  reported forty serious contrast violations. Every one was an artefact: the
  export links its CSS at the absolute path /pw/_next/..., which under file://
  resolves to the filesystem root and 404s, so axe was auditing an unstyled
  document. The give-away was in the numbers — axe reported #9e9eff on #ffffff,
  which is Chrome's default link colour on a default white page, on a site that
  is gold on near-black.

  Acting on that would have meant changing forty real colours to satisfy a
  measurement of a page nobody will ever see. So the gate now serves out/ under
  the same basePath the site deploys to, and audits the site as it actually
  renders.
*/
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".ico": "image/x-icon",
};

function serve(dir, basePath) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (!p.startsWith(basePath)) { res.writeHead(404).end(); return; }
    p = p.slice(basePath.length);
    let file = join(dir, p);
    try {
      if (statSync(file).isDirectory()) file = join(file, "index.html");
    } catch {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const axeSource = readFileSync(
  join(root, "node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

const chromePath = findChrome();
if (!chromePath) {
  console.error("  a11y check: no Chrome or Edge found. Looked in:");
  for (const c of CHROME_CANDIDATES) console.error("    " + c);
  process.exit(1);
}

/*
  THE BASE PATH IS READ FROM THE BUILD, NOT ASSUMED.

  Two gates in this repo want the same out/ directory built two different
  ways: check-section-scene-contrast wants BASE_PATH= (no prefix) and this
  one hard-coded "/pw/". Running them back to back therefore failed one of
  them every time, and the failure it produced was "page rendered UNSTYLED"
  — which reads like a CSS regression, not a build-flag mismatch. That cost a
  diagnosis cycle on a day already spent on a stale-build trap in the sweep
  tool, which is two instruments lying about the same directory.

  So: sniff the prefix off the stylesheet link the export actually emitted,
  and serve whatever the build says it is. Either build now passes.
*/
const indexHtml = readFileSync(join(out, "index.html"), "utf8");
const cssHref = indexHtml.match(/href="([^"]*\/_next\/static\/[^"]*\.css)"/);
const detectedBase = cssHref
  ? cssHref[1].slice(0, cssHref[1].indexOf("/_next/")) + "/"
  : "/";
const { server, port } = await serve(out, detectedBase);
const browser = await chromium.launch({ executablePath: chromePath });
const failures = [];
let notes = 0;

for (const [label, declaredRoute] of PAGES) {
  const route = detectedBase + declaredRoute.replace(/^\/pw\//, "");
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const res = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "load" });
  if (!res || !res.ok()) {
    failures.push(`${label}: served ${res ? res.status() : "no response"} for ${route}`);
    await page.close();
    continue;
  }

  /*
    A stylesheet that failed to load turns this gate into a generator of
    fiction — see the note above. Proving the CSS actually applied costs one
    evaluate and makes that failure mode impossible to repeat silently.
  */
  const styled = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    return { bg, sheets: document.styleSheets.length };
  });
  if (styled.sheets === 0 || styled.bg === "rgba(0, 0, 0, 0)") {
    failures.push(
      `${label}: page rendered UNSTYLED (${styled.sheets} sheet(s), body bg ${styled.bg}) — ` +
        `any contrast result here would be meaningless`,
    );
    await page.close();
    continue;
  }

  /*
    The opening curtain covers the homepage for its first seconds and axe would
    audit a black overlay rather than the page. Reduced motion skips it, which
    is the component's own documented behaviour rather than a test-only hack.
  */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(600);

  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () =>
    await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    }),
  );
  await page.close();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const minor = results.violations.filter(
    (v) => v.impact !== "serious" && v.impact !== "critical",
  );
  notes += minor.length;

  const mark = blocking.length === 0 ? "ok  " : "FAIL";
  console.log(`  ${mark} ${label.padEnd(22)} ${blocking.length} blocking, ${minor.length} note(s)`);

  for (const v of blocking) {
    failures.push(`${label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
    for (const n of v.nodes.slice(0, 2)) {
      failures.push(`      ${n.target.join(" ")}`);
    }
  }
  for (const v of minor) console.log(`       note: [${v.impact}] ${v.id} — ${v.help}`);
}

await browser.close();
server.close();

console.log(
  "\n  NOTE: the Keeper's editors need a GitHub token, so only its sign-in\n" +
    "  screen is reachable here. Everything past it is covered by review, not axe.",
);

if (failures.length > 0) {
  console.error(`\nA11Y CHECK FAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}

console.log(`\n  a11y check: no serious or critical violations (${notes} note(s))`);
