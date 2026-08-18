import { Footer } from '@/components/chrome/Footer';
import { Loader } from '@/components/chrome/Loader';
import { Nav } from '@/components/chrome/Nav';
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
        NO SITE-WIDE BACKDROP CANVAS, and the reasons are measured, not
        aesthetic. The firefly field that lived here cost ~43fps of whole-page
        recompositing wherever it mounted (scripts/check-perf.mjs header) — and
        since the surfaces went opaque (--surface-alpha: 100%) it was an
        INVISIBLE canvas still charging that bill on every subpage. WebGL on
        this site is windowed: scenes mount inside their own sections through
        SceneShell, where they are content rather than atmosphere.
      */}
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
