'use client'
import { useEffect, useState, useRef } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  documentId?: string
  currentUser?: {
    name: string
    color: string
  }
  readOnly?: boolean
}

export default function RichEditor({ value, onChange, documentId, currentUser, readOnly }: Props) {
  const [Editor, setEditor] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const reactQuillRef = useRef<any>(null)

  const [isAccessRevoked, setIsAccessRevoked] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const initQuill = async () => {
      const mod = await import('react-quill-new')
      const ReactQuill = mod.default
      const Quill = ReactQuill.Quill
      
      const { default: QuillCursors } = await import('quill-cursors')
      Quill.register('modules/cursors', QuillCursors)
      
      await import('react-quill-new/dist/quill.snow.css')
      setEditor(() => ReactQuill)
    }

    initQuill()
  }, [])

  useEffect(() => {
    if (!mounted || !Editor || isAccessRevoked) return

    let quillBinding: any = null
    let provider: any = null
    let ydoc: any = null

    const revokeAccess = () => {
      setIsAccessRevoked(true)
      if (provider) {
        try {
          provider.disconnect()
          provider.destroy()
        } catch (e) {
          console.error(e)
        }
      }
      if (quillBinding) {
        try {
          quillBinding.destroy()
        } catch (e) {
          console.error(e)
        }
      }
    }

    // Server-Sent Events listener for force_disconnect
    const eventSource = new EventSource('/api/realtime/events')
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'force_disconnect') {
          revokeAccess()
        }
      } catch (err) {
        console.error('SSE message error:', err)
      }
    }

    // Ping check interval for 403 Forbidden / 404 Not Found on writeup status
    const checkInterval = setInterval(async () => {
      if (!documentId || documentId === 'new') return
      try {
        const res = await fetch(`/api/writeups/${documentId}/status`)
        if (res.status === 403 || res.status === 404) {
          revokeAccess()
        }
      } catch (err) {
        console.error('Ping access check failed:', err)
      }
    }, 10000)

    const setupCollab = async () => {
      const quill = reactQuillRef.current?.getEditor()
      if (!quill) return

      // Set initial content immediately if readOnly to prevent empty screen flash
      if (readOnly && value) {
        quill.clipboard.dangerouslyPasteHTML(value)
      }

      const Y = await import('yjs')
      const { WebsocketProvider } = await import('y-websocket')
      const { QuillBinding } = await import('y-quill')

      ydoc = new Y.Doc()
      const roomName = `hackjournal-writeup-${documentId || 'new'}`
      
      provider = new WebsocketProvider('wss://demos.yjs.dev', roomName, ydoc)
      const ytext = ydoc.getText('quill')

      let initialized = false
      const handleSync = () => {
        if (initialized) return
        initialized = true

        // Bind Quill only after Yjs is fully synced
        quillBinding = new QuillBinding(ytext, quill, provider.awareness)

        // Set initial content if Yjs is empty and we have an initial value (only if not readOnly)
        if (ytext.toString() === '' && value && !readOnly) {
          quill.clipboard.dangerouslyPasteHTML(value)
        }

        // Propagate Quill updates to parent state
        ytext.observe(() => {
          onChange(quill.root.innerHTML)
        })
      }

      // Sync awareness state for user cursors
      if (currentUser && provider.awareness) {
        provider.awareness.setLocalStateField('user', {
          name: currentUser.name,
          color: currentUser.color || '#7F77DD'
        })
      }

      if (provider.synced) {
        handleSync()
      } else {
        provider.once('sync', handleSync)
        // Fallback timeout of 2 seconds for slow connections/offline mode
        setTimeout(handleSync, 2000)
      }
    }

    const timer = setTimeout(() => {
      setupCollab()
    }, 100)

    return () => {
      clearTimeout(timer)
      eventSource.close()
      clearInterval(checkInterval)
      if (quillBinding) {
        try {
          quillBinding.destroy()
        } catch (e) {
          console.error('Failed to destroy quill binding:', e)
        }
      }
      if (provider) {
        try {
          provider.destroy()
        } catch (e) {
          console.error('Failed to destroy websocket provider:', e)
        }
      }
      if (ydoc) {
        try {
          ydoc.destroy()
        } catch (e) {
          console.error('Failed to destroy Yjs Doc:', e)
        }
      }
    }
  }, [mounted, Editor, documentId, isAccessRevoked])

  const modules = {
    cursors: true,
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }

  if (isAccessRevoked) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(7, 7, 16, 0.98)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FF4560',
        fontFamily: 'monospace',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          border: '2px solid #FF4560',
          borderRadius: '8px',
          padding: '40px',
          background: 'rgba(255, 69, 96, 0.05)',
          maxWidth: '500px',
          boxShadow: '0 0 30px rgba(255, 69, 96, 0.2)'
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px', margin: 0, fontWeight: 'bold' }}>🚫 ACCESS REVOKED</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.6', margin: '16px 0 24px 0' }}>
            Sesi kolaborasi Anda telah dihentikan oleh administrator atau Anda telah dikeluarkan dari tim pemilik dokumen ini.
          </p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: '#FF4560',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(255, 69, 96, 0.4)'
            }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!mounted || !Editor) {
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '8px', minHeight: '300px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text2)', fontFamily: 'monospace', fontSize: '13px'
      }}>
        // Loading collaborative editor...
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      opacity: readOnly ? 0.6 : 1,
      transition: 'all 0.2s ease',
    }}>
      {readOnly && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '14px',
          fontSize: '10px',
          color: 'var(--text2)',
          fontFamily: 'monospace',
          zIndex: 10,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          padding: '3px 8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          letterSpacing: '0.5px'
        }}>
          🔒 READ-ONLY
        </div>
      )}
      <Editor
        ref={reactQuillRef}
        theme="snow"
        modules={modules}
        readOnly={readOnly}
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  )
}
