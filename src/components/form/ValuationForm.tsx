'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  APPOINTMENT_TYPES,
  CONDITIONS,
  CONTACT_METHODS,
  ITEM_TYPES,
  STEPS,
  STEP_FIELDS,
  UPLOAD_LIMITS,
  describeFileError,
  valuationSchema,
  type StepId,
  type ValuationInput,
} from '@/lib/valuation-schema';

/**
 * THE PRIVATE VALUATION ENQUIRY
 *
 * Six short steps rather than one long form. Someone clearing a late parent's
 * jewellery is not going to enjoy a wall of thirty inputs, and asking "what
 * would you like assessed?" first — before any personal detail — makes the
 * exchange feel like a conversation rather than a lead-capture.
 *
 * What it does NOT do is as considered as what it does:
 *
 *  - it never produces, estimates or implies a figure. It gathers enough for a
 *    real conversation and says so in plain words on the final screen;
 *  - it does not ask for anything it does not need. Only name, email and
 *    consent are required — weight, carat and photographs are all optional,
 *    because a visitor who does not know them is exactly the visitor this
 *    business is for;
 *  - no CAPTCHA. A honeypot field and a submit-timing check stop scripted
 *    posts, and cost a genuine visitor nothing — no puzzle, no third-party
 *    script, no accessibility barrier.
 *
 * Accessibility carried equal weight to layout: one `<fieldset>` per step with
 * a real `<legend>`, an error summary that moves focus and links to the field,
 * `aria-invalid` and `aria-describedby` wired to every message, live-region
 * announcements for step changes and submission state, and a progress
 * indicator marked decorative because the same information is in the legend.
 */

type FormState = Partial<ValuationInput>;
type Errors = Partial<Record<keyof ValuationInput, string>>;

type Attachment = {
  id: string;
  file: File;
  previewUrl: string;
};

const initialState: FormState = {
  preferredContact: 'either',
  appointmentType: 'unsure',
  condition: 'unknown',
};

/**
 * `useSearchParams` opts a component into client-side rendering, which would
 * otherwise force the whole static page to render dynamically. The Suspense
 * boundary keeps the page static and streams the form in.
 */
export function ValuationForm() {
  return (
    <Suspense fallback={<FormShell />}>
      <ValuationFormInner />
    </Suspense>
  );
}

/** Matches the real form's frame so there is no layout shift when it arrives. */
function FormShell() {
  return (
    <div className="inset-panel min-h-[34rem] p-7 sm:p-9 lg:p-12" aria-hidden="true">
      <div className="h-px w-full bg-gold-antique/18" />
    </div>
  );
}

