import {
  CLAUDE_API_KEY,
  CLAUDE_API_URL,
  CLAUDE_API_VERSION,
  CLAUDE_MAX_TOKENS,
  CLAUDE_MODEL,
  CLAUDE_REQUEST_TIMEOUT_MS,
} from '../config/constants';

export type Severity = 'high' | 'medium' | 'low';

export interface ClauseFlag {
  id: string;
  title: string;
  severity: Severity;
  excerpt: string;
  explanation: string;
  suggestion: string;
}

export interface AgreementAnalysis {
  score: number;
  summary: string;
  flags: ClauseFlag[];
  legalContext: string;
  recommendation: string;
}

export interface AgreementImage {
  /** Base64-encoded image data (no data URL prefix). */
  base64: string;
  /** Image MIME type, e.g. "image/jpeg" or "image/png". */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export class AgreementReviewError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AgreementReviewError';
    this.cause = cause;
  }
}

const SYSTEM_PROMPT = `You are RentShield, a careful rental-agreement reviewer specialising in
Karnataka, India tenancy practice and the Model Tenancy Act, 2021. You examine
photos of rental agreements (which may include scans, phone snapshots, or
multiple pages) and surface clauses that are unfair, illegal, or risky for the
tenant.

You always reply with a single JSON object - no markdown, no preamble, no
trailing commentary. The JSON must match this schema exactly:

{
  "score": number,            // overall fairness for the tenant, 0-100
  "summary": string,          // one short sentence headline
  "flags": [
    {
      "id": string,           // short kebab-case identifier
      "title": string,        // clause label, e.g. "Clause 7.3 - repairs"
      "severity": "high" | "medium" | "low",
      "excerpt": string,      // verbatim quote from the agreement
      "explanation": string,  // one plain-English sentence on why it is risky
      "suggestion": string    // one sentence on what to negotiate
    }
  ],
  "legalContext": string,     // 1-2 sentences on relevant Karnataka / MTA law
  "recommendation": string    // 1-2 sentences with the most important next step
}

Severity guide:
- high: legally problematic or grossly one-sided (e.g. excessive deposit,
  landlord can enter without notice, tenant pays structural repairs).
- medium: deviates from standard market practice (e.g. 6-month notice).
- low: standard but worth knowing (e.g. sub-letting restriction).

If the images are unreadable or do not contain a rental agreement, respond
with score 0, an empty flags array, and explain the issue inside summary.

Return JSON only.`;

const USER_INSTRUCTION = `Review the attached rental agreement page(s). Extract every clause that is
unfair, illegal under Karnataka rental practice, or otherwise risky for the
tenant, and return the structured JSON described in the system instructions.`;

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
  error?: { type?: string; message?: string };
}

// Module-init diagnostic: prints once when the bundle loads.
// eslint-disable-next-line no-console
console.log(
  '[ClaudeAPI] module loaded. key length=',
  CLAUDE_API_KEY?.length ?? -1,
  'prefix=',
  CLAUDE_API_KEY ? CLAUDE_API_KEY.slice(0, 14) : '(empty)',
);

export function isClaudeConfigured(): boolean {
  return typeof CLAUDE_API_KEY === 'string' && CLAUDE_API_KEY.trim().length > 0;
}

export async function analyzeAgreementImages(
  images: AgreementImage[],
  options: { signal?: AbortSignal } = {},
): Promise<AgreementAnalysis> {
  // Per-call diagnostic to confirm whether the constant survived the bundle.
  // eslint-disable-next-line no-console
  console.log(
    '[ClaudeAPI] analyze call. configured=',
    isClaudeConfigured(),
    'len=',
    CLAUDE_API_KEY?.length ?? -1,
  );
  if (!isClaudeConfigured()) {
    throw new AgreementReviewError(
      `Agreement review is temporarily unavailable. (key len ${
        CLAUDE_API_KEY?.length ?? -1
      })`,
    );
  }

  if (images.length === 0) {
    throw new AgreementReviewError(
      'Add at least one photo of the agreement before analysing.',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CLAUDE_REQUEST_TIMEOUT_MS,
  );

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else if (typeof options.signal.addEventListener === 'function') {
      const onAbort = () => controller.abort();
      options.signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((image) => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mimeType,
              data: image.base64,
            },
          })),
          {
            type: 'text',
            text: USER_INSTRUCTION,
          },
        ],
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': CLAUDE_API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as { name?: string }).name === 'AbortError') {
      throw new AgreementReviewError(
        'Analysis timed out. Try fewer or smaller images.',
        err,
      );
    }
    throw new AgreementReviewError(
      'Could not reach Claude. Check your internet connection.',
      err,
    );
  }
  clearTimeout(timeout);

  let data: ClaudeResponse;
  try {
    data = (await response.json()) as ClaudeResponse;
  } catch (err) {
    throw new AgreementReviewError(
      `Claude returned an unreadable response (HTTP ${response.status}).`,
      err,
    );
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || `HTTP ${response.status}`;
    throw new AgreementReviewError(`Claude error: ${apiMessage}`);
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim();

  if (!text) {
    throw new AgreementReviewError('Claude returned an empty response.');
  }

  return parseAnalysis(text);
}

function parseAnalysis(raw: string): AgreementAnalysis {
  const jsonText = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new AgreementReviewError(
      'Could not parse Claude response as JSON.',
      err,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AgreementReviewError('Claude response was not a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;
  const rawScore = Number(obj.score);
  const score = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : 0;

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const legalContext =
    typeof obj.legalContext === 'string' ? obj.legalContext.trim() : '';
  const recommendation =
    typeof obj.recommendation === 'string' ? obj.recommendation.trim() : '';

  const rawFlags = Array.isArray(obj.flags) ? obj.flags : [];
  const flags: ClauseFlag[] = rawFlags
    .map((entry, idx) => normalizeFlag(entry, idx))
    .filter((flag): flag is ClauseFlag => flag !== null);

  return { score, summary, flags, legalContext, recommendation };
}

function normalizeFlag(entry: unknown, index: number): ClauseFlag | null {
  if (!entry || typeof entry !== 'object') return null;
  const flag = entry as Record<string, unknown>;
  const title = typeof flag.title === 'string' ? flag.title.trim() : '';
  const explanation =
    typeof flag.explanation === 'string' ? flag.explanation.trim() : '';
  if (!title || !explanation) return null;

  const severityRaw =
    typeof flag.severity === 'string' ? flag.severity.toLowerCase() : 'low';
  const severity: Severity =
    severityRaw === 'high' || severityRaw === 'medium' ? severityRaw : 'low';

  const idRaw =
    typeof flag.id === 'string' && flag.id.trim()
      ? flag.id.trim()
      : `flag-${index + 1}`;

  return {
    id: idRaw,
    title,
    severity,
    excerpt: typeof flag.excerpt === 'string' ? flag.excerpt.trim() : '',
    explanation,
    suggestion:
      typeof flag.suggestion === 'string' ? flag.suggestion.trim() : '',
  };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  // Strip markdown code fences such as ```json ... ```
  const fencePattern = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const fenced = trimmed.match(fencePattern);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  // Otherwise try to slice from the first { to the matching last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}
