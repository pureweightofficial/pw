/**
 * LOOK AT PRODUCTION.
 *
 * The live site is https://pw-peach-psi.vercel.app — public, unindexed, and
 * serving a real business's name. This opens it at desktop and mobile widths,
 * writes frames to .shots/, and reports the things that are easy to be wrong
 * about from the outside: how many canvases mounted, how many [INSERT ...]
 * placeholders are visible, whether the page scrolls sideways, and whether
 * anything on it actually failed.
 *
 * Pass a different origin as argv[2] to check a preview deployment.
 *
 * WHY THE requestfailed FILTER EXISTS. Its first version reported, confidently,
 * that the live hero videos were 404ing. They were not — they were serving 206
 * the whole time. Playwright fires `requestfailed` for ABORTED requests as well
 * as failed ones, and a <video> still streaming when the browser context closes
 * aborts by definition. An instrument that turns normal teardown into a
 * production outage is worse than no instrument, so the failure text is checked
 * before anything is reported.
 *
 * Usage:  npm run shot:live [origin]
 */
import { chromium } from "playwright-core";
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = "H:/VS Code File/pureweight-gold-exchange/.shots";
mkdirSync(OUT, { recursive: true });

function findChrome() {
  for (const x of [process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome"].filter(Boolean)) if (existsSync(x)) return x;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  for (const d of readdirSync(cache)) {
    const e = join(cache, d, "chrome-win64", "chrome.exe");
    if (existsSync(e)) return e;
  }
  return null;
}

const URL = process.argv[2] || "https://pw-peach-psi.vercel.app/";
const browser = await chromium.launch({ executablePath: findChrome() });

for (const [label, vp, mobile] of [
  ["live-desktop", { width: 1440, height: 900 }, false],
  ["live-mobile", { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile,
    hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  /*
    Only report a failed request if it actually failed. Playwright fires
    requestfailed for ABORTED requests too, and a <video> streaming when the
    context closes aborts by definition — which produced a confident, wrong
    report that the live hero videos were 404ing. They were serving 206 the
    whole time. Verify the failure text before believing it.
  */
  page.on("requestfailed", (r) => {
    const why = r.failure()?.errorText || "";
    if (/ERR_ABORTED/i.test(why)) return;
    errors.push(`FAILED ${why} ${r.url().slice(0, 80)}`);
  });

  await page.goto(URL, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: join(OUT, `${label}-hero.png`) });

  const travel = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(travel * 0.35));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(OUT, `${label}-mid.png`) });

  const info = await page.evaluate(() => ({
    canvases: document.querySelectorAll("canvas").length,
    inserts: (document.body.innerText.match(/\[INSERT/g) || []).length,
    h1: document.querySelectorAll("h1").length,
    scrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  console.log(`  ${label}: canvases=${info.canvases} placeholders=${info.inserts} h1=${info.h1} sideways=${info.scrollsSideways}`);
  if (errors.length) {
    console.log(`    ${errors.length} console/network problem(s):`);
    for (const e of [...new Set(errors)].slice(0, 6)) console.log(`      ${e}`);
  } else {
    console.log("    no page errors, no failed requests");
  }
  await ctx.close();
}
await browser.close();
