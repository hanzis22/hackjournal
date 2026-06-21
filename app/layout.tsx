import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegistration from '@/components/ui/PWARegistration'
import ToastContainer from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'HackJournal — Cybersecurity Writeup',
  description: 'Document your hacking journey. CTF writeups, lab notes & cybersecurity learning journal.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HackJournal'
  }
}

export const viewport: Viewport = {
  themeColor: '#7F77DD'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'monospace, sans-serif' }}>
        <PWARegistration />
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
