import type { NextConfig } from 'next'

/**
 * SEC-08: Security Headers
 * Applied to all routes via Next.js headers() config.
 */
const securityHeaders = [
  {
    // Prevent MIME-type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Prevent clickjacking — deny all framing
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Legacy XSS filter (still useful for older browsers)
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Control referrer information leakage
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // HSTS — force HTTPS for 1 year including subdomains
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    // Disable browser features we don't need
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Content Security Policy
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  experimental: {},
  async headers() {
    return [
      {
        // Apply security headers to ALL routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
