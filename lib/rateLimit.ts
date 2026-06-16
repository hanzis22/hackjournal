/**
 * In-memory sliding window rate limiter.
 * Tracks request counts per IP within a configurable time window.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const PRESETS: Record<string, RateLimitConfig> = {
  login:    { maxRequests: 5,  windowMs: 60 * 1000 },       // 5 per minute
  register: { maxRequests: 3,  windowMs: 60 * 60 * 1000 },  // 3 per hour
  api:      { maxRequests: 60, windowMs: 60 * 1000 },        // 60 per minute
  upload:   { maxRequests: 10, windowMs: 60 * 1000 },        // 10 per minute
}

/**
 * Check if request should be rate limited.
 * Returns { limited: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
  identifier: string,
  preset: keyof typeof PRESETS = 'api'
): { limited: boolean; remaining: number; resetIn: number } {
  const config = PRESETS[preset] || PRESETS.api
  const key = `${preset}:${identifier}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { limited: false, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    return { limited: true, remaining: 0, resetIn: entry.resetAt - now }
  }

  return { limited: false, remaining: config.maxRequests - entry.count, resetIn: entry.resetAt - now }
}

/**
 * Extract client IP from Next.js request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return '127.0.0.1'
}
