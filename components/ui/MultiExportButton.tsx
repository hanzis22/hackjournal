'use client'
import React, { useState } from 'react'

interface Props {
  writeup: any
  tags: string[]
}

export default function MultiExportButton({ writeup, tags }: Props) {
  const [open, setOpen] = useState(false)

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const exportJson = () => {
    const data = JSON.stringify(writeup, null, 2)
    downloadFile(data, `${writeup.title || 'writeup'}.json`, 'application/json')
  }

  const exportHtml = () => {
    // Generate basic HTML wrapper around the markdown content
    // Note: since the markdown is rendered on the client, we can export raw markdown inside HTML or parsed HTML if we had it,
    // but the simplest is just injecting it into a template.
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${writeup.title}</title>
<style>
  body { font-family: monospace; max-width: 800px; margin: 40px auto; line-height: 1.6; color: #333; }
  pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
  code { background: #eee; padding: 2px 4px; border-radius: 3px; }
</style>
</head>
<body>
  <h1>${writeup.title}</h1>
  <p><strong>Difficulty:</strong> ${writeup.difficulty} | <strong>Platform:</strong> ${writeup.platform}</p>
  <hr>
  <pre style="white-space: pre-wrap;">${writeup.content}</pre>
</body>
</html>`
    downloadFile(html, `${writeup.title || 'writeup'}.html`, 'text/html')
  }

  const exportDocx = () => {
    // Hacky HTML to DOCX using Blob with word mime type
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${writeup.title}</title></head>
<body>
  <h1>${writeup.title}</h1>
  <p><strong>Difficulty:</strong> ${writeup.difficulty} | <strong>Platform:</strong> ${writeup.platform}</p>
  <hr>
  <div>${writeup.content.replace(/\n/g, '<br>')}</div>
</body></html>`
    
    downloadFile(html, `${writeup.title || 'writeup'}.doc`, 'application/msword')
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ padding:'7px 16px', borderRadius:'6px', border:'1px solid var(--purple-500)', background:'rgba(127,119,221,0.1)', color:'var(--purple-200)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}
      >
        ⬇️ Export As...
      </button>
      
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '8px',
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px',
          display: 'flex', flexDirection: 'column', minWidth: '150px', zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <button onClick={exportJson} style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}>
            {'{ }'} JSON Data
          </button>
          <button onClick={exportHtml} style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}>
            🌐 HTML Page
          </button>
          <button onClick={exportDocx} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}>
            📄 Word (DOC)
          </button>
        </div>
      )}
    </div>
  )
}
