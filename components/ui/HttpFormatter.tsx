'use client'
import { useState, useEffect } from 'react'

export default function HttpFormatter() {
  const [rawHttp, setRawHttp] = useState('')
  const [pythonCode, setPythonCode] = useState('')
  const [curlCode, setCurlCode] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!rawHttp.trim()) {
      setPythonCode('')
      setCurlCode('')
      return
    }

    try {
      const lines = rawHttp.split('\n')
      if (lines.length === 0) return

      // Parse Request Line
      const reqLine = lines[0].trim().split(' ')
      if (reqLine.length < 2) return
      const method = reqLine[0]
      const path = reqLine[1]

      let host = ''
      const headers: Record<string, string> = {}
      let bodyLines: string[] = []
      let isBody = false

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (isBody) {
          bodyLines.push(line)
          continue
        }

        if (line.trim() === '') {
          isBody = true
          continue
        }

        const colonIdx = line.indexOf(':')
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).trim()
          const val = line.substring(colonIdx + 1).trim()
          
          if (key.toLowerCase() === 'host') {
            host = val
          } else if (
            key.toLowerCase() !== 'cookie' && 
            key.toLowerCase() !== 'authorization'
          ) {
            headers[key] = val
          }
        }
      }

      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
      const fullUrl = `${protocol}://${host || 'target.com'}${path}`
      const body = bodyLines.join('\n').trim()

      // Generate Python code
      let py = `import requests\n\nurl = "${fullUrl}"\n`
      
      // Format headers
      py += 'headers = {\n'
      for (const [k, v] of Object.entries(headers)) {
        py += `    "${k}": "${v.replace(/"/g, '\\"')}",\n`
      }
      py += '    # NOTE: Cookie & Authorization headers are stripped for safety\n'
      py += '}\n\n'

      if (body) {
        // Try parsing JSON body
        try {
          JSON.parse(body)
          py += `data_json = ${body}\n`
          py += `response = requests.${method.toLowerCase()}(url, json=data_json, headers=headers)\n`
        } catch {
          py += `data = """${body.replace(/"""/g, '\\"\\"\\"')}"""\n`
          py += `response = requests.${method.toLowerCase()}(url, data=data, headers=headers)\n`
        }
      } else {
        py += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`
      }

      py += '\nprint(f"Status Code: {response.status_code}")\nprint(response.text[:500])\n'
      setPythonCode(py)

      // Generate curl code
      let curl = `curl -X ${method} "${fullUrl}" \\\n`
      for (const [k, v] of Object.entries(headers)) {
        curl += `  -H "${k}: ${v.replace(/"/g, '\\"')}" \\\n`
      }
      if (body) {
        curl += `  -d '${body.replace(/'/g, "'\\''")}'`
      } else {
        // Remove trailing slash and backslash
        curl = curl.trim().replace(/\\$/, '')
      }
      setCurlCode(curl)

    } catch (err) {
      console.error('Failed to parse HTTP Request:', err)
    }
  }, [rawHttp])

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      alert('Gagal menyalin.')
    }
  }

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid var(--purple-500)',
          background: 'rgba(127,119,221,0.12)',
          color: 'var(--purple-200)',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}
      >
        🛠️ BUKA HTTP TO POC SCRIPT GENERATOR
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--purple-600)',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 4px 20px rgba(83,74,183,0.15)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <h4 style={{ fontFamily: 'monospace', color: 'var(--purple-300)', margin: 0 }}>
          🛠️ RAW HTTP REQUEST TO POC SCRIPT GENERATOR
        </h4>
        <button
          type="button"
          onClick={() => setShow(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--red)',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}
        >
          [ TUTUP ]
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Input Column */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', fontFamily: 'monospace' }}>
            PASTE RAW HTTP REQUEST (DARI BURP SUITE / OWASP ZAP)
          </label>
          <textarea
            value={rawHttp}
            onChange={e => setRawHttp(e.target.value)}
            placeholder="POST /api/v1/exploit HTTP/1.1&#10;Host: vulnerable.com&#10;Content-Type: application/json&#10;Cookie: session=secret (AKAN DIHAPUS OTOMATIS)&#10;&#10;{&quot;payload&quot;: &quot;union select 1...&quot;}"
            style={{
              width: '100%',
              height: '320px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '12px',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        {/* Output Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Python requests script output */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace' }}>PYTHON REQUESTS EXPLOIT POC</span>
              {pythonCode && (
                <button
                  type="button"
                  onClick={() => handleCopy(pythonCode, 'python')}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg3)', color: copiedField === 'python' ? 'var(--green)' : 'var(--text2)', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer' }}
                >
                  {copiedField === 'python' ? 'Copied!' : 'Copy Script'}
                </button>
              )}
            </div>
            <textarea
              readOnly
              value={pythonCode || '// Silakan masukkan HTTP request di kolom kiri...'}
              style={{
                width: '100%',
                height: '145px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '12px',
                color: 'var(--green)',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Curl command output */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace' }}>CURL EQUIVALENT COMMAND</span>
              {curlCode && (
                <button
                  type="button"
                  onClick={() => handleCopy(curlCode, 'curl')}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg3)', color: copiedField === 'curl' ? 'var(--green)' : 'var(--text2)', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer' }}
                >
                  {copiedField === 'curl' ? 'Copied!' : 'Copy cURL'}
                </button>
              )}
            </div>
            <textarea
              readOnly
              value={curlCode || '// Silakan masukkan HTTP request di kolom kiri...'}
              style={{
                width: '100%',
                height: '145px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '12px',
                color: 'var(--purple-300)',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
