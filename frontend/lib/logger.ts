// ─── Centralized logger ─────────────────────────────────────────────────────
//   In DEV: forwards to console.* with structured tags.
//   In PROD: silent (no-op).
//   404 expected (ExpectedNotFoundError) → silently ignored.

const ENABLED =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production';

// ── Error classes ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ExpectedNotFoundError extends ApiError {
  constructor(msg = 'Not found') {
    super(msg, 404);
    this.name = 'ExpectedNotFoundError';
  }
}

// ── Logger ──────────────────────────────────────────────────────────────────

function isExpectedNotFound(e: unknown): boolean {
  return e instanceof ExpectedNotFoundError;
}

function formatArgs(tag: string, ...args: unknown[]): unknown[] {
  return [`[${tag}]`, ...args];
}

export const logger = {
  error(tag: string, ...args: unknown[]) {
    if (!ENABLED) return;
    const err = args.find((a) => a instanceof Error);
    if (err && isExpectedNotFound(err)) return; // silent
    // eslint-disable-next-line no-console
    console.error(...formatArgs(tag, ...args));
  },

  warn(tag: string, ...args: unknown[]) {
    if (!ENABLED) return;
    // eslint-disable-next-line no-console
    console.warn(...formatArgs(tag, ...args));
  },

  info(tag: string, ...args: unknown[]) {
    if (!ENABLED) return;
    // eslint-disable-next-line no-console
    console.info(...formatArgs(tag, ...args));
  },

  debug(tag: string, ...args: unknown[]) {
    if (!ENABLED) return;
    // eslint-disable-next-line no-console
    console.debug(...formatArgs(tag, ...args));
  },
};

// ── safeApi — try/catch wrapper with ExpectedNotFoundError filtering ─────────

export async function safeApi<T>(
  fn: () => Promise<T>,
  fallback: T,
  tag = 'api'
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isExpectedNotFound(e)) {
      // 404 expected → silent fallback
      return fallback;
    }
    if (e instanceof ApiError) {
      logger.error(tag, `${e.message} (status=${e.status})`);
    } else {
      logger.error(tag, e);
    }
    return fallback;
  }
}
