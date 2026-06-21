'use client'
import { useState, useEffect } from 'react'

interface SeverityDashboardProps {
  type: 'team' | 'engagement'
  id: number
}

const colors: Record<string, string> = {
  Critical: '#8b0000', // Dark Red
  High: '#ef4444',     // Red
  Medium: '#f97316',   // Orange
  Low: '#eab308',      // Yellow
  Info: '#3b82f6',     // Blue
  None: '#6b7280'      // Gray
}

export default function SeverityDashboard({ type, id }: SeverityDashboardProps) {
  const [counts, setCounts] = useState<Record<string, number>>({
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Info: 0,
    None: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const endpoint = `/api/${type === 'team' ? 'teams' : 'engagements'}/${id}/findings-summary`
    
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (active && data.counts) {
          setCounts(data.counts)
        }
      })
      .catch(err => console.error('Error fetching findings summary:', err))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [type, id])

  if (loading) {
    return (
      <div style={{ color: 'var(--text2)', fontSize: '11px', fontFamily: 'monospace' }}>
        // Loading findings...
      </div>
    )
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div style={{ padding: '8px 12px', background: '#0e0e1a', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'monospace' }}>
        ℹ️ Belum ada temuan/laporan tercatat.
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a16', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: 'var(--purple-300)', fontWeight: 'bold', fontFamily: 'monospace' }}>
          📊 SEVERITY DISTRIBUTION ({total} TEMUAN)
        </span>
      </div>

      {/* Progress distribution bar */}
      <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#1f1f2e', marginBottom: '16px' }}>
        {Object.entries(counts).map(([key, val]) => {
          if (val === 0) return null
          const pct = ((val / total) * 100).toFixed(1)
          return (
            <div
              key={key}
              style={{
                width: `${pct}%`,
                background: colors[key],
                transition: 'width 0.4s ease-in-out'
              }}
              title={`${key}: ${val} (${pct}%)`}
            />
          )
        })}
      </div>

      {/* Grid items for counts */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([key, val]) => {
          if (val === 0 && key === 'None') return null // skip None if 0
          
          return (
            <div
              key={key}
              style={{
                flex: '1 1 90px',
                background: '#121226',
                border: '1px solid rgba(255,255,255,0.02)',
                borderRadius: '6px',
                padding: '8px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text2)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                {key}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors[key], fontFamily: 'monospace' }}>
                {val}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
