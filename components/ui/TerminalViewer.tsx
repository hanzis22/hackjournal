'use client'
import { useState } from 'react'

interface TerminalViewerProps {
  content: string
  title?: string
}

export default function TerminalViewer({ content, title = 'Terminal Output' }: TerminalViewerProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse ANSI escape codes and highlight interesting entities (IPs, Ports, URLs, File Paths, HTTP statuses)
  const formatTerminalLine = (line: string) => {
    if (!line) return '&nbsp;'

    // 1. Basic HTML Escape
    let escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // 2. Parse basic ANSI colors
    // Reset: \u001b[0m or \u001b[m
    // Colors: 30-37 (foreground), 90-97 (bright foreground)
    // We will replace basic sequences with spans
    const ansiMap: Record<string, string> = {
      '0': '</span>',
      '31': '<span style="color:#ff4560">', // Red
      '32': '<span style="color:#39ff14">', // Green
      '33': '<span style="color:#f0a500">', // Yellow
      '34': '<span style="color:#7f77dd">', // Blue
      '35': '<span style="color:#afa9ec">', // Purple/Magenta
      '36': '<span style="color:#00e5ff">', // Cyan
      '37': '<span style="color:#ffffff">', // White
      '90': '<span style="color:#888888">', // Bright Black (Gray)
      '91': '<span style="color:#ff6b8b">', // Bright Red
      '92': '<span style="color:#66ff66">', // Bright Green
      '93': '<span style="color:#ffea79">', // Bright Yellow
      '94': '<span style="color:#9e97ff">', // Bright Blue
      '95': '<span style="color:#d5c4ff">', // Bright Magenta
      '96': '<span style="color:#7fffff">', // Bright Cyan
      '97': '<span style="color:#ffffff">', // Bright White
      '1': '<span style="font-weight:bold">', // Bold
    }

    // Replace ANSI codes
    const ansiRegex = /\x1B\[([0-9;]+)m/g
    let match
    let spanCount = 0
    
    escaped = escaped.replace(ansiRegex, (_, codes) => {
      const parts = codes.split(';')
      let replacement = ''
      for (const code of parts) {
        if (code === '0') {
          // Close all open spans
          replacement += '</span>'.repeat(spanCount)
          spanCount = 0
        } else if (ansiMap[code]) {
          replacement += ansiMap[code]
          if (ansiMap[code].startsWith('<span')) {
            spanCount++
          }
        }
      }
      return replacement
    })
    
    // Close remaining spans
    escaped += '</span>'.repeat(spanCount)

    // 3. Highlight IPs (IPv4)
    escaped = escaped.replace(
      /\b((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
      '<span style="color:#00e5ff;font-weight:bold;text-decoration:underline">$1</span>'
    )

    // 4. Highlight ports/protocols (e.g. 80/tcp, 443/tcp)
    escaped = escaped.replace(
      /\b(\d{1,5}\/(?:tcp|udp))\b/gi,
      '<span style="color:#39ff14;font-weight:bold">$1</span>'
    )

    // 5. Highlight common file paths or URL parameters
    escaped = escaped.replace(
      /\b(\/(?:etc|var|usr|bin|tmp|home|opt|windows|system32)\/[a-zA-Z0-9_\-\.\/]+)\b/g,
      '<span style="color:#f0a500;font-family:monospace">$1</span>'
    )

    // 6. Highlight HTTP status codes
    escaped = escaped.replace(
      /\b(200 OK|201 Created|301 Moved Permanently|302 Found|400 Bad Request|401 Unauthorized|403 Forbidden|404 Not Found|500 Internal Server Error)\b/gi,
      (match) => {
        const color = match.startsWith('2') ? '#39ff14' : match.startsWith('3') ? '#7f77dd' : '#ff4560'
        return `<span style="color:${color};font-weight:bold">${match}</span>`
      }
    )

    return escaped
  }

  // Detect tool name from content (e.g. nmap, gobuster, sqlmap)
  const detectTool = () => {
    const lower = content.toLowerCase()
    if (lower.includes('nmap')) return '⚡ NMAP SCAN'
    if (lower.includes('gobuster')) return '📂 GOBUSTER'
    if (lower.includes('sqlmap')) return '🛢️ SQLMAP'
    if (lower.includes('ffuf')) return '🔍 FFUF FUZZER'
    if (lower.includes('nikto')) return '🕸️ NIKTO'
    if (lower.includes('nuclei')) return '🧬 NUCLEI'
    return '💻 TERMINAL'
  }

  const lines = content.split('\n')

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: '#090a0f',
      overflow: 'hidden',
      fontFamily: 'monospace',
      margin: '16px 0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      {/* Title / Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: '#121420',
        borderBottom: '1px solid var(--border)',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
          <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', color: 'var(--purple-400)', fontSize: '10px' }}>▶</span>
          <span style={{ fontSize: '11px', color: '#ffea79', fontWeight: 'bold', letterSpacing: '1px' }}>
            {detectTool()}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
            ({lines.length} lines)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: copied ? '#39ff14' : 'var(--text2)',
              fontSize: '11px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            {copied ? 'Copied! ✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code body */}
      {isOpen && (
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '14px 16px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#e2e8f0'
        }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} style={{ verticalAlign: 'top' }}>
                  <td style={{
                    width: '30px',
                    textAlign: 'right',
                    paddingRight: '12px',
                    color: '#4a5568',
                    userSelect: 'none',
                    borderRight: '1px solid #1a202c',
                    fontSize: '11px'
                  }}>
                    {idx + 1}
                  </td>
                  <td
                    style={{ paddingLeft: '12px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: formatTerminalLine(line) }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
