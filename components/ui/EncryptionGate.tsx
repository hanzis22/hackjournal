'use client'
import { useState, useEffect } from 'react'
import { decryptPayload } from '@/lib/cryptoClient'

interface EncryptionGateProps {
  initialWriteup: any
  onDecrypted: (decrypted: any) => void
  onBack?: () => void
  backLabel?: string
  description?: string
}

export default function EncryptionGate({
  initialWriteup,
  onDecrypted,
  onBack,
  backLabel = 'Kembali',
  description = 'Writeup ini dilindungi dengan enkripsi Zero-Knowledge. Masukkan passphrase enkripsi Anda untuk mendekripsi isi laporan.'
}: EncryptionGateProps) {
  const [passphrase, setPassphrase] = useState('')
  const [decryptError, setDecryptError] = useState('')

  useEffect(() => {
    if (initialWriteup.is_encrypted === 1) {
      const savedKey = sessionStorage.getItem('hj_encryption_key')
      if (savedKey) {
        attemptDecryption(savedKey, true)
      }
    }
  }, [initialWriteup])

  async function attemptDecryption(pass: string, isAutoAttempt = false) {
    try {
      const encIv = initialWriteup.encryption_iv || ''
      const encSalt = initialWriteup.encryption_salt || ''
      if (!encIv || !encSalt) {
        throw new Error('Data enkripsi tidak lengkap (salt/IV hilang)')
      }

      const ivs = encIv.split(':')
      if (ivs.length < 2 || !ivs[0] || !ivs[1]) {
        throw new Error('Format IV tidak valid')
      }
      const ivTitle = ivs[0]
      const ivContent = ivs[1]

      const titleHex = initialWriteup.title || ''
      const contentHex = initialWriteup.content || ''
      if (!titleHex || !contentHex || !/^[0-9a-f]+$/i.test(titleHex)) {
        throw new Error('Data ciphertext tidak valid atau belum terenkripsi')
      }

      const decTitle = await decryptPayload(pass, titleHex, encSalt, ivTitle)
      const decContentStr = await decryptPayload(pass, contentHex, encSalt, ivContent)
      const payload = JSON.parse(decContentStr)

      onDecrypted({
        ...initialWriteup,
        title: decTitle,
        platform: payload.platform || '',
        difficulty: payload.difficulty || 'Easy',
        tags: payload.tags || '',
        content: payload.content || '',
        cve_id: payload.cve_id || '',
        cve_product: payload.cve_product || '',
        cve_version: payload.cve_version || '',
        cve_cwe: payload.cve_cwe || '',
        cve_cvss_vector: payload.cve_cvss_vector || null,
        cve_cvss_severity: payload.cve_cvss_severity || null,
        cve_impact: payload.cve_impact || '',
        cve_poc: payload.cve_poc || '',
        cve_remediation: payload.cve_remediation || '',
        attack_chain: payload.attack_chain || null
      })

      sessionStorage.setItem('hj_encryption_key', pass)
      setDecryptError('')
    } catch (err: any) {
      if (isAutoAttempt) {
        sessionStorage.removeItem('hj_encryption_key')
        setDecryptError('')
      } else {
        const isOperationError = err?.name === 'OperationError' || (err?.message || '').includes('decrypt')
        setDecryptError(
          isOperationError
            ? 'Passphrase salah. Silakan periksa dan coba lagi.'
            : `Gagal mendekripsi: ${err?.message || 'Terjadi kesalahan'}`
        )
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '40px', fontFamily: 'monospace' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '30px', width: '100%', maxWidth: '450px', textAlign: 'center', boxShadow: '0 0 30px rgba(127,119,221,0.15)' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
        <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '10px' }}>Dokumen Terenkripsi</h2>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '20px' }}>
          {description}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); attemptDecryption(passphrase) }}>
          <input
            type="password"
            placeholder="Masukkan Passphrase Enkripsi..."
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            required
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '9px 12px', color: 'var(--text)',
              fontSize: '14px', outline: 'none', fontFamily: 'monospace', marginBottom: '16px', textAlign: 'center'
            }}
          />
          {decryptError && (
            <div style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '16px' }}>
              ⚠ {decryptError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
              >
                {backLabel}
              </button>
            )}
            <button
              type="submit"
              style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: 'var(--purple-600)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Dekripsi Laporan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
