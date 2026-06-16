'use client'
import React, { useEffect, useState } from 'react'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load analytics', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'monospace', color: 'var(--text2)', textAlign: 'center' }}>
        // Loading Telemetry Data...
      </div>
    )
  }

  if (!data) {
    return <div style={{ padding: '40px', color: 'var(--red)', fontFamily: 'monospace' }}>Failed to load analytics.</div>
  }

  const { totalWriteups, difficulty, modes, platforms, activity, topTags } = data

  // Prepare Difficulty Data for SVG Bar Chart
  const maxDiffCount = Math.max(...difficulty.map((d: any) => d.count), 1)
  const diffColors: Record<string, string> = {
    'Easy': 'var(--green)',
    'Medium': 'var(--amber)',
    'Hard': 'var(--red)',
    'Insane': '#ff003c' // very bright red
  }

  // Prepare Activity Timeline Data
  const last30Days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = activity.find((a: any) => a.date.startsWith(dateStr))
    last30Days.push({
      date: dateStr,
      count: found ? found.count : 0
    })
  }
  const maxActivity = Math.max(...last30Days.map(a => a.count), 1)

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', color: 'var(--purple-300)', margin: 0 }}>📊 Dashboard Analytics</h1>
        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Last 30 Days Overview</div>
      </div>

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ color: 'var(--text2)', fontSize: '12px' }}>TOTAL REPORTS</span>
          <span style={{ fontSize: '32px', color: '#fff', fontWeight: 'bold' }}>{totalWriteups}</span>
        </div>
        
        {modes.map((m: any) => (
          <div key={m.writeup_mode} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ color: 'var(--text2)', fontSize: '12px', textTransform: 'uppercase' }}>{m.writeup_mode} MODE</span>
            <span style={{ fontSize: '32px', color: 'var(--purple-400)', fontWeight: 'bold' }}>{m.count}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Activity Timeline (Custom SVG Chart) */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '20px' }}>ACTIVITY TIMELINE</h2>
          <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginTop: '20px' }}>
            {last30Days.map((day, idx) => {
              const heightPct = (day.count / maxActivity) * 100
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', group: 'hover' }} title={`${day.date}: ${day.count} reports`}>
                  <div style={{ 
                    width: '100%', 
                    height: `${Math.max(heightPct, 2)}%`, 
                    background: day.count > 0 ? 'var(--purple-500)' : 'var(--bg3)',
                    borderRadius: '2px 2px 0 0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--purple-300)'} onMouseOut={e => e.currentTarget.style.background = day.count > 0 ? 'var(--purple-500)' : 'var(--bg3)'} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', color: 'var(--text2)' }}>
            <span>{last30Days[0].date}</span>
            <span>{last30Days[last30Days.length-1].date}</span>
          </div>
        </div>

        {/* Difficulty Breakdown (Horizontal Bars) */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '20px' }}>DIFFICULTY SPREAD</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {['Easy', 'Medium', 'Hard', 'Insane'].map(diff => {
              const stat = difficulty.find((d: any) => d.difficulty === diff)
              const count = stat ? stat.count : 0
              const widthPct = maxDiffCount > 0 ? (count / maxDiffCount) * 100 : 0
              return (
                <div key={diff}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: diffColors[diff] || '#fff' }}>{diff}</span>
                    <span style={{ color: 'var(--text2)' }}>{count}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: diffColors[diff] || 'var(--purple-500)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Platforms */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '20px' }}>TOP PLATFORMS / TARGETS</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {platforms.length === 0 && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>No platform data available.</span>}
            {platforms.map((p: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: '#fff' }}>{p.platform}</span>
                <span style={{ fontSize: '12px', color: 'var(--purple-300)', fontWeight: 'bold' }}>{p.count} reports</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tag Cloud */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '20px' }}>FREQUENT TAGS</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topTags.length === 0 && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>No tags available.</span>}
            {topTags.map((t: any) => {
              // Font size based on relative count, min 11px, max 24px
              const maxCount = topTags.length > 0 ? topTags[0].count : 1
              const size = Math.max(11, Math.min(24, 11 + (t.count / maxCount) * 13))
              return (
                <span key={t.name} style={{ 
                  fontSize: `${size}px`, 
                  color: t.count > maxCount * 0.7 ? 'var(--purple-300)' : t.count > maxCount * 0.3 ? 'var(--purple-400)' : 'var(--text2)',
                  padding: '4px 8px',
                  background: 'rgba(127,119,221,0.05)',
                  borderRadius: '4px',
                  border: '1px solid rgba(127,119,221,0.1)'
                }}>
                  #{t.name} ({t.count})
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
