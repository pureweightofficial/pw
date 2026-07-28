import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Eyebrow, Placeholder, Section } from '@/components/ui/primitives';
import { brand } from '@/lib/site';

/**
 * LEGAL PAGES
 *
 * Structure, headings and routing — no policy text.
 *
 * A privacy policy is a legal statement about what a specific company does with
 * specific data, under a specific jurisdiction, naming specific processors.
 * Generating a plausible one would produce a document that reads correctly, is
 * legally binding on the client, and describes practices nobody has checked.
 *
 * Each section below names exactly what its content must cover, so the client's
 * adviser can fill them in directly. Every page is `noindex` until it does.
 */

type LegalDoc = {
  title: string;
  intro: string;
  sections: { heading: string; requirement: string }[];
};

const DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'How Pureweight Gold Exchange collects, uses, stores and protects personal information, including details and images submitted through the valuation enquiry form.',
    sections: [
      { heading: 'Who we are', requirement: 'Registered legal entity, trading name, address and data-controller contact.' },
      { heading: 'What we collect', requirement: 'Enquiry fields, uploaded images, technical data, and anything captured in person.' },
      { heading: 'Why we collect it', requirement: 'The lawful basis for each purpose — contract, legitimate interest or consent.' },
      { heading: 'How long we keep it', requirement: 'Retention period for enquiries, images and completed transaction records.' },
      { heading: 'Who we share it with', requirement: 'Named processors: hosting, form delivery, analytics, payment or settlement providers.' },
      { heading: 'Where it is stored', requirement: 'Storage locations and any transfers outside the visitor’s jurisdiction.' },
      { heading: 'Your rights', requirement: 'Access, rectification, erasure, portability, objection, and how to exercise each.' },
      { heading: 'Complaints', requirement: 'The supervisory authority and how to contact it.' },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'The terms under which this website and the services described on it are provided.',
    sections: [
      { heading: 'Use of this website', requirement: 'Permitted use, intellectual property and acceptable-use terms.' },
      { heading: 'Nature of information provided', requirement: 'Confirmation that nothing on the site is a valuation, quotation, offer or financial advice.' },
      { heading: 'Enquiries and appointments', requirement: 'What submitting an enquiry does and does not commit either party to.' },
      { heading: 'Valuation and exchange', requirement: 'The confirmed process, identification requirements and settlement terms.' },
      { heading: 'Liability', requirement: 'Limitations, and anything that cannot lawfully be excluded.' },
      { heading: 'Governing law', requirement: 'Jurisdiction and applicable law.' },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    intro: 'Which cookies and similar technologies this website uses, and how to control them.',
    sections: [
      { heading: 'What this site sets', requirement: 'A full audit of cookies and storage in use, with purpose and duration for each.' },
      { heading: 'Strictly necessary', requirement: 'Anything required for the site to function, including session storage used by the opening sequence.' },
      { heading: 'Analytics and measurement', requirement: 'Any analytics provider, what it records, and the consent basis.' },
      { heading: 'Managing your preferences', requirement: 'How to change or withdraw consent, and browser-level controls.' },
    ],
  },
  accessibility: {
    title: 'Accessibility Statement',
    intro:
      'Pureweight’s commitment to keeping this website usable for everyone, the standard it targets, and how to report a barrier.',
    sections: [
      { heading: 'Conformance status', requirement: 'The standard targeted (WCAG 2.2 AA), the audit date, and the auditor.' },
      { heading: 'Known limitations', requirement: 'Any areas not yet conformant, with the reason and the planned remedy.' },
      { heading: 'Feedback', requirement: 'A contact route for reporting an accessibility barrier, and the response commitment.' },
      { heading: 'Enforcement', requirement: 'The applicable escalation route in the relevant jurisdiction.' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return {};

  return {
    title: doc.title,
    description: doc.intro,
    alternates: { canonical: `/legal/${slug}` },
    // Not indexable until the document actually says something.
    robots: { index: false, follow: true },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <Section material="stone" labelledBy="legal-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell-narrow">
        <Eyebrow className="mb-8">Legal</Eyebrow>
        <h1 id="legal-heading" className="font-display text-chapter font-normal text-ivory">
          {doc.title}
        </h1>
        <p className="mt-8 text-lead text-ivory/72">{doc.intro}</p>

        <div className="mt-10 inset-panel p-8">
          <p className="label mb-4">Not yet published</p>
          <p className="text-sm leading-relaxed text-ivory/72">
            This document has not been written. Its structure is set out below so that{' '}
            {brand.shortName}&apos;s legal adviser can complete each section directly. It is
            excluded from search indexing until it is published, and the site does not represent it
            as being in force.
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {doc.sections.map((section, index) => (
            <section key={section.heading}>
              <h2 className="flex items-baseline gap-4 font-display text-2xl font-normal text-ivory">
                <span className="font-sans text-[0.6rem] tracking-[0.22em] text-gold-antique">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {section.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ash">{section.requirement}</p>
              <Placeholder label={`[INSERT ${doc.title.toUpperCase()} — ${section.heading.toUpperCase()}]`} />
            </section>
          ))}
        </div>
      </div>
    </Section>
  );
}
