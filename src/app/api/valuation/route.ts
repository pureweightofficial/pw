import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  UPLOAD_LIMITS,
  describeFileError,
  valuationServerSchema,
} from '@/lib/valuation-schema';

/**
 * VALUATION ENQUIRY ENDPOINT
 *
 * ---------------------------------------------------------------------------
 * DELIVERY IS NOT CONFIGURED OUT OF THE BOX — AND THAT IS ENFORCED
 * ---------------------------------------------------------------------------
 * This handler validates, rate-limits and packages an enquiry, then hands it to
 * whatever delivery mechanism is configured. No email provider or database is
 * bundled, because the right choice depends on the client's stack.
 *
 * In PRODUCTION with no `VALUATION_WEBHOOK_URL` set, this endpoint returns 503
 * and tells the visitor to phone instead. It deliberately does NOT accept the
 * submission and show a success screen.
 *
 * That is the most important decision in this file. A form that reports success
 * while writing to a log nobody reads does not fail loudly — it fails silently,
 * and the person who loses out is someone who was about to bring in inherited
 * gold and now believes they are waiting for a callback that will never come.
 * Better a visible error and a phone number than a polite lie.
 *
 * To go live, set ONE of:
 *   VALUATION_WEBHOOK_URL   an endpoint that receives the enquiry JSON
 *                           (Zapier / Make / n8n / a CRM intake / your own API)
 *   — or replace `deliver()` with a direct provider call (Resend, Postmark, SES,
 *     a database write, etc.).
 * ---------------------------------------------------------------------------
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* RATE LIMITING                                                              */
/* -------------------------------------------------------------------------- */

/**
 * In-memory fixed-window limiter.
 *
 * Adequate for a single instance, which is what this site needs. On a
 * multi-instance or serverless deployment each instance keeps its own counter,
 * so move this to Redis/Upstash before scaling horizontally.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });

    // Opportunistic sweep so the map cannot grow without bound.
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/* -------------------------------------------------------------------------- */
/* REFERENCE                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A short, human-readable reference the visitor can quote on the phone.
 * Crockford-style alphabet: no I, L, O or U, so it cannot be misread or
 * misheard, and cannot accidentally spell anything.
 */
