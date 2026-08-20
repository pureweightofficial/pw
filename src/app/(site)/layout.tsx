import { Footer } from '@/components/chrome/Footer';
import { GoldWorld } from '@/components/ui/GoldWorld';
import { Loader } from '@/components/chrome/Loader';
import { Nav } from '@/components/chrome/Nav';
import { PlumbLine } from '@/components/chrome/PlumbLine';
import { SceneCursor } from '@/components/chrome/SceneCursor';
import { MotionProvider } from '@/components/motion/MotionProvider';

/**
 * THE SITE'S CHROME — everything that makes the public pages an EXPERIENCE
 * rather than a document: the opening curtain, the fixed navigation, the
 * custom cursor, Lenis smooth scrolling and the footer.
 *
 * It lives in this route group, not the root layout, because not every route
 * is a marketing page. The keeper (/keeper, the owner's admin panel) shares
 * the brand — fonts, palette, tokens all come from the root — but a tool must
 * not open with a 2.4-second brand curtain, hijack scrolling, or carry a nav
 * whose links leave the page the owner is working in. Splitting the chrome
 * out is what lets one codebase serve both temperaments honestly.
 *
 * URLs are unchanged: route groups are invisible to the router.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      {/*
        THE PERSISTENT WORLD, ON EVERY PAGE.

        One WebGL context fixed behind the whole document, carrying a single
        gold mass that the camera moves around as the reader scrolls. Every
        section surface above it is translucent (--surface-alpha), which is
        what lets one world show through twelve sections instead of being
        hidden by the first opaque one.

        WHY IT IS BACK. The windowed architecture that replaced it put one
        object in one section and left the other eleven flat — and the owner's
        verdict on that was exact: a single gold stone in one place reads as
        basic, because it is. The brief this project was built to always asked
        for one persistent, evolving object; windowing it was a performance
        retreat, not a design decision, and it cost the site its through-line.

        WHAT IT COSTS is measured rather than assumed, in the commit that
        turned it on and in scripts/check-perf.mjs. Translucent surfaces over
        a live canvas make the browser recomposite the page every frame; that
        is the real bill, and it is paid deliberately here rather than
        accidentally. The firefly field this replaces was charging the same
        bill while being invisible, which is the version worth avoiding.

        The gate decides BEFORE three.js is fetched (see GoldWorld), so a
        phone that should not have this never downloads the renderer.
      */}
      <GoldWorld />
      <Loader />
      <SceneCursor />
      <PlumbLine />
      <div className="relative z-10">
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </div>
    </MotionProvider>
  );
}
