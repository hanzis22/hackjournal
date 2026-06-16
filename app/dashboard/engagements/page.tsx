'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'

interface Engagement {
  id: number
  name: string
  client: string
  scope: string
  status: 'scoping' | 'recon' | 'exploitation' | 'reporting' | 'retesting' | 'complete'
  start_date: string | null
  end_date: string | null
}

const statusLabels: Record<string, string> = {
  scoping: '📋 Scoping',
  recon: '🔍 Reconnaissance',
  exploitation: '⚡ Exploitation',
  reporting: '📝 Reporting',
  retesting: '🔄 Retesting',
  complete: '✅ Complete'
}

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('id')
  
  // Form state
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [scope, setScope] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedEng, setSelectedEng] = useState<Engagement | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLang(getCurrentLang())
    fetchEngagements()
  }, [])

  const fetchEngagements = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/engagements')
      const data = await res.json()
      if (res.ok) {
        setEngagements(data.engagements || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, client, scope,
          status: 'scoping',
          start_date: startDate || null,
          end_date: endDate || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        setName('')
        setClient('')
        setScope('')
        setStartDate('')
        setEndDate('')
        setSuccess('Engagement created successfully!')
        fetchEngagements()
      } else {
        setError(data.error || 'Failed to create engagement')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStatusChange = async (eng: Engagement, newStatus: string) => {
    try {
      const res = await fetch(`/api/engagements/${eng.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eng,
          status: newStatus
        })
      })
      if (res.ok) {
        setSuccess(`Status updated to ${newStatus}`)
        fetchEngagements()
        if (selectedEng && selectedEng.id === eng.id) {
          setSelectedEng({ ...selectedEng, status: newStatus as any })
        }
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

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
          📦 {getTranslation(lang, 'engagements')}
        </h2>
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
        {/* Left Side: Create Engagement */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>Start Pentest Project</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>PROJECT NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Q2 External Network Audit"
                  style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>CLIENT NAME</label>
                <input
                  type="text"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>IP/DOMAIN SCOPE</label>
                <textarea
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                  placeholder="e.g. 192.168.1.0/24, *.acme.org"
                  style={{ width: '100%', height: '80px', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '12px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '9px', color: 'var(--text2)', marginBottom: '4px' }}>START DATE</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', fontSize: '11px', padding: '6px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '9px', color: 'var(--text2)', marginBottom: '4px' }}>END DATE</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', fontSize: '11px', padding: '6px' }} />
                </div>
              </div>
              <button type="submit" style={{ background: '#7F77DD', border: 'none', color: '#fff', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
                Launch Project
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Kanban Board / List */}
        <div style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Project Pipelines</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {engagements.length === 0 ? (
              <div style={{ padding: '40px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center' }}>
                No active projects. Launch one using the form on the left!
              </div>
            ) : (
              engagements.map(e => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEng(e)}
                  style={{
                    background: 'var(--bg2)',
                    border: `1px solid ${selectedEng?.id === e.id ? '#7F77DD' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>{e.name}</span>
                    <select
                      value={e.status}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => handleStatusChange(e, ev.target.value)}
                      style={{
                        background: '#070710',
                        border: '1px solid var(--border)',
                        color: '#39FF14',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    >
                      {Object.entries(statusLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text2)' }}>
                    <span>Client: <strong style={{ color: '#fff' }}>{e.client || 'N/A'}</strong></span>
                    <span>Timeline: {e.start_date || '...'} to {e.end_date || '...'}</span>
                  </div>
                  {selectedEng?.id === e.id && e.scope && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text)' }}>
                      <strong>Scope:</strong>
                      <pre style={{ margin: '6px 0 0 0', background: '#070710', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', color: '#39FF14', overflowX: 'auto' }}>
                        {e.scope}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
