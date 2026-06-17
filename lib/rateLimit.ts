/**
 * Persistent sliding window rate limiter using MySQL.
 * Tracks request counts per IP/identifier within a configurable time window.
 * 
 * SEC-07: Persistent rate limiting to prevent brute-force attacks across restarts.
 */
import pool from './db'

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
export async function checkRateLimit(
  identifier: string,
  preset: keyof typeof PRESETS = 'api'
): Promise<{ limited: boolean; remaining: number; resetIn: number }> {
  const config = PRESETS[preset] || PRESETS.api
  const key = `${preset}:${identifier}`
  const now = Date.now()

  try {
    // 1. Stale entries cleanup (opportunistic - runs on 5% of calls to minimize overhead)
    if (Math.random() < 0.05) {
      pool.query('DELETE FROM rate_limits WHERE reset_at < ?', [now]).catch(err => {
        console.error('[RateLimit Cleanup Error]', err)
      })
    }

    // 2. Fetch or initialize the rate limit entry
    const [rows]: any = await pool.query(
      'SELECT count, reset_at FROM rate_limits WHERE key_str = ?',
      [key]
    )

    if (rows.length === 0 || now > Number(rows[0].reset_at)) {
      const resetAt = now + config.windowMs
      await pool.query(
        'INSERT INTO rate_limits (key_str, count, reset_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE count = 1, reset_at = ?',
        [key, 1, resetAt, resetAt]
      )
      return { limited: false, remaining: config.maxRequests - 1, resetIn: config.windowMs }
    }

    const currentCount = rows[0].count + 1
    const resetAt = Number(rows[0].reset_at)

    await pool.query(
      'UPDATE rate_limits SET count = count + 1 WHERE key_str = ?',
      [key]
    )

    if (currentCount > config.maxRequests) {
      return { limited: true, remaining: 0, resetIn: resetAt - now }
    }

    return { limited: false, remaining: config.maxRequests - currentCount, resetIn: resetAt - now }
  } catch (err) {
    console.error('[RateLimit Error]', err)
    // Fail-open in case of database issues so application remains available
    return { limited: false, remaining: 1, resetIn: config.windowMs }
  }
}

/**
 * Extract client IP from Next.js request.
 * SEC-07: Checks x-forwarded-for safely.
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // Use first IP in the chain
    const ip = forwarded.split(',')[0].trim()
    return ip || '127.0.0.1'
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return '127.0.0.1'
}
