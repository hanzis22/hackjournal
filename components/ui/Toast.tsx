'use client'
import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

/**
 * Trigger a global toast notification from anywhere in the client code.
 */
export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hj-toast', {
        detail: { message, type, id: Math.random().toString(36).substring(2, 9) }
      })
    )
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType; id: string }>
      const { message, type, id } = customEvent.detail

      setToasts(prev => [...prev, { id, message, type }])

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    }

    window.addEventListener('hj-toast', handleToastEvent)
    return () => window.removeEventListener('hj-toast', handleToastEvent)
  }, [])

  const getStylesForType = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          background: 'rgba(23, 201, 100, 0.15)',
          border: '1px solid #17C964',
          color: '#17C964',
          shadow: 'rgba(23, 201, 100, 0.2)'
        }
      case 'error':
        return {
          background: 'rgba(243, 18, 96, 0.15)',
          border: '1px solid #F31260',
          color: '#F31260',
          shadow: 'rgba(243, 18, 96, 0.2)'
        }
      case 'warning':
        return {
          background: 'rgba(245, 165, 36, 0.15)',
          border: '1px solid #F5A524',
          color: '#F5A524',
          shadow: 'rgba(245, 165, 36, 0.2)'
        }
      case 'info':
      default:
        return {
          background: 'rgba(0, 114, 240, 0.15)',
          border: '1px solid #0072F0',
          color: '#0072F0',
          shadow: 'rgba(0, 114, 240, 0.2)'
        }
    }
  }

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        maxWidth: '350px',
        width: '100%',
        fontFamily: 'monospace'
      }}
    >
      {toasts.map(toast => {
        const config = getStylesForType(toast.type)
        return (
          <div
            key={toast.id}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: config.background,
              border: config.border,
              color: '#fff',
              fontSize: '12px',
              fontWeight: '500',
              lineHeight: '1.5',
              cursor: 'pointer',
              boxShadow: `0 8px 16px ${config.shadow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: config.color }}>
                {toast.type === 'success' && '✓'}
                {toast.type === 'error' && '⚠️'}
                {toast.type === 'warning' && '⚡'}
                {toast.type === 'info' && 'ℹ'}
              </span>
              <span>{toast.message}</span>
            </div>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>✕</span>
          </div>
        )
      })}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
