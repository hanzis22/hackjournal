'use client'
import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('Service Worker registered successfully:', reg.scope),
          (err) => console.error('Service Worker registration failed:', err)
        )
      })
    }
  }, [])

  return null
}
