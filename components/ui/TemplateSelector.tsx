'use client'
import { useState, useEffect } from 'react'
import { BUILTIN_TEMPLATES, WriteupTemplate } from '@/lib/templates'

interface TemplateSelectorProps {
  onSelect: (template: WriteupTemplate) => void
  onClose: () => void
  teamId?: number | null
}

export default function TemplateSelector({ onSelect, onClose, teamId }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<WriteupTemplate[]>(BUILTIN_TEMPLATES)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTemplates() {
      try {
        const fetchUrls = ['/api/templates']
        if (teamId) {
          fetchUrls.push(`/api/templates?scope=team&team_id=${teamId}`)
        }

        const responses = await Promise.all(fetchUrls.map(url => fetch(url)))
        const results = await Promise.all(responses.map(res => res.ok ? res.json() : { templates: [] }))

        const personalData = results[0]?.templates || results[0] || []
        const teamData = results[1]?.templates || results[1] || []

        const mappedPersonal = personalData.map((t: any) => {
          if (t.is_builtin === 1) return null // Already in BUILTIN
          
          let parsedData = {}
          try {
            parsedData = typeof t.template_data === 'string' ? JSON.parse(t.template_data) : t.template_data
          } catch {
            parsedData = { content: t.template_data }
          }

          return {
            id: `custom-${t.id}`,
            name: t.name,
            description: t.description || 'Custom user template',
            writeup_mode: t.writeup_mode,
            title_pattern: t.name,
            default_tags: 'custom-template',
            ...parsedData
          }
        }).filter(Boolean)

        const mappedTeam = teamData.map((t: any) => {
          let parsedData = {}
          try {
            parsedData = typeof t.template_data === 'string' ? JSON.parse(t.template_data) : t.template_data
          } catch {
            parsedData = { content: t.template_data }
          }

          return {
            id: `team-${t.id}`,
            name: t.name,
            description: t.description || 'Team template',
            writeup_mode: t.writeup_mode,
            title_pattern: t.name,
            default_tags: 'team-template',
            is_team: true,
            ...parsedData
          }
        })

        setTemplates([...BUILTIN_TEMPLATES, ...mappedPersonal, ...mappedTeam])
      } catch (err) {
        console.error('Failed to fetch templates:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTemplates()
  }, [teamId])

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(127,119,221,0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
            📑 PILIH TEMPLATE WRITEUP
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text2)',
              fontSize: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
          <input
            type="text"
            placeholder="Cari template (misal: HTB, Bug Bounty, CVE)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px 14px',
              color: 'var(--text)',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
        </div>

        {/* Templates list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="template-card"
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: t.writeup_mode === 'cve' ? 'var(--red)' : 'var(--green)',
                    background: t.writeup_mode === 'cve' ? 'rgba(255,69,96,0.1)' : 'rgba(57,255,20,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: t.writeup_mode === 'cve' ? '1px solid rgba(255,69,96,0.2)' : '1px solid rgba(57,255,20,0.2)'
                  }}>
                    {t.writeup_mode === 'cve' ? 'Mode CVE' : 'Mode Jurnal'}
                  </span>
                  {t.id.startsWith('custom-') && (
                    <span style={{ fontSize: '9px', color: 'var(--purple-300)', background: 'rgba(127,119,221,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      Kustom
                    </span>
                  )}
                  {t.is_team && (
                    <span style={{ fontSize: '9px', color: 'var(--amber)', background: 'rgba(255,191,0,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,191,0,0.2)' }}>
                      Tim
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{t.name}</h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text2)', lineHeight: '1.5' }}>{t.description}</p>
              </div>

              <div style={{ fontSize: '10px', color: 'var(--purple-400)', fontWeight: 'bold', textAlign: 'right' }}>
                Gunakan Template ➔
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: '13px' }}>
              Tidak menemukan template dengan kata kunci "{search}".
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .template-card:hover {
          border-color: var(--purple-500) !important;
          box-shadow: 0 4px 15px rgba(127,119,221,0.15);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  )
}
