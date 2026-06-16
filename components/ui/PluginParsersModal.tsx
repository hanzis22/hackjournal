'use client'
import React, { useState } from 'react'

interface PluginParsersModalProps {
  onClose: () => void
  onImport: (parsedData: { title?: string, content?: string, tags?: string, difficulty?: string }) => void
}

export default function PluginParsersModal({ onClose, onImport }: PluginParsersModalProps) {
  const [parser, setParser] = useState<'nmap' | 'nuclei' | 'shodan'>('nmap')
  const [rawData, setRawData] = useState('')
  const [error, setError] = useState('')

  const handleProcess = () => {
    setError('')
    try {
      if (parser === 'nmap') {
        // Very naive nmap parser for demonstration
        let content = '### Nmap Scan Results\n\n```text\n' + rawData + '\n```\n'
        let title = 'Nmap Port Scan Report'
        onImport({ title, content, tags: 'nmap,recon' })
      } else if (parser === 'nuclei') {
        // Try parsing nuclei JSON output
        const lines = rawData.trim().split('\n')
        let content = '### Nuclei Findings\n\n'
        let highestSeverity = 'Info'
        lines.forEach(line => {
          try {
            const parsed = JSON.parse(line)
            content += `- **[${parsed.info?.severity?.toUpperCase() || 'INFO'}] ${parsed.info?.name || parsed['template-id']}**: ${parsed.host}\n`
            if (parsed.info?.severity === 'critical') highestSeverity = 'Insane'
            else if (parsed.info?.severity === 'high' && highestSeverity !== 'Insane') highestSeverity = 'Hard'
            else if (parsed.info?.severity === 'medium' && !['Insane', 'Hard'].includes(highestSeverity)) highestSeverity = 'Medium'
            else if (parsed.info?.severity === 'low' && highestSeverity === 'Info') highestSeverity = 'Easy'
          } catch (e) {
            // ignore malformed JSON lines
          }
        })
        onImport({ title: 'Nuclei Scan Results', content, tags: 'nuclei,scanner', difficulty: highestSeverity })
      } else if (parser === 'shodan') {
        // Naive shodan parser
        const content = '### Shodan Host Info\n\n```json\n' + rawData + '\n```\n'
        onImport({ title: 'Shodan Recon', content, tags: 'shodan,osint' })
      }
    } catch (e: any) {
      setError('Gagal memproses data: ' + e.message)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: '8px', width: '600px', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: 'var(--purple-300)', fontFamily: 'monospace' }}>🧩 Plugin Parsers</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
            Pilih parser untuk mengimpor raw data dari tool eksternal langsung ke dalam writeup.
          </p>

          <select 
            value={parser} 
            onChange={e => setParser(e.target.value as any)}
            style={{ padding: '10px', background: 'var(--bg2)', border: '1px solid var(--border)', color: '#fff', borderRadius: '6px', outline: 'none' }}
          >
            <option value="nmap">Nmap Raw Output Parser</option>
            <option value="nuclei">Nuclei JSONL Parser</option>
            <option value="shodan">Shodan Host JSON Parser</option>
          </select>

          <textarea 
            value={rawData}
            onChange={e => setRawData(e.target.value)}
            placeholder="Paste raw output dari tool di sini..."
            style={{ width: '100%', height: '200px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--green)', padding: '12px', fontFamily: 'monospace', resize: 'vertical' }}
          />

          {error && <div style={{ color: 'var(--red)', fontSize: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleProcess} style={{ padding: '10px 16px', background: 'var(--purple-600)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Process & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
