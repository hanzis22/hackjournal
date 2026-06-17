/**
 * URL Validator — Anti-SSRF protection for webhook URLs.
 * Blocks requests to internal/private networks, localhost, cloud metadata endpoints, etc.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',   // GCP metadata
  'metadata.google',
])

const BLOCKED_TLDS = [
  '.local',
  '.internal',
  '.localhost',
  '.test',
  '.example',
  '.invalid',
]

/** Known trusted webhook platforms */
const PLATFORM_DOMAINS: Record<string, string[]> = {
  discord: ['discord.com', 'discordapp.com'],
  slack:   ['hooks.slack.com'],
  telegram: ['api.telegram.org'],
}

/**
 * Check if an IP address belongs to a private/reserved range.
 * Covers RFC 1918, loopback, link-local, AWS/GCP/Azure metadata IPs.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4 private/reserved ranges
  const ipv4Patterns = [
    /^127\./,                     // Loopback
    /^10\./,                      // Class A private
    /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
    /^192\.168\./,                // Class C private
    /^169\.254\./,                // Link-local (AWS metadata)
    /^0\./,                       // "This" network
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT
    /^198\.18\./,                 // Benchmarking
    /^198\.51\.100\./,            // Documentation (TEST-NET-2)
    /^203\.0\.113\./,             // Documentation (TEST-NET-3)
    /^224\./,                     // Multicast
    /^240\./,                     // Reserved
    /^255\.255\.255\.255$/,       // Broadcast
  ]

  for (const pattern of ipv4Patterns) {
    if (pattern.test(ip)) return true
  }

  // IPv6 private/reserved
  if (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) {
    return true
  }

  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (v4Mapped) {
    return isPrivateIp(v4Mapped[1])
  }

  return false
}

export interface WebhookUrlValidationResult {
  valid: boolean
  url?: URL
  error?: string
}

/**
 * Validate a webhook URL for safety.
 * Blocks SSRF vectors: private IPs, reserved hostnames, non-HTTPS (in production).
 */
export function validateWebhookUrl(
  rawUrl: string,
  platform?: string
): WebhookUrlValidationResult {
  // 1. Basic parse
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { valid: false, error: 'URL tidak valid' }
  }

  // 2. Protocol check — only HTTPS in production, allow HTTP in dev
  const isProduction = process.env.NODE_ENV === 'production'
  const allowedProtocols = isProduction ? ['https:'] : ['https:', 'http:']

  if (!allowedProtocols.includes(url.protocol)) {
    return {
      valid: false,
      error: isProduction
        ? 'Hanya URL HTTPS yang diizinkan'
        : 'Hanya URL HTTP/HTTPS yang diizinkan'
    }
  }

  // 3. Block known bad hostnames
  const hostname = url.hostname.toLowerCase()

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: 'URL mengarah ke alamat yang diblokir' }
  }

  // 4. Block reserved TLDs
  for (const tld of BLOCKED_TLDS) {
    if (hostname.endsWith(tld)) {
      return { valid: false, error: 'URL mengarah ke domain internal yang diblokir' }
    }
  }

  // 5. Block private/reserved IPs (including raw IP hostnames)
  if (isPrivateIp(hostname)) {
    return { valid: false, error: 'URL mengarah ke IP private/internal yang diblokir' }
  }

  // 6. Block numeric IPs directly (extra protection — attackers often use raw IPs)
  //    Allow only if it's a known non-private IP. Safest approach: block all raw IPs.
  const isRawIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')
  if (isRawIp) {
    return { valid: false, error: 'URL tidak boleh menggunakan alamat IP langsung. Gunakan domain name.' }
  }

  // 7. Platform-specific domain validation
  if (platform && platform !== 'custom' && PLATFORM_DOMAINS[platform]) {
    const allowedDomains = PLATFORM_DOMAINS[platform]
    const matchesPlatform = allowedDomains.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    )
    if (!matchesPlatform) {
      return {
        valid: false,
        error: `URL untuk platform "${platform}" harus menggunakan domain: ${allowedDomains.join(', ')}`
      }
    }
  }

  // 8. Block URLs with credentials (user:pass@host)
  if (url.username || url.password) {
    return { valid: false, error: 'URL tidak boleh mengandung credentials' }
  }

  return { valid: true, url }
}
