/**
 * Single source of truth for the api-server base URL.
 *
 * Resolution order:
 * 1. EXPO_PUBLIC_API_URL — explicit override (Repl Secret / .env).
 * 2. EXPO_PUBLIC_DOMAIN — the Replit dev domain the standard dev script always
 *    passes in. The api-server listens on the Repl's public web port, so
 *    `https://<domain>` reaches it. This keeps the app working even when the
 *    EXPO_PUBLIC_API_URL secret is missing (it has been dropped between Repl
 *    sessions more than once).
 *
 * Empty string means "not configured" — callers gate on isApiConfigured().
 */
const explicit = process.env.EXPO_PUBLIC_API_URL ?? '';
const domain = process.env.EXPO_PUBLIC_DOMAIN ?? '';

export const API_BASE = (explicit || (domain ? `https://${domain}` : '')).replace(/\/+$/, '');

export function isApiConfigured(): boolean {
  return Boolean(API_BASE);
}

/**
 * Hermes-safe request timeout (React Native has no AbortSignal.timeout).
 * The timer isn't cleared on success — aborting an already-settled fetch is a
 * harmless no-op, and this keeps every call site to a one-line change.
 */
export function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