function ValuationFormInner() {
  const uid = useId();
  const searchParams = useSearchParams();

  /**
   * Service panels link here with the item type already chosen — clicking
   * "Enquire About Bullion Exchange" should not then ask what you have. The
   * value is validated against the allowed set rather than trusted, so a
   * hand-edited URL cannot inject an arbitrary string into the enquiry.
   */
  const prefilled = useMemo<FormState>(() => {
    const item = searchParams.get('item');
    const appointment = searchParams.get('appointment');

    return {
      ...initialState,
      ...(ITEM_TYPES.some((t) => t.value === item)
        ? { itemType: item as ValuationInput['itemType'] }
        : {}),
      ...(APPOINTMENT_TYPES.some((t) => t.value === appointment)
        ? { appointmentType: appointment as ValuationInput['appointmentType'] }
        : {}),
    };
  }, [searchParams]);

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<FormState>(prefilled);
  const [errors, setErrors] = useState<Errors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const mountedAt = useRef(Date.now());
  const summaryRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLLegendElement>(null);
  const step = STEPS[stepIndex];

  /* ---------------------------------------------------------------- */
  /* VALIDATION                                                        */
  /* ---------------------------------------------------------------- */

  const allErrors = useMemo<Errors>(() => {
    const result = valuationSchema.safeParse(data);
    if (result.success) return {};

    const flat = result.error.flatten().fieldErrors;
    const out: Errors = {};
    for (const [key, messages] of Object.entries(flat)) {
      if (messages?.[0]) out[key as keyof ValuationInput] = messages[0];
    }
    return out;
  }, [data]);

  const stepErrors = useMemo<Errors>(() => {
    const fields = STEP_FIELDS[step.id as StepId];
    const out: Errors = {};
    for (const field of fields) {
      if (allErrors[field]) out[field] = allErrors[field];
    }
    return out;
  }, [allErrors, step.id]);

  const set = useCallback(<K extends keyof ValuationInput>(key: K, value: ValuationInput[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ---------------------------------------------------------------- */
  /* NAVIGATION                                                        */
  /* ---------------------------------------------------------------- */

  const goNext = useCallback(() => {
    if (Object.keys(stepErrors).length > 0) {
      setShowErrors(true);
      setErrors(stepErrors);
      // Move focus to the summary so the problem is announced rather than
      // silently rendered somewhere below the fold.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setShowErrors(false);
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [stepErrors]);

  const goBack = useCallback(() => {
    setShowErrors(false);
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Focus the new step's legend so a screen reader hears where it has arrived.
  useEffect(() => {
    if (status === 'sent') return;
    legendRef.current?.focus();
  }, [stepIndex, status]);

  /* ---------------------------------------------------------------- */
  /* FILES                                                             */
  /* ---------------------------------------------------------------- */

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      setFileError(null);

      setAttachments((prev) => {
        const next = [...prev];

        for (const file of Array.from(list)) {
          if (next.length >= UPLOAD_LIMITS.maxFiles) {
            setFileError(`You can attach up to ${UPLOAD_LIMITS.maxFiles} images.`);
            break;
          }

          const problem = describeFileError(file);
          if (problem) {
            setFileError(problem);
            continue;
          }

          if (next.some((a) => a.file.name === file.name && a.file.size === file.size)) continue;

          next.push({
            id: `${file.name}-${file.size}-${next.length}`,
            file,
            previewUrl: URL.createObjectURL(file),
          });
        }

        return next;
      });
    },
    [],
  );

  const removeFile = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Object URLs are a real leak if left dangling.
  useEffect(
    () => () => {
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* ---------------------------------------------------------------- */
  /* SUBMIT                                                            */
  /* ---------------------------------------------------------------- */

  const submit = useCallback(() => {
    if (Object.keys(allErrors).length > 0) {
      setShowErrors(true);
      setErrors(allErrors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus('sending');
    setServerError(null);
    setUploadPercent(0);

    const body = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) body.append(key, String(value));
    }
    body.append('website', ''); // honeypot, always empty for a real visitor
    body.append('elapsedMs', String(Date.now() - mountedAt.current));
    attachments.forEach((a) => body.append('images', a.file, a.file.name));

    // XHR rather than fetch: fetch still cannot report upload progress, and a
    // visitor attaching several photographs on a phone connection deserves to
    // see that something is happening.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/valuation');
    xhr.responseType = 'json';
    xhr.timeout = 60_000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadPercent(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const payload = xhr.response as { ok?: boolean; reference?: string; error?: string } | null;

      if (xhr.status === 200 && payload?.ok) {
        setReference(payload.reference ?? null);
        setStatus('sent');
        return;
      }

      setServerError(
        payload?.error ?? 'Your enquiry could not be sent. Please try again, or contact us directly.',
      );
      setStatus('error');
    };

    xhr.onerror = () => {
      setServerError(
        'Your enquiry could not be sent — the connection failed. Please check your network and try again.',
      );
      setStatus('error');
    };

    xhr.ontimeout = () => {
      setServerError('Your enquiry took too long to send. Please try again.');
      setStatus('error');
    };

    xhr.send(body);
  }, [allErrors, data, attachments]);

  /* ---------------------------------------------------------------- */
  /* SUCCESS                                                           */
  /* ---------------------------------------------------------------- */

  if (status === 'sent') {
    return (
      <div className="inset-panel p-9 lg:p-14" role="status" aria-live="polite">
        <p className="label mb-7">Enquiry received</p>

        <h2 className="font-display text-4xl font-normal text-ivory lg:text-5xl">
          Thank you — your details are with us.
        </h2>

        {reference ? (
          <div className="mt-9 inline-flex flex-col gap-2 border border-gold-antique/35 bg-gold-antique/6 px-7 py-5">
            <span className="label-ash text-[0.58rem]">Your reference</span>
            <span className="font-display text-2xl tracking-[0.16em] text-gold-pale tabular-nums">
              {reference}
            </span>
          </div>
        ) : null}

        <div className="mt-9 max-w-xl space-y-4 text-lead text-ivory/72">
          <p>
            Quote this reference if you contact us about your enquiry. Please keep it — it is not
            sent to you automatically.
          </p>
          <p className="text-sm text-ash">
            This is an enquiry, not a valuation. Nothing here is an offer, a quotation or an
            estimate, and no figure has been calculated. A valuation can only be established once
            the item has been weighed and examined by Pureweight.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className="btn-primary">
            <span className="relative z-10">Return Home</span>
          </Link>
          <Link href="/contact" className="btn-ghost">
            Contact Pureweight
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* FORM                                                              */
  /* ---------------------------------------------------------------- */

  const errorList = Object.entries(showErrors ? errors : {}).filter(([, message]) => message);
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <form
      className="inset-panel p-7 sm:p-9 lg:p-12"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (isLast) submit();
        else goNext();
      }}
      onKeyDown={(event) => {
        // Enter advances rather than submitting from step one — but never from
        // inside a textarea, where Enter means a new line.
        if (
          event.key === 'Enter' &&
          !isLast &&
          (event.target as HTMLElement).tagName !== 'TEXTAREA'
        ) {
          event.preventDefault();
          goNext();
        }
      }}
    >
      {/* --- Progress -------------------------------------------------- */}
      <div className="mb-10">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <p className="label">
            Step {String(stepIndex + 1).padStart(2, '0')} of {String(STEPS.length).padStart(2, '0')}
          </p>
          <p className="text-[0.62rem] tracking-[0.2em] text-ash uppercase">{step.title}</p>
        </div>

        {/* The beam again: it levels as the enquiry completes. */}
        <div className="relative h-px w-full bg-gold-antique/18" aria-hidden="true">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-gold-antique to-gold-high transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
          <div
            className="absolute -bottom-[5px] h-0 w-0 border-x-4 border-t-6 border-x-transparent border-t-gold-antique/60 transition-[left] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ left: `calc(${((stepIndex + 1) / STEPS.length) * 100}% - 4px)` }}
          />
        </div>
      </div>

      {/* --- Error summary -------------------------------------------- */}
      {errorList.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-8 border border-[#c45c3e]/55 bg-[#c45c3e]/8 p-5"
        >
          <p className="text-[0.7rem] font-medium tracking-[0.18em] text-[#e08a6c] uppercase">
            Please check the following
          </p>
          <ul className="mt-3 space-y-1.5">
            {errorList.map(([field, message]) => (
              <li key={field}>
                <a href={`#${uid}-${field}`} className="text-sm text-[#e5a68c] underline">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {serverError ? (
        <div role="alert" className="mb-8 border border-[#c45c3e]/55 bg-[#c45c3e]/8 p-5">
          <p className="text-sm text-[#e5a68c]">{serverError}</p>
        </div>
      ) : null}

      {/* --- Steps ----------------------------------------------------- */}
      <fieldset className="border-0 p-0" disabled={status === 'sending'}>
        <legend
          ref={legendRef}
          tabIndex={-1}
          className="mb-8 font-display text-3xl font-normal text-ivory outline-none lg:text-4xl"
        >
          {step.legend}
        </legend>

        {step.id === 'item' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ITEM_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                id={option.value === ITEM_TYPES[0].value ? `${uid}-itemType` : undefined}
                aria-pressed={data.itemType === option.value}
                onClick={() => set('itemType', option.value)}
                className="option-tile"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-ash">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step.id === 'details' ? (
          <div className="space-y-7">
            <p className="text-sm leading-relaxed text-ash">
              Every field here is optional. If you do not know the weight or the carat, leave it
              blank — establishing those is our job, not yours.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                uid={uid}
                name="approxWeight"
                label="Approximate weight"
                hint="Grams or troy ounces, if known"
                value={data.approxWeight ?? ''}
                onChange={(v) => set('approxWeight', v)}
                error={showErrors ? errors.approxWeight : undefined}
              />
              <Field
                uid={uid}
                name="purity"
                label="Hallmark or purity"
                hint="For example 9ct, 18ct, 916, 999"
                value={data.purity ?? ''}
                onChange={(v) => set('purity', v)}
                error={showErrors ? errors.purity : undefined}
              />
              <Field
                uid={uid}
                name="quantity"
                label="Number of items"
                hint="An estimate is fine"
                value={data.quantity ?? ''}
                onChange={(v) => set('quantity', v)}
                error={showErrors ? errors.quantity : undefined}
              />

              <div>
                <label htmlFor={`${uid}-condition`} className="label-ash mb-2.5 block text-[0.6rem]">
                  Condition
                </label>
                <select
                  id={`${uid}-condition`}
                  className="field"
                  value={data.condition ?? 'unknown'}
                  onChange={(e) => set('condition', e.target.value as ValuationInput['condition'])}
                >
                  {CONDITIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-char">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={`${uid}-notes`} className="label-ash mb-2.5 block text-[0.6rem]">
                Anything else we should know
              </label>
              <textarea
                id={`${uid}-notes`}
                rows={5}
                className="field resize-y"
                placeholder="Inherited pieces, previous repairs, stones still set, or anything you would like handled carefully."
                value={data.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
                aria-describedby={`${uid}-notes-count`}
              />
              <p id={`${uid}-notes-count`} className="mt-2 text-xs text-ash">
                {(data.notes ?? '').length} / 2,000 characters
              </p>
            </div>
          </div>
        ) : null}

        {step.id === 'images' ? (
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-ash">
              Photographs are optional and often help. A clear shot of any hallmark — usually inside
              a band or on a clasp — is the single most useful image you can send.
            </p>

            <label
              htmlFor={`${uid}-images`}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-gold-antique/35 bg-void/45 px-6 py-12 text-center transition-colors duration-300 hover:border-gold-antique/70 hover:bg-gold-antique/5"
            >
              {/* SVG rather than a "+" glyph: a fullwidth plus renders at CJK
                  width in Latin fonts and its weight varies by platform. An
                  inline path is identical everywhere and scales with the box. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6 text-gold-antique"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-sm text-ivory/80">Choose images</span>
              <span className="text-xs text-ash">
                {UPLOAD_LIMITS.acceptLabel} · up to {UPLOAD_LIMITS.maxFiles} images · 8 MB each
              </span>
            </label>

            <input
              id={`${uid}-images`}
              type="file"
              multiple
              accept={UPLOAD_LIMITS.accept.join(',')}
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {fileError ? (
              <p role="alert" className="text-sm text-[#e5a68c]">
                {fileError}
              </p>
            ) : null}

            {attachments.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="group relative aspect-square overflow-hidden border border-gold-antique/22"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.previewUrl}
                      alt={`Preview of ${attachment.file.name}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(attachment.id)}
                      className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center bg-void/85 text-sm text-ivory transition-colors duration-200 hover:bg-void hover:text-gold-high"
                    >
                      <span className="sr-only">Remove {attachment.file.name}</span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-xs leading-relaxed text-ash">
              Images are sent with your enquiry and used only to help prepare for your appointment.
              Please do not include images containing documents or personal identification.
            </p>
          </div>
        ) : null}

        {step.id === 'contact' ? (
          <div className="space-y-7">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                uid={uid}
                name="fullName"
                label="Full name"
                required
                autoComplete="name"
                value={data.fullName ?? ''}
                onChange={(v) => set('fullName', v)}
                error={showErrors ? errors.fullName : undefined}
              />
              <Field
                uid={uid}
                name="email"
                type="email"
                label="Email address"
                required
                autoComplete="email"
                inputMode="email"
                value={data.email ?? ''}
                onChange={(v) => set('email', v)}
                error={showErrors ? errors.email : undefined}
              />
              <Field
                uid={uid}
                name="phone"
                type="tel"
                label="Telephone"
                hint="Optional"
                autoComplete="tel"
                inputMode="tel"
                value={data.phone ?? ''}
                onChange={(v) => set('phone', v)}
                error={showErrors ? errors.phone : undefined}
              />

              <div>
                <span className="label-ash mb-2.5 block text-[0.6rem]">Preferred contact</span>
                <div className="flex gap-2">
                  {CONTACT_METHODS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={data.preferredContact === option.value}
                      onClick={() => set('preferredContact', option.value)}
                      className="option-tile min-h-[48px] flex-1 justify-center text-center text-sm"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Honeypot. Off-screen rather than display:none — some bots skip
                hidden inputs, but almost none skip visually-offset ones. */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
          </div>
        ) : null}

        {step.id === 'appointment' ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {APPOINTMENT_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  id={option.value === APPOINTMENT_TYPES[0].value ? `${uid}-appointmentType` : undefined}
                  aria-pressed={data.appointmentType === option.value}
                  onClick={() => set('appointmentType', option.value)}
                  className="option-tile"
                >
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {option.label}
                      {!option.confirmed ? (
                        <span className="text-[0.52rem] tracking-[0.14em] text-gold-antique uppercase">
                          pending
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-ash">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs leading-relaxed text-ash">
              Appointment types marked &ldquo;pending&rdquo; have not yet been confirmed as available
              by the business. Your preference is recorded and will be discussed when we reply.
            </p>
          </div>
        ) : null}

        {step.id === 'review' ? (
          <div className="space-y-8">
            <dl className="divide-y divide-gold-antique/12 border-y border-gold-antique/16">
              <Review label="Item type" value={labelFor(ITEM_TYPES, data.itemType)} />
              <Review label="Approximate weight" value={data.approxWeight} />
              <Review label="Hallmark or purity" value={data.purity} />
              <Review label="Number of items" value={data.quantity} />
              <Review label="Condition" value={labelFor(CONDITIONS, data.condition)} />
              <Review label="Notes" value={data.notes} />
              <Review label="Images attached" value={attachments.length ? String(attachments.length) : undefined} />
              <Review label="Name" value={data.fullName} />
              <Review label="Email" value={data.email} />
              <Review label="Telephone" value={data.phone} />
              <Review label="Preferred contact" value={labelFor(CONTACT_METHODS, data.preferredContact)} />
              <Review label="Appointment" value={labelFor(APPOINTMENT_TYPES, data.appointmentType)} />
            </dl>

            <div>
              <label
                htmlFor={`${uid}-consent`}
                className="flex cursor-pointer items-start gap-4 text-sm leading-relaxed text-ivory/80"
              >
                <input
                  id={`${uid}-consent`}
                  type="checkbox"
                  checked={data.consent === true}
                  onChange={(e) => set('consent', e.target.checked as true)}
                  aria-invalid={showErrors && Boolean(errors.consent)}
                  aria-describedby={showErrors && errors.consent ? `${uid}-consent-error` : undefined}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#b98220]"
                />
                <span>
                  I am happy for Pureweight to contact me about this enquiry using the details above,
                  and I have read the{' '}
                  <Link href="/legal/privacy" className="text-gold-antique underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {showErrors && errors.consent ? (
                <p id={`${uid}-consent-error`} className="mt-2 text-sm text-[#e5a68c]">
                  {errors.consent}
                </p>
              ) : null}
            </div>

            <div className="border border-gold-antique/22 bg-gold-antique/5 p-6">
              <p className="text-sm leading-relaxed text-ivory/78">
                Sending this enquiry does not produce a valuation, an offer or a quotation, and no
                figure is calculated from what you have entered. It begins a conversation. Any
                valuation is established by Pureweight after the item has been weighed and examined.
              </p>
            </div>
          </div>
        ) : null}
      </fieldset>

      {/* --- Actions --------------------------------------------------- */}
      <div className="mt-10 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0 || status === 'sending'}
          className="btn-ghost disabled:pointer-events-none disabled:opacity-35"
        >
          ← Back
        </button>

        <button type="submit" disabled={status === 'sending'} className="btn-primary w-full justify-center sm:w-auto">
          <span className="relative z-10">
            {status === 'sending'
              ? uploadPercent > 0 && uploadPercent < 100
                ? `Sending — ${uploadPercent}%`
                : 'Sending…'
              : isLast
                ? 'Send Enquiry'
                : 'Continue'}
          </span>
        </button>
      </div>

      {/* Live region for status that is not an error. */}
      <p className="sr-only" role="status" aria-live="polite">
        {status === 'sending' ? `Sending your enquiry. ${uploadPercent} per cent complete.` : ''}
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

function Field({
  uid,
  name,
  label,
  hint,
  value,
  onChange,
  error,
  type = 'text',
  required = false,
  autoComplete,
  inputMode,
}: {
  uid: string;
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
}) {
  const id = `${uid}-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <label htmlFor={id} className="label-ash mb-2.5 block text-[0.6rem]">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-gold-antique">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
      />

      {hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs text-ash">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-[#e5a68c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Review({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4">
      <dt className="text-[0.66rem] tracking-[0.16em] text-ash uppercase">{label}</dt>
      <dd className="text-sm text-ivory/85 sm:col-span-2">
        {value ? value : <span className="text-ash">Not provided</span>}
      </dd>
    </div>
  );
}

function labelFor(
  options: readonly { value: string; label: string }[],
  value?: string,
): string | undefined {
  if (!value) return undefined;
  return options.find((option) => option.value === value)?.label;
}
