'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'
import { encryptPayload, decryptPayload } from '@/lib/cryptoClient'

interface VaultEntry {
  id: number
  label: string
  category: string
  encrypted_data: string
  encryption_iv: string
  encryption_salt: string
  notes: string | null
  expires_at: string | null
  created_at: string
  decryptedData?: string
}

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('id')
  
  // Decryption master key
  const [masterKey, setMasterKey] = useState('')
  const [hasEnteredKey, setHasEnteredKey] = useState(false)

  // Form state
  const [label, setLabel] = useState('')
  const [secretData, setSecretData] = useState('')
  const [category, setCategory] = useState('credential')
  const [notes, setNotes] = useState('')
  const [expiresInHours, setExpiresInHours] = useState('24')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLang(getCurrentLang())
    const savedKey = sessionStorage.getItem('hj_encryption_key') || ''
    if (savedKey) {
      setMasterKey(savedKey)
      setHasEnteredKey(true)
    }
    fetchVault()
  }, [])

  const fetchVault = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vault')
      const data = await res.json()
      if (res.ok) {
        setEntries(data.vault || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!masterKey.trim()) return
    sessionStorage.setItem('hj_encryption_key', masterKey)
    setHasEnteredKey(true)
  }

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !secretData.trim() || !masterKey.trim()) return

    setError('')
    setSuccess('')
    try {
      // Encrypt client-side
      const encrypted = await encryptPayload(masterKey, secretData.trim())

      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          category,
          encrypted_data: encrypted.ciphertext,
          encryption_iv: encrypted.iv,
          encryption_salt: encrypted.salt,
          notes: notes.trim(),
          expires_in_hours: expiresInHours ? Number(expiresInHours) : null
        })
      })

      const data = await res.json()
      if (res.ok) {
        setLabel('')
        setSecretData('')
        setNotes('')
        setSuccess('Secret saved and encrypted client-side successfully!')
        fetchVault()
      } else {
        setError(data.error || 'Failed to save secret')
      }
    } catch (err: any) {
      setError('Encryption failed: ' + err.message)
    }
  }

  const handleDecryptEntry = async (entry: VaultEntry) => {
    if (!masterKey.trim()) return

    try {
      const decrypted = await decryptPayload(
        masterKey,
        entry.encrypted_data,
        entry.encryption_salt,
        entry.encryption_iv
      )
      setEntries(prev => prev.map(e => {
        if (e.id === entry.id) {
          return { ...e, decryptedData: decrypted }
        }
        return e
      }))
    } catch (err) {
      alert('Failed to decrypt. Check if your master key is correct.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this secret?')) return

    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSuccess('Secret deleted successfully.')
        fetchVault()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', fontFamily: 'monospace' }}>
        {getTranslation(lang, 'loading')}
      </div>
    )
  }

  if (!hasEnteredKey) {
    return (
      <div style={{ padding: '40px', maxWidth: '450px', margin: '100px auto', background: 'var(--bg2)', border: '1px solid #7F77DD', borderRadius: '12px', paddingBottom: '30px', fontFamily: 'monospace' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px', textAlign: 'center' }}>
          🔐 Unlock Secure Vault
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '20px', textAlign: 'center', lineHeight: '1.5' }}>
          Enter your decryption master key. All credentials in the vault are encrypted client-side (Zero-Knowledge) using AES-256-GCM.
        </p>
        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 20px' }}>
          <input
            type="password"
            value={masterKey}
            onChange={e => setMasterKey(e.target.value)}
            placeholder="Decryption Master Key"
            style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', color: '#fff', outline: 'none', fontSize: '13px' }}
            required
          />
          <button type="submit" style={{ background: '#7F77DD', border: 'none', color: '#fff', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            Unlock Vault
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
          🔐 {getTranslation(lang, 'vault')}
        </h2>
        <button
          onClick={() => {
            sessionStorage.removeItem('hj_encryption_key')
            setHasEnteredKey(false)
            setMasterKey('')
          }}
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
        >
          Lock Vault
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 69, 96, 0.1)', border: '1px solid #FF4560', color: '#FF4560', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(57, 255, 20, 0.08)', border: '1px solid #39FF14', color: '#39FF14', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          ✓ {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Left Side: Store New Secret */}
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>Store Encrypted Secret</h3>
            <form onSubmit={handleAddSecret} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>LABEL / NAME</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Domain Admin Password"
                  style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>SECRET VALUE</label>
                <input
                  type="password"
                  value={secretData}
                  onChange={e => setSecretData(e.target.value)}
                  placeholder="Secret key, password, or token"
                  style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>CATEGORY</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="credential">Credential</option>
                    <option value="api_key">API Key</option>
                    <option value="ssh_key">SSH Key</option>
                    <option value="token">Token</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>AUTO-EXPIRE</label>
                  <select
                    value={expiresInHours}
                    onChange={e => setExpiresInHours(e.target.value)}
                    style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="1">1 Hour</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                    <option value="">Never</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>DESCRIPTION / NOTES</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional context..."
                  style={{ width: '100%', height: '60px', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px', resize: 'none' }}
                />
              </div>
              <button type="submit" style={{ background: '#7F77DD', border: 'none', color: '#fff', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
                Encrypt & Save
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Secrets list */}
        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Vault Entries</h3>
          {entries.length === 0 ? (
            <div style={{ padding: '40px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center' }}>
              No active secrets stored.
            </div>
          ) : (
            entries.map(e => (
              <div
                key={e.id}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#7F77DD', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', marginRight: '8px' }}>
                      {e.category}
                    </span>
                    <strong style={{ color: '#fff', fontSize: '14px' }}>{e.label}</strong>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    🗑️
                  </button>
                </div>

                {e.notes && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text2)' }}>
                    Notes: {e.notes}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {e.decryptedData ? (
                    <div style={{
                      flex: 1,
                      background: '#070710',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #39FF14',
                      color: '#39FF14',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}>
                      {e.decryptedData}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDecryptEntry(e)}
                      style={{
                        background: 'rgba(127,119,221,0.1)',
                        border: '1px solid #7F77DD',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      👁️ Decrypt Secret
                    </button>
                  )}
                  {e.expires_at && (
                    <span style={{ fontSize: '10px', color: 'var(--text2)' }}>
                      Expires: {new Date(e.expires_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
