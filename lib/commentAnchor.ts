/**
 * Fuzzy text matcher for inline comments.
 * Scans markdown source for the exact anchor quote, falling back to prefix/suffix context or word similarity.
 * Returns { is_orphaned: boolean, matched_index?: number }
 */
export function matchCommentAnchor(
  content: string,
  quote: string | null,
  prefix: string | null,
  suffix: string | null
): { is_orphaned: boolean; matched_index?: number } {
  if (!quote || !quote.trim()) {
    return { is_orphaned: false }; // Not an inline comment
  }

  const normalizedContent = content.trim();
  const normalizedQuote = quote.trim();

  // 1. Exact match
  const exactIndex = normalizedContent.indexOf(normalizedQuote);
  if (exactIndex !== -1) {
    return { is_orphaned: false, matched_index: exactIndex };
  }

  // 2. Exact match with context prefix & suffix
  const cleanPrefix = (prefix || '').trim();
  const cleanSuffix = (suffix || '').trim();

  if (cleanPrefix || cleanSuffix) {
    // Try prefix + quote + suffix
    const fullPattern = `${cleanPrefix}${normalizedQuote}${cleanSuffix}`;
    const fullIndex = normalizedContent.indexOf(fullPattern);
    if (fullIndex !== -1) {
      return { is_orphaned: false, matched_index: fullIndex + cleanPrefix.length };
    }

    // Try prefix + quote
    if (cleanPrefix) {
      const prefixPattern = `${cleanPrefix}${normalizedQuote}`;
      const prefixIndex = normalizedContent.indexOf(prefixPattern);
      if (prefixIndex !== -1) {
        return { is_orphaned: false, matched_index: prefixIndex + cleanPrefix.length };
      }
    }

    // Try quote + suffix
    if (cleanSuffix) {
      const suffixPattern = `${normalizedQuote}${cleanSuffix}`;
      const suffixIndex = normalizedContent.indexOf(suffixPattern);
      if (suffixIndex !== -1) {
        return { is_orphaned: false, matched_index: suffixIndex };
      }
    }
  }

  // 3. Fallback: Word similarity match (if >50% of words match in a local block)
  // Let's split quote into words
  const words = normalizedQuote.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const lines = normalizedContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      let matchCount = 0;
      for (const w of words) {
        if (lineLower.includes(w)) {
          matchCount++;
        }
      }
      if (matchCount / words.length > 0.6) {
        // High word similarity match found on this line
        return { is_orphaned: false, matched_index: normalizedContent.indexOf(lines[i]) };
      }
    }
  }

  // If untraceable
  return { is_orphaned: true };
}
