import { Footer } from '@/components/chrome/Footer';
import { Loader } from '@/components/chrome/Loader';
import { Nav } from '@/components/chrome/Nav';
import { SceneCursor } from '@/components/chrome/SceneCursor';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { FireflyBackdrop } from '@/components/ui/FireflyBackdrop';

/**
 * THE SITE'S CHROME — everything that makes the public pages an EXPERIENCE
 * rather than a document: the opening curtain, the fixed navigation, the
 * firefly field, the custom cursor, Lenis smooth scrolling and the footer.
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
        The firefly field sits behind everything, on the body's own black, and
        every section surface above it is translucent so it reads through. It is
        deliberately OUTSIDE the content stacking context — a fixed element
        inside a transformed ancestor would be positioned against that ancestor
        instead of the viewport, and GSAP puts transforms on plenty of things
        in here.

        THIS IS THE LINE THAT SWITCHES ON THE NEW WORLD, and it is deliberately
        still pointing at the old backdrop.

        `@/components/ui/GoldWorld` is the persistent single-canvas world built
        for the redesign — one context for the whole document, a chapter
        timeline, a choreographed camera and a studio rig. All of that works and
        is verified. What is NOT finished is how the signature gold mass LOOKS:
        rendered, it still shows flat angular plates around the silhouette and
        the form reads closer to a moulded ingot than to raw metal.

        Swapping this import before that is solved would make the live page
        worse than it is today, which is not a trade worth making for the sake
        of showing progress. The work is committed, documented and one import
        away; it is not switched on until it earns it.
      */}
      <FireflyBackdrop />
      <Loader />
      <SceneCursor />
      <div className="relative z-10">
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </div>
    </MotionProvider>
  );
}
