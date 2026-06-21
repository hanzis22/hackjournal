'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'
import { showToast } from '@/components/ui/Toast'

interface Finding {
  id: number
  title: string
  severity: string
  description: string
  remediation: string
  created_at: string
}

interface Writeup {
  id: number
  title: string
  writeup_mode: string
}

export default function LibraryPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [writeups, setWriteups] = useState<Writeup[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('id')

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [askAI, setAskAI] = useState(false)
  const [searching, setSearching] = useState(false)

  // Creation Form State
  const [newTitle, setNewTitle] = useState('')
  const [newSeverity, setNewSeverity] = useState('Medium')
  const [newDescription, setNewDescription] = useState('')
  const [newRemediation, setNewRemediation] = useState('')
  const [saving, setSaving] = useState(false)

  // Selection for Import
  const [selectedWriteupId, setSelectedWriteupId] = useState<number | ''>('')
  const [importingId, setImportingId] = useState<number | null>(null)

  useEffect(() => {
    setLang(getCurrentLang())
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      // 1. Fetch user's teams
      const teamsRes = await fetch('/api/teams')
      const teamsData = await teamsRes.json()
      const userTeams = teamsData.teams || []
      setTeams(userTeams)

      let activeTeamId = null
      if (userTeams.length > 0) {
        activeTeamId = userTeams[0].id
        setSelectedTeamId(activeTeamId)
      } else {
        setFindings([])
        setLoading(false)
        return
      }

      // 2. Load findings for this active team
      const findingsRes = await fetch(`/api/library?team_id=${activeTeamId}`)
      const findingsData = await findingsRes.json()
      if (findingsRes.ok) {
        setFindings(findingsData.findings || [])
      }

      // 3. Load editable writeups
      const writeupsRes = await fetch('/api/writeups')
      const writeupsData = await writeupsRes.json()
      if (writeupsRes.ok) {
        // filter writeups that are still editable (draft or undefined status)
        const activeWriteups = (writeupsData.writeups || []).filter(
          (w: any) => !w.status || w.status === 'draft'
        )
        setWriteups(activeWriteups)
      }
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat data awal', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTeamChange = async (teamId: number) => {
    setSelectedTeamId(teamId)
    setLoading(true)
    try {
      const res = await fetch(`/api/library?team_id=${teamId}`)
      const data = await res.json()
      if (res.ok) {
        setFindings(data.findings || [])
      }
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat findings untuk tim ini', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeamId) {
      showToast('Silakan pilih tim terlebih dahulu', 'warning')
      return
    }
    setSearching(true)
    try {
      const url = searchQuery.trim()
        ? `/api/library?team_id=${selectedTeamId}&query=${encodeURIComponent(searchQuery.trim())}`
        : `/api/library?team_id=${selectedTeamId}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setFindings(data.findings || [])
        if (searchQuery.trim()) {
          showToast(`Berhasil menemukan ${data.findings?.length || 0} temuan`, 'success')
        }
      }
    } catch (err) {
      console.error(err)
      showToast('Pencarian gagal', 'error')
    } finally {
      setSearching(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newDescription.trim() || !newRemediation.trim()) return
    if (!selectedTeamId) {
      showToast('Silakan pilih tim terlebih dahulu', 'warning')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          severity: newSeverity,
          description: newDescription.trim(),
          remediation: newRemediation.trim(),
          team_id: selectedTeamId
        })
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Template temuan berhasil disimpan ke Library!', 'success')
        setNewTitle('')
        setNewDescription('')
        setNewRemediation('')
        // Reload list
        const reloadRes = await fetch(`/api/library?team_id=${selectedTeamId}`)
        const reloadData = await reloadRes.json()
        if (reloadRes.ok) setFindings(reloadData.findings || [])
      } else {
        showToast(data.error || 'Gagal menyimpan template', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan koneksi', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleImportToWriteup = async (findingId: number) => {
    if (!selectedWriteupId) {
      showToast('Silakan pilih target laporan terlebih dahulu', 'warning')
      return
    }

    setImportingId(findingId)
    try {
      const res = await fetch(`/api/writeups/${selectedWriteupId}/findings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library_id: findingId })
      })

      const data = await res.json()
      if (res.ok) {
        showToast(data.message || 'Template temuan berhasil diimpor!', 'success')
      } else {
        showToast(data.error || 'Gagal mengimpor temuan', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Koneksi terputus', 'error')
    } finally {
      setImportingId(null)
    }
  }

  const sevColor: Record<string, string> = {
    Critical: '#AF69EF',
    High: '#FF4560',
    Medium: '#F0A500',
    Low: '#39FF14',
    None: '#888'
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', fontFamily: 'monospace' }}>
        Memuat Findings Library...
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '80px auto', textAlign: 'center', background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: '12px', fontFamily: 'monospace' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ color: '#fff', margin: '0 0 8px 0' }}>Tidak Ada Akses Tim</h3>
        <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
          Findings Library diisolasi secara ketat berdasarkan tim untuk menjaga kerahasiaan PoC dan temuan zero-day. Anda harus bergabung atau membuat tim terlebih dahulu sebelum dapat mengakses library ini.
        </p>
        <a
          href="/dashboard/teams"
          style={{
            display: 'inline-block',
            background: '#7F77DD',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          Pergi ke Pengaturan Tim
        </a>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'monospace' }}>
      
      {/* Page Title */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📚 Global Findings Library & AI
          </h2>
          <p style={{ color: 'var(--text2)', margin: '4px 0 0 0', fontSize: '12px' }}>
            Simpan, cari, dan kelola template temuan kerentanan secara semantik menggunakan AI Vector Engine.
          </p>
        </div>

        {/* Team Selector Dropdown */}
        {teams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg2)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 'bold' }}>PILIH TIM:</span>
            <select
              value={selectedTeamId || ''}
              onChange={e => handleTeamChange(Number(e.target.value))}
              style={{
                background: '#070710',
                border: '1px solid var(--border)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Left Panel: Search & Creation Form */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* AI Search Widget */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔍 Pencarian AI & Semantik
            </h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={askAI ? "Cari konsep (misal: 'bypass otentikasi JWT')..." : "Cari berdasarkan judul..."}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px 14px', color: '#fff', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={searching}
                  style={{
                    background: '#7F77DD',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {searching ? 'Mencari...' : 'Cari'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px', color: 'var(--text2)' }}>
                  <input
                    type="checkbox"
                    checked={askAI}
                    onChange={e => setAskAI(e.target.checked)}
                    style={{ marginRight: '6px', accentColor: '#7F77DD' }}
                  />
                  Gunakan Pencarian AI Semantik (Ask AI)
                </label>
              </div>
            </form>
          </div>

          {/* Create Template Form */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '14px' }}>
              ➕ Buat Template Temuan Baru
            </h3>
            <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>JUDUL TEMUAN</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Broken Object Level Authorization (BOLA)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>TINGKAT KEPARAHAN (SEVERITY)</label>
                <select
                  value={newSeverity}
                  onChange={e => setNewSeverity(e.target.value)}
                  style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Info">Info</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>DESKRIPSI & IMPAK</label>
                <textarea
                  required
                  placeholder="Jelaskan bagaimana kerentanan bekerja dan dampak buruknya..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  style={{ width: '100%', height: '100px', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>REMEDIASI / REKOMENDASI</label>
                <textarea
                  required
                  placeholder="Langkah penanganan teknis untuk memperbaiki celah..."
                  value={newRemediation}
                  onChange={e => setNewRemediation(e.target.value)}
                  style={{ width: '100%', height: '80px', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#7F77DD',
                  border: 'none',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan ke Library'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel: Scrollable Findings List */}
        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>
              📚 Hasil Temuan ({findings.length})
            </h3>
            
            {/* Global Import Target Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text2)' }}>TARGET LAPORAN:</span>
              <select
                value={selectedWriteupId}
                onChange={e => setSelectedWriteupId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  background: '#070710',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxWidth: '220px'
                }}
              >
                <option value="">-- Pilih Laporan --</option>
                {writeups.map(w => (
                  <option key={w.id} value={w.id}>
                    [{w.writeup_mode.toUpperCase()}] {w.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {findings.length === 0 ? (
            <div style={{ padding: '60px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center' }}>
              Tidak ada template temuan yang cocok atau tersimpan di library.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '800px', overflowY: 'auto', paddingRight: '6px' }}>
              {findings.map(finding => (
                <div
                  key={finding.id}
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '18px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          background: `rgba(${finding.severity === 'Critical' ? '175,105,239' : finding.severity === 'High' ? '255,69,96' : '240,165,0'}, 0.12)`,
                          border: `1px solid ${sevColor[finding.severity] || '#888'}`,
                          color: sevColor[finding.severity] || '#fff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          marginRight: '8px'
                        }}
                      >
                        {finding.severity}
                      </span>
                      <strong style={{ color: '#fff', fontSize: '15px' }}>{finding.title}</strong>
                    </div>

                    <button
                      onClick={() => handleImportToWriteup(finding.id)}
                      disabled={importingId === finding.id}
                      style={{
                        background: selectedWriteupId ? '#39FF14' : 'rgba(255,255,255,0.05)',
                        border: selectedWriteupId ? 'none' : '1px solid var(--border)',
                        color: selectedWriteupId ? '#000' : 'var(--text2)',
                        padding: '5px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: selectedWriteupId ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {importingId === finding.id ? 'Mengimpor...' : '⚡ Gunakan Template'}
                    </button>
                  </div>

                  <div style={{ margin: '12px 0', fontSize: '12px', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    <strong>Deskripsi:</strong>
                    <div dangerouslySetInnerHTML={{ __html: finding.description }} style={{ marginTop: '4px', color: 'var(--text2)' }} />
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    <strong>Rekomendasi:</strong>
                    <div dangerouslySetInnerHTML={{ __html: finding.remediation }} style={{ marginTop: '4px', color: 'var(--text2)' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', fontSize: '9px', color: 'var(--text3)' }}>
                    Disimpan pada: {new Date(finding.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