function buildReference(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `PW-${out.slice(0, 3)}-${out.slice(3)}`;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY                                                                   */
/* -------------------------------------------------------------------------- */

type Enquiry = Record<string, unknown>;

async function deliver(enquiry: Enquiry): Promise<boolean> {
  const webhook = process.env.VALUATION_WEBHOOK_URL;

  if (webhook) {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.VALUATION_WEBHOOK_SECRET
          ? { authorization: `Bearer ${process.env.VALUATION_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify(enquiry),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error('[pureweight] webhook rejected the enquiry', response.status);
      return false;
    }
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[pureweight] enquiry received (development — not delivered):', enquiry);
    return true;
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* HANDLER                                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  /* --- Rate limit ------------------------------------------------------ */
  const limit = rateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many enquiries have been sent from this connection. Please try again later.',
      },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  /* --- Parse ----------------------------------------------------------- */
  /**
   * Gate on Content-Length BEFORE parsing. `request.formData()` buffers the
   * entire body; without this check a single oversized POST is fully read into
   * memory before any of the per-file limits below ever run. The cap is the
   * upload budget plus generous form-field overhead. A missing Content-Length
   * (chunked encoding) is rejected too — no legitimate browser form submit
   * omits it.
   */
  const MAX_BODY_BYTES = UPLOAD_LIMITS.maxTotalBytes + 1024 * 1024;
  const declaredLength = Number(request.headers.get('content-length'));

  if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
    return NextResponse.json(
      { ok: false, error: 'That submission could not be read. Please try again.' },
      { status: 411 },
    );
  }

  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'The attached images total more than 24 MB. Please attach fewer.' },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'That submission could not be read. Please try again.' },
      { status: 400 },
    );
  }

  const raw = Object.fromEntries(
    Array.from(form.entries()).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;

  const parsed = valuationServerSchema.safeParse({
    ...raw,
    consent: raw.consent === 'true' || raw.consent === 'on',
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    // The two spam controls are never explained back to the caller — a bot
    // should not be told which check it failed.
    if (fieldErrors.website || fieldErrors.elapsedMs) {
      return NextResponse.json(
        { ok: false, error: 'That submission could not be accepted. Please try again.' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Please check the highlighted fields.', fieldErrors },
      { status: 422 },
    );
  }

  /* --- Files ----------------------------------------------------------- */
  const files = form.getAll('images').filter((entry): entry is File => entry instanceof File);

  if (files.length > UPLOAD_LIMITS.maxFiles) {
    return NextResponse.json(
      { ok: false, error: `Please attach no more than ${UPLOAD_LIMITS.maxFiles} images.` },
      { status: 413 },
    );
  }

  /**
   * The declared MIME type is client-controlled — a renamed executable arrives
   * announcing itself as image/jpeg. The first bytes are not: every accepted
   * format has a fixed signature, so each file's opening bytes are checked
   * against the signature its declared type promises.
   */
  const matchesMagic = async (file: File): Promise<boolean> => {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const at = (i: number, ...bytes: number[]) => bytes.every((b, j) => head[i + j] === b);

    switch (file.type) {
      case 'image/jpeg':
        return at(0, 0xff, 0xd8, 0xff);
      case 'image/png':
        return at(0, 0x89, 0x50, 0x4e, 0x47);
      case 'image/webp':
        // RIFF....WEBP
        return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
      case 'image/heic':
      case 'image/heif':
        // ....ftyp — brand varies (heic/heix/mif1...), the box type does not.
        return at(4, 0x66, 0x74, 0x79, 0x70);
      default:
        return false;
    }
  };

  let totalBytes = 0;
  for (const file of files) {
    const problem = describeFileError(file);
    if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 415 });

    if (!(await matchesMagic(file))) {
      return NextResponse.json(
        {
          ok: false,
          error: `“${file.name}” does not appear to be a valid image. Please re-save it and try again.`,
        },
        { status: 415 },
      );
    }

    totalBytes += file.size;
  }

  if (totalBytes > UPLOAD_LIMITS.maxTotalBytes) {
    return NextResponse.json(
      { ok: false, error: 'The attached images total more than 24 MB. Please attach fewer.' },
      { status: 413 },
    );
  }

  /* --- Package --------------------------------------------------------- */
  const reference = buildReference();

  /**
   * Image BYTES are intentionally not forwarded. Pushing several megabytes of
   * base64 through a generic webhook is fragile, and object storage has not
   * been chosen yet. Metadata travels so the business knows photographs exist
   * and can ask for them; wire up storage (S3/R2/UploadThing) and attach the
   * resulting URLs here when the client picks one.
   */
  const enquiry: Enquiry = {
    reference,
    receivedAt: new Date().toISOString(),
    item: {
      type: parsed.data.itemType,
      approxWeight: parsed.data.approxWeight || null,
      purity: parsed.data.purity || null,
      quantity: parsed.data.quantity || null,
      condition: parsed.data.condition || null,
      notes: parsed.data.notes || null,
    },
    contact: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      preferredContact: parsed.data.preferredContact,
    },
    appointment: { type: parsed.data.appointmentType },
    consent: { given: true, at: new Date().toISOString() },
    attachments: files.map((file) => ({
      name: file.name,
      type: file.type,
      bytes: file.size,
    })),
    meta: {
      userAgent: request.headers.get('user-agent') ?? null,
      source: 'website/request-a-valuation',
    },
  };

  /* --- Deliver --------------------------------------------------------- */
  let delivered = false;
  try {
    delivered = await deliver(enquiry);
  } catch (error) {
    console.error('[pureweight] delivery threw', error);
    delivered = false;
  }

  if (!delivered) {
    console.error(
      '[pureweight] ENQUIRY NOT DELIVERED — no VALUATION_WEBHOOK_URL configured. ' +
        'Reference %s was rejected rather than silently dropped.',
      reference,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not send your enquiry just now. Please contact us by telephone and we will take your details directly.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, reference }, { status: 200 });
}

/** Anything other than POST is not a thing this endpoint does. */
export async function GET() {
  return NextResponse.json({ ok: false, error: 'Method not allowed.' }, { status: 405 });
}
