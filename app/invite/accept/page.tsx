'use client'
import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function InviteAcceptContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token undangan tidak valid atau tidak ditemukan.')
      return
    }

    async function attemptAccept() {
      try {
        const res = await fetch(`/api/invites/accept/${token}`, {
          method: 'POST',
        })

        if (res.status === 401) {
          setStatus('unauthorized')
          return
        }

        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setMessage(data.message || 'Berhasil bergabung ke tim!')
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard?tab=tim')
          }, 3000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Gagal menerima undangan.')
        }
      } catch (err) {
        console.error(err)
        setStatus('error')
        setMessage('Terjadi kesalahan koneksi.')
      }
    }

    attemptAccept()
  }, [token, router])

  const redirectUrl = encodeURIComponent(`/invite/accept?token=${token || ''}`)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>⬡</div>
          <h1 style={{ fontFamily: 'monospace', fontSize: '24px', color: 'var(--purple-400)', margin: 0 }}>HackJournal</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '6px' }}>Team Workspace Invitation</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--purple-300)', letterSpacing: '2px', marginBottom: '24px', textTransform: 'uppercase' }}>
            // Processing Invitation
          </h2>

          {status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--purple-500)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '14px' }}>Memproses undangan Anda...</p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '48px', color: 'var(--green)' }}>✓</div>
              <p style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '15px' }}>{message}</p>
              <p style={{ color: 'var(--text2)', fontSize: '12px' }}>Mengalihkan Anda ke Dashboard Tim...</p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '48px', color: 'var(--red)' }}>⚠</div>
              <p style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '14px' }}>{message}</p>
              <Link href="/dashboard" style={{ marginTop: '16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 20px', color: 'var(--text)', textDecoration: 'none', fontSize: '13px', fontFamily: 'monospace' }}>
                Kembali ke Dashboard
              </Link>
            </div>
          )}

          {status === 'unauthorized' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '40px', color: 'var(--yellow)' }}>🔑</div>
              <p style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '14px', marginBottom: '8px' }}>
                Anda belum login. Silakan daftar atau masuk untuk menerima undangan ini.
              </p>
              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                <Link href={`/login?redirect=${redirectUrl}`} style={{ flex: 1, background: 'var(--purple-600)', color: '#fff', padding: '12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  Masuk (Login)
                </Link>
                <Link href={`/register?redirect=${redirectUrl}`} style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontFamily: 'monospace' }}>
                  Daftar (Register)
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-white">Memuat...</div>}>
      <InviteAcceptContent />
    </Suspense>
  )
}

