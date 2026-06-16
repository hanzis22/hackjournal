'use client'
import { useState, useEffect } from 'react'

interface CustomModalProps {
  type: 'prompt' | 'confirm'
  title: string
  message?: string
  placeholder?: string
  initialValue?: string
  onConfirm: (value?: string) => void
  onCancel: () => void
}

export default function CustomModal({
  type,
  title,
  message,
  placeholder = '',
  initialValue = '',
  onConfirm,
  onCancel
}: CustomModalProps) {
  const [value, setValue] = useState(initialValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'prompt') {
      onConfirm(value)
    } else {
      onConfirm()
    }
  }

  // Focus input on mount
  useEffect(() => {
    if (type === 'prompt') {
      const el = document.getElementById('custom-modal-input')
      el?.focus()
    }
  }, [type])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 0 30px rgba(127,119,221,0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255, 255, 255, 0.01)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>{type === 'prompt' ? '📁' : '⚠️'}</span>
          <h4 style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {title}
          </h4>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {message && (
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6' }}>
              {message}
            </p>
          )}

          {type === 'prompt' && (
            <input
              id="custom-modal-input"
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={e => setValue(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '9px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
                marginBottom: '20px',
                textAlign: 'left'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--purple-400)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text2)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: type === 'confirm' && title.toLowerCase().includes('hapus') ? 'var(--red)' : 'var(--purple-600)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {type === 'prompt' ? 'Simpan' : 'Lanjutkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
