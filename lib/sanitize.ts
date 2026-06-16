/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe formatting while blocking dangerous elements.
 * Built using browser-native DOMParser to avoid external dependency bundle weight and installation issues.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''

  // Browser-side sanitization using DOMParser
  if (typeof window !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(dirty, 'text/html')
      
      const ALLOWED_TAGS = new Set([
        // Text formatting
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
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
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ])
      
      const ALLOWED_ATTR = new Set([
        'href', 'src', 'alt', 'title', 'target', 'rel',
        'class', 'style', 'spellcheck',
        'colspan', 'rowspan',
        'width', 'height',
      ])

      const cleanNode = (node: Node) => {
        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const el = node as HTMLElement
          const tagName = el.tagName.toLowerCase()
          
          if (!ALLOWED_TAGS.has(tagName)) {
            // Unpack allowed children but remove the container if tag is not allowed, or just remove
            el.parentNode?.removeChild(el)
            return
          }
          
          // Remove attributes that are not on the allowlist or start with 'on'
          const attrs = Array.from(el.attributes)
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase()
            if (!ALLOWED_ATTR.has(attrName) || attrName.startsWith('on')) {
              el.removeAttribute(attr.name)
            }
          }
          
          // Process children
          const children = Array.from(el.childNodes)
          for (const child of children) {
            cleanNode(child)
          }
        }
      }

      // Clean all body children
      const bodyChildren = Array.from(doc.body.childNodes)
      for (const child of bodyChildren) {
        cleanNode(child)
      }
      
      return doc.body.innerHTML
    } catch (e) {
      console.error('DOMParser sanitization failed, using regex fallback:', e)
    }
  }

  // Server-side fallback or backup: strip known dangerous elements
  return dirty
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?\/?>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
}

/**
 * Sanitize HTML for PDF export (more permissive styles)
 */
export function sanitizeForPdf(dirty: string): string {
  return sanitizeHtml(dirty)
}

