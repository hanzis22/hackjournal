/**
 * Server-side & client-side HTML sanitization using isomorphic-dompurify.
 * Works in both Node.js (API routes) and browser (React components).
 * 
 * SEC-02: Robust sanitization to prevent XSS attacks.
 */
import DOMPurify from 'isomorphic-dompurify'

// ─── Allowed tags & attributes for writeup HTML content ──────────────────────

const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Code
  'pre', 'code',
  // Lists
  'ul', 'ol', 'li',
  // Structure
  'blockquote', 'hr', 'div', 'span',
  // Media
  'img', 'a',
  // Table
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
]

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'target', 'rel',
  'class', 'style', 'spellcheck',
  'colspan', 'rowspan',
  'width', 'height',
]

/**
 * Sanitize HTML content — allows safe formatting tags, blocks XSS vectors.
 * Use for rich-text content fields (writeup content, CVE descriptions, etc.)
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Force safe link targets
    ADD_ATTR: ['target'],
    // Block dangerous URI schemes in href/src
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/**
 * Strip ALL HTML — returns plain text only.
 * Use for fields that should never contain HTML (titles, names, tags, etc.)
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Sanitize HTML for PDF export (same rules, consistent output)
 */
export function sanitizeForPdf(dirty: string): string {
  return sanitizeHtml(dirty)
}
