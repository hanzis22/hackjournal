import type { Metadata } from 'next'
import './globals.css'
import PWARegistration from '@/components/ui/PWARegistration'

export const metadata: Metadata = {
  title: 'HackJournal — Cybersecurity Writeup',
  description: 'Document your hacking journey. CTF writeups, lab notes & cybersecurity learning journal.',
  manifest: '/manifest.json',
  themeColor: '#7F77DD',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HackJournal'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'monospace, sans-serif' }}>
        <PWARegistration />
        {children}
      </body>
    </html>
  )
}
