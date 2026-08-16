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
        The firefly field sits behind everything on the body's own black, and
        every section surface above it is translucent so it reads through. It is
        deliberately OUTSIDE the content stacking context — a fixed element in a
        transformed ancestor is positioned against that ancestor rather than the
        viewport, and GSAP puts transforms on plenty of things in here.

        THE NEW WORLD WAS SWITCHED ON HERE AND SWITCHED BACK OFF, FOR A REASON
        THAT IS MEASURED RATHER THAN AESTHETIC.

        `@/components/ui/GoldWorld` renders correctly now — the flat-plate
        artefact is gone and the metal is believable. But it is a LIT object
        behind translucent section surfaces, and `npm run check:scene-contrast`
        put real numbers on what that does to the copy sitting over it:

            #testimonials   lead 2.32:1   label 2.03:1
            #insights       lead 2.29:1   label 2.00:1
            five sections failing in total

        WCAG AA requires 4.5:1. Body text at 2.0:1 is unreadable for a large
        number of people, and this site is live under a real business's name.

        Swapping the import back is a thirty-second change and the component is
        right there — but it must be paid for first, by strengthening the
        section scrims or dimming the world behind copy, and then re-running
        that gate until every section passes. The gate is the acceptance test.
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
