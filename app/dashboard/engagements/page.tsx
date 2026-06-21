'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'
import SeverityDashboard from '@/components/ui/SeverityDashboard'
import { showToast } from '@/components/ui/Toast'
import { 
  FolderOpen, 
  Plus, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Terminal, 
  Calendar, 
  Briefcase, 
  Layers 
} from 'lucide-react'

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
      } else {
        showToast(data.error || 'Failed to fetch engagements', 'error')
      }
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Network error fetching engagements', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

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
        showToast('Engagement created successfully!', 'success')
        fetchEngagements()
      } else {
        showToast(data.error || 'Failed to create engagement', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred', 'error')
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
        showToast(`Status updated to ${newStatus}`, 'success')
        fetchEngagements()
        if (selectedEng && selectedEng.id === eng.id) {
          setSelectedEng({ ...selectedEng, status: newStatus as any })
        }
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to update status', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred', 'error')
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Terminal size={22} style={{ color: 'var(--purple-400)' }} />
          <h2 style={{ color: '#fff', margin: 0, fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            {getTranslation(lang, 'engagements').toUpperCase()}
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        {/* Left Side: Create Engagement */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#0e0e1e', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--purple-300)' }}>
              <Plus size={16} /> Start Pentest Project
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'monospace' }}>PROJECT NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Q2 External Network Audit"
                  style={{ width: '100%', background: '#05050c', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'monospace' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'monospace' }}>CLIENT NAME</label>
                <input
                  type="text"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  style={{ width: '100%', background: '#05050c', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'monospace' }}>IP/DOMAIN SCOPE</label>
                <textarea
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                  placeholder="e.g. 192.168.1.0/24, *.acme.org"
                  style={{ width: '100%', height: '100px', background: '#05050c', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', color: '#fff', fontSize: '13px', resize: 'none', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'monospace' }}>START DATE</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', background: '#05050c', border: '1px solid var(--border)', color: '#fff', fontSize: '12px', padding: '8px 10px', borderRadius: '6px', outline: 'none', fontFamily: 'monospace' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'monospace' }}>END DATE</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', background: '#05050c', border: '1px solid var(--border)', color: '#fff', fontSize: '12px', padding: '8px 10px', borderRadius: '6px', outline: 'none', fontFamily: 'monospace' }} />
                </div>
              </div>
              <button type="submit" style={{ background: 'var(--purple-600)', border: 'none', color: '#fff', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(127,119,221,0.25)', transition: 'background-color 0.2s' }}>
                Launch Project
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Kanban Board / List */}
        <div style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--purple-300)' }}>
            ⚡ Project Pipelines
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              /* Sleek Skeleton Loaders */
              Array.from({ length: 3 }).map((_, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    background: '#0e0e1e', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    animation: 'pulse 1.8s ease-in-out infinite' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '40%', height: '16px', background: '#1c1c38', borderRadius: '4px' }} />
                    <div style={{ width: '80px', height: '22px', background: '#1c1c38', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '30%', height: '12px', background: '#171730', borderRadius: '4px' }} />
                    <div style={{ width: '50%', height: '12px', background: '#171730', borderRadius: '4px' }} />
                  </div>
                </div>
              ))
            ) : engagements.length === 0 ? (
              /* Beautiful Premium Empty State */
              <div 
                style={{ 
                  padding: '48px 32px', 
                  border: '1px dashed var(--border)', 
                  borderRadius: '12px', 
                  color: 'var(--text2)', 
                  textAlign: 'center',
                  background: '#090914',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-400)', marginBottom: '8px' }}>
                  <Briefcase size={24} />
                </div>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  No Active Engagement Pipelines
                </h4>
                <p style={{ margin: '0 max(20px, 10%)', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', maxWidth: '380px' }}>
                  Start by launching a new penetration testing project using the scoping form on the left. This will allow you to link reports and track severity metrics.
                </p>
              </div>
            ) : (
              engagements.map(e => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEng(e)}
                  style={{
                    background: '#0e0e1e',
                    border: `1px solid ${selectedEng?.id === e.id ? 'var(--purple-500)' : 'var(--border)'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: selectedEng?.id === e.id ? '0 8px 24px rgba(127,119,221,0.15)' : 'none',
                  }}
                  className="engagement-card-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={14} style={{ color: 'var(--purple-400)' }} />
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px', fontFamily: 'monospace' }}>{e.name}</span>
                    </div>
                    <select
                      value={e.status}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => handleStatusChange(e, ev.target.value)}
                      style={{
                        background: '#05050c',
                        border: '1px solid var(--border)',
                        color: 'var(--purple-300)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      {Object.entries(statusLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: 'var(--text2)', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={12} /> Client: <strong style={{ color: '#fff' }}>{e.client || 'N/A'}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                      <Calendar size={12} /> {e.start_date || '...'} to {e.end_date || '...'}
                    </span>
                  </div>

                  {selectedEng?.id === e.id && e.scope && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--purple-300)', fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px' }}>
                        <Terminal size={12} /> SCOPE DETAILS:
                      </div>
                      <pre style={{ margin: '6px 0 0 0', background: '#05050c', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', color: '#39FF14', overflowX: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}>
                        {e.scope}
                      </pre>
                    </div>
                  )}

                  <SeverityDashboard type="engagement" id={e.id} />
                  
                  {selectedEng?.id === e.id && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/dashboard/engagements/${e.id}/war-room`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255, 69, 96, 0.1)',
                          border: '1px solid #FF4560',
                          color: '#FF4560',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                          fontFamily: 'monospace'
                        }}
                      >
                        ⚡ ENTER LIVE WAR-ROOM
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .engagement-card-hover:hover {
          border-color: rgba(127, 119, 221, 0.6) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  )
}
