'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'
import { encryptPayload, decryptPayload } from '@/lib/cryptoClient'
import CustomModal from '@/components/ui/CustomModal'
import { showToast } from '@/components/ui/Toast'

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
  team_id?: number | null
  engagement_id?: number | null
  decryptedData?: string
}

interface Team {
  id: number
  name: string
  role: string
}

interface Engagement {
  id: number
  name: string
  team_id: number | null
}

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('id')
  
  // Teams & Engagements
  const [teams, setTeams] = useState<Team[]>([])
  const [engagements, setEngagements] = useState<Engagement[]>([])

  // Scope & Filter State
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal')
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('')
  const [selectedEngagementId, setSelectedEngagementId] = useState<number | ''>('')

  // Password for new secret creation
  const [decryptionPassword, setDecryptionPassword] = useState('')

  // Form state
  const [label, setLabel] = useState('')
  const [secretData, setSecretData] = useState('')
  const [category, setCategory] = useState('credential')
  const [notes, setNotes] = useState('')
  const [expiresInHours, setExpiresInHours] = useState('24')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Reusable modal state supporting prompts and confirmations
  const [modalConfig, setModalConfig] = useState<{
    type: 'prompt' | 'confirm'
    title: string
    message?: string
    placeholder?: string
    initialValue?: string
    onConfirm: (value?: string) => void
  } | null>(null)

  useEffect(() => {
    setLang(getCurrentLang())
    fetchTeamsAndEngagements()
  }, [])

  const fetchTeamsAndEngagements = async () => {
    try {
      const teamsRes = await fetch('/api/teams')
      const teamsData = await teamsRes.json()
      if (teamsRes.ok && teamsData.teams) {
        setTeams(teamsData.teams)
        if (teamsData.teams.length > 0) {
          setSelectedTeamId(teamsData.teams[0].id)
        }
      }

      const engsRes = await fetch('/api/engagements?limit=100')
      const engsData = await engsRes.json()
      if (engsRes.ok && engsData.engagements) {
        setEngagements(engsData.engagements)
      }
    } catch (err) {
      console.error('Failed to load teams or engagements', err)
    }
  }

  useEffect(() => {
    fetchVault(true, activeTab, selectedTeamId)
  }, [activeTab, selectedTeamId])

  const fetchVault = async (showLoading = false, tab = activeTab, teamId = selectedTeamId) => {
    if (showLoading) setLoading(true)
    try {
      let url = '/api/vault'
      if (tab === 'team') {
        if (!teamId) {
          setEntries([])
          if (showLoading) setLoading(false)
          return
        }
        url = `/api/vault?scope=team&team_id=${teamId}&t=${Date.now()}`
      } else {
        url = `/api/vault?t=${Date.now()}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setEntries(data.vault || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !secretData.trim() || !decryptionPassword.trim()) return

    if (activeTab === 'team' && !selectedTeamId) {
      setError('Pilih Tim terlebih dahulu untuk menyimpan secret ke Team Vault.')
      return
    }

    setError('')
    setSuccess('')
    try {
      // Encrypt client-side using the secret's custom decryption password
      const encrypted = await encryptPayload(decryptionPassword, secretData.trim())

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
          expires_in_hours: expiresInHours ? Number(expiresInHours) : null,
          team_id: activeTab === 'team' && selectedTeamId ? Number(selectedTeamId) : null,
          engagement_id: activeTab === 'team' && selectedEngagementId ? Number(selectedEngagementId) : null
        })
      })

      const data = await res.json()
      if (res.ok) {
        setLabel('')
        setSecretData('')
        setDecryptionPassword('')
        setNotes('')
        setSelectedEngagementId('')
        setSuccess('Rahasia berhasil dienkripsi dan disimpan!')
        fetchVault()
      } else {
        setError(data.error || 'Gagal menyimpan rahasia')
      }
    } catch (err: any) {
      setError('Enkripsi gagal: ' + err.message)
    }
  }

  const handleCopy = async (entryId: number, text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Kredensial disalin ke clipboard!', 'success')
    try {
      await fetch(`/api/vault/${entryId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copied' })
      })
    } catch (err) {
      console.error('Failed to log copy action:', err)
    }
  }

  const handleHideEntry = (id: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, decryptedData: undefined } : e))
  }

  const triggerDecryptPrompt = (entry: VaultEntry) => {
    setModalConfig({
      type: 'prompt',
      title: '🔑 Masukkan Password Dekripsi',
      message: `Masukkan password khusus yang Anda buat untuk membuka rahasia "${entry.label}":`,
      placeholder: 'Password dekripsi...',
      onConfirm: async (password) => {
        if (!password?.trim()) return
        setModalConfig(null)
        try {
          const decrypted = await decryptPayload(
            password.trim(),
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

          // Log reveal action in the background
          fetch(`/api/vault/${entry.id}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'revealed' })
          }).catch(err => console.error('Failed to log reveal action:', err))

          // Auto-hide after 20 seconds
          setTimeout(() => {
            setEntries(prev => prev.map(e => {
              if (e.id === entry.id && e.decryptedData === decrypted) {
                return { ...e, decryptedData: undefined }
              }
              return e
            }))
          }, 20000)
        } catch (err) {
          showToast('Password salah! Gagal mendekripsi kredensial.', 'error')
        }
      }
    })
  }

  const handleDelete = async (id: number) => {
    setModalConfig({
      type: 'confirm',
      title: '⚠️ Hapus Secret',
      message: 'Apakah Anda yakin ingin menghapus secret ini dari vault?',
      onConfirm: async () => {
        setModalConfig(null)
        try {
          const res = await fetch(`/api/vault/${id}`, {
            method: 'DELETE'
          })
          if (res.ok) {
            setSuccess('Secret deleted successfully.')
            fetchVault()
          } else {
            const data = await res.json()
            setError(data.error || 'Failed to delete secret')
          }
        } catch (err) {
          console.error(err)
        }
      }
    })
  }

  const filteredEngagements = engagements.filter(
    eng => eng.team_id === (selectedTeamId || null)
  )

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', fontFamily: 'monospace' }}>
        {getTranslation(lang, 'loading')}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
          🔐 {getTranslation(lang, 'vault')}
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('personal')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'personal' ? '#7F77DD' : 'var(--bg2)',
            border: '1px solid var(--border)',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          📁 Personal Vault
        </button>
        <button
          onClick={() => setActiveTab('team')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'team' ? '#7F77DD' : 'var(--bg2)',
            border: '1px solid var(--border)',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          👥 Team Vault
        </button>
      </div>

      {/* Team Filter for Team Vault Tab */}
      {activeTab === 'team' && (
        <div style={{ marginBottom: '24px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 'bold' }}>SELECT TEAM:</span>
          <select
            value={selectedTeamId}
            onChange={e => {
              setSelectedTeamId(e.target.value ? Number(e.target.value) : '')
              setSelectedEngagementId('')
            }}
            style={{
              background: '#070710',
              border: '1px solid var(--border)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {teams.length === 0 ? (
              <option value="">No teams available</option>
            ) : (
              teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
              ))
            )}
          </select>
        </div>
      )}

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
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>
              Store Encrypted Secret ({activeTab === 'personal' ? 'Personal' : 'Team'})
            </h3>
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
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>DECRYPTION PASSWORD</label>
                <input
                  type="password"
                  value={decryptionPassword}
                  onChange={e => setDecryptionPassword(e.target.value)}
                  placeholder="Set custom password to decrypt this secret"
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

              {activeTab === 'team' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>ENGAGEMENT (OPTIONAL)</label>
                  <select
                    value={selectedEngagementId}
                    onChange={e => setSelectedEngagementId(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="">No Engagement (Shared with Team)</option>
                    {filteredEngagements.map(eng => (
                      <option key={eng.id} value={eng.id}>{eng.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
            {activeTab === 'personal' ? 'Personal' : 'Team'} Vault Entries
          </h3>
          {entries.length === 0 ? (
            <div style={{ padding: '40px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center' }}>
              No active secrets stored.
            </div>
          ) : (
            entries.map(e => {
              const matchedTeam = teams.find(t => t.id === e.team_id)
              const matchedEng = engagements.find(eng => eng.id === e.engagement_id)
              return (
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
                      
                      {/* Shared Badges */}
                      <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {e.team_id && (
                          <span style={{ fontSize: '10px', background: 'rgba(127, 119, 221, 0.15)', border: '1px solid #7F77DD', color: '#9d96eb', padding: '2px 6px', borderRadius: '4px' }}>
                            👥 Team: {matchedTeam ? matchedTeam.name : `ID ${e.team_id}`}
                          </span>
                        )}
                        {e.engagement_id && (
                          <span style={{ fontSize: '10px', background: 'rgba(57, 255, 20, 0.15)', border: '1px solid #39FF14', color: '#39FF14', padding: '2px 6px', borderRadius: '4px' }}>
                            📦 Eng: {matchedEng ? matchedEng.name : `ID ${e.engagement_id}`}
                          </span>
                        )}
                      </div>
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

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                    {e.decryptedData ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                        <div style={{
                          flex: 1,
                          background: '#070710',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: '1px solid #39FF14',
                          color: '#39FF14',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                          minWidth: '200px'
                        }}>
                          {e.decryptedData}
                        </div>
                        <button
                          onClick={() => handleCopy(e.id, e.decryptedData!)}
                          style={{
                            background: 'rgba(57, 255, 20, 0.1)',
                            border: '1px solid #39FF14',
                            color: '#39FF14',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => handleHideEntry(e.id)}
                          style={{
                            background: 'rgba(255, 69, 96, 0.1)',
                            border: '1px solid #FF4560',
                            color: '#FF4560',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          🔒 Hide
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerDecryptPrompt(e)}
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
              )
            })
          )}
        </div>
      </div>
      {modalConfig && (
        <CustomModal
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          placeholder={modalConfig.placeholder}
          initialValue={modalConfig.initialValue}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  )
}
