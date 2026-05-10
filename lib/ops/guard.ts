import { headers } from 'next/headers'

/**
 * Localhost-only gate for ops routes/pages.
 * Returns true if the request originated from localhost OR we're in dev mode.
 * Production deployments (Vercel) will get a 404-equivalent — caller should `notFound()`.
 */
export function isLocalRequest(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  try {
    const h = headers()
    const host = h.get('host') || ''
    return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  } catch {
    // Outside a request context (e.g. build-time) — treat as non-local.
    return false
  }
}
