'use client'
import React, { useEffect, useState } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'
import TerminalViewer from './TerminalViewer'

interface WriteupContentRendererProps {
  writeup: any
  isPublicShare?: boolean
}

export default function WriteupContentRenderer({ writeup, isPublicShare = false }: WriteupContentRendererProps) {
  const [mounted, setMounted] = useState(false)
  const [domElements, setDomElements] = useState<React.ReactNode[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  const isCve = writeup.writeup_mode === 'cve'

  // Severity configurations
  const sevColor: Record<string, string> = {
    Critical: 'var(--purple-400)',
    High: 'var(--red)',
    Medium: 'var(--amber)',
    Low: 'var(--green)',
    None: 'var(--text2)',
  }

  const sevBg: Record<string, string> = {
    Critical: 'rgba(175,169,236,0.12)',
    High: 'rgba(255,69,96,0.12)',
    Medium: 'rgba(240,165,0,0.12)',
    Low: 'rgba(57,255,20,0.12)',
    None: 'var(--bg3)',
  }

  // Parse attack chain
  let attackChain: any[] = []
  if (writeup.attack_chain) {
    try {
      attackChain = typeof writeup.attack_chain === 'string' ? JSON.parse(writeup.attack_chain) : writeup.attack_chain
    } catch {
      attackChain = []
    }
  }

  // Converts a sanitized HTML string into a React element tree
  const parseHtmlToReact = (htmlStr: string): React.ReactNode[] => {
    if (!htmlStr) return []
    if (typeof window === 'undefined') {
      // Server-side simple rendering fallback
      return [<div key="fallback" dangerouslySetInnerHTML={{ __html: htmlStr }} />]
    }

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlStr, 'text/html')
      return Array.from(doc.body.childNodes).map((node, index) => domToReact(node, `${index}`))
    } catch (err) {
      console.error('Failed to parse HTML to React:', err)
      return [<div key="error" dangerouslySetInnerHTML={{ __html: htmlStr }} />]
    }
  }

  // Recursive DOM Node to React element converter
  const domToReact = (node: Node, key: string): React.ReactNode => {
    if (node.nodeType === 3) { // Text Node
      return node.textContent
    }

    if (node.nodeType === 1) { // Element Node
      const el = node as HTMLElement
      const tagName = el.tagName.toLowerCase()

      // Extract attributes
      const attribs: Record<string, any> = { key }
      Array.from(el.attributes).forEach(attr => {
        // Convert class to className
        if (attr.name === 'class') {
          attribs.className = attr.value
        } else if (attr.name === 'style') {
          // Style parsing helper (simple inline style mapping)
          const styleObj: Record<string, string> = {}
          attr.value.split(';').forEach(rule => {
            const [p, v] = rule.split(':')
            if (p && v) {
              const camelProp = p.trim().replace(/-./g, x => x[1].toUpperCase())
              styleObj[camelProp] = v.trim()
            }
          })
          attribs.style = styleObj
        } else {
          attribs[attr.name] = attr.value
        }
      })

      // Check if it's a code block (pre)
      if (tagName === 'pre') {
        const rawContent = el.textContent || ''
        const lowerText = rawContent.toLowerCase()
        const isTerminal = 
          attribs.className?.includes('ql-syntax') || 
          rawContent.includes('$ ') || 
          rawContent.includes('# ') ||
          lowerText.includes('nmap') ||
          lowerText.includes('gobuster') ||
          lowerText.includes('sqlmap') ||
          lowerText.includes('ffuf') ||
          lowerText.includes('ping') ||
          lowerText.includes('whoami')

        if (isTerminal) {
          return <TerminalViewer key={key} content={rawContent} />
        }

        // Standard pre code block with Copy button
        return (
          <div key={key} style={{ position: 'relative', margin: '14px 0' }} className="group">
            <pre {...attribs} style={{ ...attribs.style, background: 'var(--bg3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', overflowX: 'auto' }}>
              <code style={{ fontFamily: 'monospace', color: 'var(--green)' }}>{rawContent}</code>
            </pre>
          </div>
        )
      }

      // Handle simple elements
      const children = Array.from(el.childNodes).map((child, i) => domToReact(child, `${key}-${i}`))
      return React.createElement(tagName, attribs, children.length > 0 ? children : null)
    }

    return null
  }

  // Render HTML strings on mount/change
  const renderContent = (contentStr: string) => {
    const sanitized = sanitizeHtml(contentStr)
    return parseHtmlToReact(sanitized)
  }

  if (!mounted) {
    return (
      <div className="writeup-renderer-wrapper" style={{ color: 'var(--text2)', fontSize: '15px', lineHeight: '1.85' }}>
        <div className="detail-page-content">
          {!isCve ? (
            <div className="writeup-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(writeup.content || '') }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div className="writeup-content">
                <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                  1. VULNERABILITY DESCRIPTION
                </h2>
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(writeup.content || '') }} />
              </div>
              {writeup.cve_impact && (
                <div className="writeup-content">
                  <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                    2. TECHNICAL IMPACT
                  </h2>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(writeup.cve_impact || '') }} />
                </div>
              )}
              {writeup.cve_poc && (
                <div className="writeup-content">
                  <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                    3. PROOF OF CONCEPT (PoC)
                  </h2>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(writeup.cve_poc || '') }} />
                </div>
              )}
              {writeup.cve_remediation && (
                <div className="writeup-content">
                  <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                    4. REMEDIATION & MITIGATION
                  </h2>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(writeup.cve_remediation || '') }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="writeup-renderer-wrapper" style={{ color: 'var(--text2)', fontSize: '15px', lineHeight: '1.85' }}>
      
      {/* Attack Chain Vector flowchart rendered visually */}
      {attackChain && attackChain.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '11px', color: 'var(--purple-400)', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
            // Attack Chain Vector
          </h3>
          <div className="pdf-attack-chain" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '16px', 
            background: 'var(--bg2)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            overflowX: 'auto',
            marginBottom: '20px'
          }}>
            {attackChain.map((step: any, idx: number) => (
              <div key={step.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="pdf-step-card" style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: `2px solid ${step.color || 'var(--purple-600)'}`, 
                  color: step.color,
                  borderRadius: '8px', 
                  padding: '12px', 
                  minWidth: '160px', 
                  maxWidth: '220px',
                  boxShadow: `0 0 10px ${step.color}22`
                }}>
                  <div style={{ fontSize: '9px', background: `${step.color}22`, color: step.color, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', display: 'inline-block', marginBottom: '6px' }}>
                    {step.icon === 'entry' ? '🚪 Entry' : step.icon === 'vuln' ? '💥 Vuln' : step.icon === 'pivot' ? '🔀 Pivot' : '🎯 Target'}
                  </div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '4px' }}>{step.name}</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>{step.desc}</span>
                </div>
                {idx < attackChain.length - 1 && (
                  <div style={{ color: 'var(--purple-400)', fontSize: '20px', fontWeight: 'bold' }}>➡</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Rendering based on Mode */}
      <div className="detail-page-content">
        {!isCve ? (
          /* Journal Mode */
          <div className="writeup-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderContent(writeup.content || '')}
          </div>
        ) : (
          /* CVE Professional Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'monospace' }}>TARGET PRODUCT</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '3px' }}>
                  {writeup.cve_product || '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'monospace' }}>AFFECTED VERSION</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '3px' }}>
                  {writeup.cve_version || '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'monospace' }}>VULNERABILITY TYPE (CWE)</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '3px' }}>
                  {writeup.cve_cwe || '-'}
                </div>
              </div>
              {writeup.cve_cvss_vector && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'monospace' }}>CVSS VECTOR STRING</div>
                  <div style={{ fontSize: '12px', color: 'var(--purple-300)', fontFamily: 'monospace', marginTop: '3px', wordBreak: 'break-all' }}>
                    {writeup.cve_cvss_vector}
                  </div>
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="writeup-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                  1. VULNERABILITY DESCRIPTION
                </h2>
                <div>{renderContent(writeup.content || '')}</div>
              </div>

              {writeup.cve_impact && (
                <div>
                  <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                    2. TECHNICAL IMPACT
                  </h2>
                  <div>{renderContent(writeup.cve_impact)}</div>
                </div>
              )}

              {writeup.cve_poc && (
                <div>
                  <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                    3. PROOF OF CONCEPT (PoC)
                  </h2>
                  <div>{renderContent(writeup.cve_poc)}</div>
                </div>
              )}

              {writeup.cve_remediation && (
                <div>
                  <h2 style={{ fontSize: '17px', borderLeft: '3px solid var(--purple-600)', paddingLeft: '12px', color: 'var(--purple-200)', fontFamily: 'monospace', margin: '0 0 10px 0' }}>
                    4. REMEDIATION & MITIGATION
                  </h2>
                  <div>{renderContent(writeup.cve_remediation)}</div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <style jsx global>{`
        .writeup-content h1, .writeup-content h2, .writeup-content h3 { color: var(--purple-200); font-family: monospace; margin: 20px 0 8px; }
        .writeup-content h1 { font-size: 20px; }
        .writeup-content h2 { font-size: 17px; border-left: 3px solid var(--purple-600); padding-left: 12px; }
        .writeup-content h3 { font-size: 15px; }
        .writeup-content p  { margin-bottom: 12px; }
        .writeup-content code { font-family: monospace; background: var(--bg3); color: var(--green); padding: 2px 6px; border-radius: 4px; font-size: 13px; border: 1px solid var(--border); }
        .writeup-content ul, .writeup-content ol { margin: 8px 0 12px 22px; }
        .writeup-content li { margin: 4px 0; }
        .writeup-content strong { color: var(--purple-200); }
        .writeup-content blockquote { border-left: 3px solid var(--purple-600); padding: 8px 16px; margin: 12px 0; background: rgba(83,74,183,0.08); border-radius: 0 6px 6px 0; }
        .writeup-content a { color: var(--purple-400); }
      `}</style>
    </div>
  )
}
