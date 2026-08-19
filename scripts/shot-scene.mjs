/**
 * LOOK AT A SCENE WITH THE PAGE TURNED OFF.
 *
 * Screenshots one section with every scrim, glow and copy layer suppressed,
 * so what is captured is the WebGL composition alone.
 *
 * WHY THIS EXISTS. The closing section was reported by four independent
 * design reviews as "nearly black", "a void", "the scroll story ends without
 * a payoff". Two plausible causes were fixed by eye and neither was the
 * fault: the scrim really was painting the lower third solid black, AND
 * underneath it the camera was aimed a full world unit above the instrument,
 * so the beam sat below the frame edge with the pans off-screen entirely. A
 * normal screenshot could not tell those two apart, because both render as
 * black. This probe can: with the scrims off, an empty frame means framing,
 * and a visible-but-veiled object means the scrim.
 *
 * Usage: npm run shot:scene [section-id]   (default: finale)
 * Frame lands in .shots/scene-<id>.png
 */
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname } from "node:path";
const out = join(process.cwd(), "out");
const MIME={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".woff2":"font/woff2",".mp4":"video/mp4",".ico":"image/x-icon"};
const server=createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]);if(p.startsWith("/pw/"))p=p.slice(3);let f=join(out,p);try{if(statSync(f).isDirectory())f=join(f,"index.html");}catch{res.writeHead(404).end();return;}try{res.writeHead(200,{"content-type":MIME[extname(f)]||"application/octet-stream"});res.end(readFileSync(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const port=server.address().port;
function findChrome(){for(const x of [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean))if(existsSync(x))return x;const c=join(process.env.LOCALAPPDATA||"","ms-playwright");for(const d of readdirSync(c)){const e=join(c,d,"chrome-win64","chrome.exe");if(existsSync(e))return e;}return null;}
const browser=await chromium.launch({executablePath:findChrome()});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const id = process.argv[2] || "finale";
await page.goto(`http://127.0.0.1:${port}/pw/`,{waitUntil:"load"});
await page.waitForTimeout(5000);
// Hide every scrim and copy layer so ONLY the scenes render.
await page.addStyleTag({content:`
  .section-scene-scrim, .ambient-glow, .hero-scrim { opacity: 0 !important; }
  #${id} .shell { opacity: 0.25 !important; }
  #${id} > div[aria-hidden="true"]:not(.vignette) { opacity: 0 !important; }
`});
// Wheel down in small steps and STOP the moment the section's top crosses
// the viewport top. Lenis eases toward its target, so a coarse step plus a
// "is it fully in view" test overshoots straight past a 92svh section.
let rect = null;
for (let i = 0; i < 400; i += 1) {
  rect = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { top: r.top, height: r.height };
  }, `#${id}`);
  if (rect.top <= 30) break;
  await page.mouse.wheel(0, rect.top > 900 ? 500 : 120);
  await page.waitForTimeout(rect.top > 900 ? 90 : 200);
}
await page.waitForTimeout(4000);
console.log(`${id} rect:`, JSON.stringify(rect));
await page.screenshot({ path: `.shots/scene-${id}.png` });
console.log(`.shots/scene-${id}.png`);
await browser.close(); server.close();
