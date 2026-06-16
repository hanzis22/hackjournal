'use client'
import { useState } from 'react'

interface AIAssistantModalProps {
  onClose: () => void
  onImport: (draft: {
    title: string
    cwe: string
    cvssScore: number
    cvssVector: string
    cvssSeverity: string
    description: string
    impact: string
    remediation: string
  }) => void
}

export default function AIAssistantModal({ onClose, onImport }: AIAssistantModalProps) {
  const [rawLogs, setRawLogs] = useState('')
  const [language, setLanguage] = useState<'id' | 'en'>('id')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!rawLogs.trim()) {
      setError('Please paste raw log or scan results first.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawLogs, language })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate draft')

      onImport(data.draft)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0B0B16',
        border: '1px solid #7F77DD',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '650px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(127, 119, 221, 0.2)',
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🤖 AI Writeup Draft Generator
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FF4560',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: '#8F9CAE', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>
          Paste raw scan outputs (e.g. Nmap scan, SQLmap trace, Burp requests, or short notes) and the AI will auto-generate draft report sections, CWE tags, and CVSS vector estimates.
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 69, 96, 0.1)',
            border: '1px solid #FF4560',
            color: '#FF4560',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#8F9CAE', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
            Language Preference
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setLanguage('id')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid ' + (language === 'id' ? '#7F77DD' : '#2A2A40'),
                background: language === 'id' ? 'rgba(127,119,221,0.15)' : '#121225',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Bahasa Indonesia
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid ' + (language === 'en' ? '#7F77DD' : '#2A2A40'),
                background: language === 'en' ? 'rgba(127,119,221,0.15)' : '#121225',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              English
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#8F9CAE', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
            Raw Scan Logs / Exploit Trace
          </label>
          <textarea
            value={rawLogs}
            onChange={(e) => setRawLogs(e.target.value)}
            placeholder={`Example:
nmap -p 80,8080 -sV 192.168.1.100
PORT     STATE SERVICE VERSION
80/tcp   open  http    Apache httpd 2.4.41
8080/tcp open  http    Apache Tomcat 9.0.37`}
            style={{
              width: '100%',
              height: '180px',
              background: '#070710',
              border: '1px solid #2A2A40',
              borderRadius: '6px',
              padding: '12px',
              color: '#39FF14',
              fontSize: '12px',
              lineHeight: '1.5',
              outline: 'none',
              fontFamily: 'monospace',
              resize: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: '1px solid #2A2A40',
              background: 'transparent',
              color: '#8F9CAE',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '6px',
              border: 'none',
              background: '#7F77DD',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Analyzing & Drafting...' : '🤖 Generate Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}
