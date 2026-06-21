'use client'
import { useState, useEffect, use } from 'react'
import { showToast } from '@/components/ui/Toast'

interface LeaderboardMember {
  user_id: number
  username: string
  email: string
  role: string
  score: number
  skills: {
    web: number
    infra: number
    cloud: number
    api: number
  }
}

interface AnalyticsData {
  team_id: number
  leaderboard: LeaderboardMember[]
  totals: {
    writeups: number
    comments: number
    tasks: number
    resolved_tasks: number
  }
}

export default function TeamAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const teamId = Number(resolvedParams.id)

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [teamId])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/analytics?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) {
        setAnalytics(data.analytics)
      } else {
        showToast(data.error || 'Gagal memuat analitik tim', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Masalah jaringan', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', fontFamily: 'monospace' }}>
        Memuat Analitik Kompetensi Tim...
      </div>
    )
  }

  if (!analytics) {
    return (
      <div style={{ padding: '40px', color: 'var(--red)', fontFamily: 'monospace' }}>
        Gagal memuat analitik tim atau Anda tidak memiliki akses.
      </div>
    )
  }

  // Calculate top skills for overall team competency representation
  let totalWeb = 0, totalInfra = 0, totalCloud = 0, totalApi = 0
  analytics.leaderboard.forEach(m => {
    totalWeb += m.skills.web
    totalInfra += m.skills.infra
    totalCloud += m.skills.cloud
    totalApi += m.skills.api
  })
  const totalCompetencyPoints = totalWeb + totalInfra + totalCloud + totalApi || 1

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'monospace', color: '#fff' }}>
      
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#7F77DD', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Team Analytics & Skill-Gap Profile
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
          Automated weighted developer leaderboards and vulnerability category skills mapping.
        </span>
      </div>

      {/* Grid for Stats and Competency Map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Total Activity Metrics Card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '14px' }}>📈 TOTAL TEAM ACTIVITY</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#0e0e1e', padding: '12px', borderRadius: '6px', border: '1px solid var(--border2)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text2)' }}>WRITEUPS DELIVERED</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7F77DD', marginTop: '4px' }}>
                {analytics.totals.writeups}
              </div>
            </div>
            <div style={{ background: '#0e0e1e', padding: '12px', borderRadius: '6px', border: '1px solid var(--border2)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text2)' }}>COLLABORATIVE COMMENTS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7F77DD', marginTop: '4px' }}>
                {analytics.totals.comments}
              </div>
            </div>
            <div style={{ background: '#0e0e1e', padding: '12px', borderRadius: '6px', border: '1px solid var(--border2)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text2)' }}>TASK ASSIGNMENTS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7F77DD', marginTop: '4px' }}>
                {analytics.totals.tasks}
              </div>
            </div>
            <div style={{ background: '#0e0e1e', padding: '12px', borderRadius: '6px', border: '1px solid var(--border2)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text2)' }}>TASKS RESOLVED</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#39FF14', marginTop: '4px' }}>
                {analytics.totals.resolved_tasks} / {analytics.totals.tasks}
              </div>
            </div>
          </div>
        </div>

        {/* Global Competency Vectors */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '14px' }}>🕸️ TEAM SKILL PROFILE</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span>Web Application Hacking</span>
                <span style={{ color: '#7F77DD' }}>{Math.round((totalWeb / totalCompetencyPoints) * 100)}%</span>
              </div>
              <div style={{ width: '100%', background: '#070710', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(totalWeb / totalCompetencyPoints) * 100}%`, background: '#7F77DD', height: '100%' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span>Infrastructure & Network pentest</span>
                <span style={{ color: '#39FF14' }}>{Math.round((totalInfra / totalCompetencyPoints) * 100)}%</span>
              </div>
              <div style={{ width: '100%', background: '#070710', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(totalInfra / totalCompetencyPoints) * 100}%`, background: '#39FF14', height: '100%' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span>Cloud & Container Security</span>
                <span style={{ color: '#FF4560' }}>{Math.round((totalCloud / totalCompetencyPoints) * 100)}%</span>
              </div>
              <div style={{ width: '100%', background: '#070710', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(totalCloud / totalCompetencyPoints) * 100}%`, background: '#FF4560', height: '100%' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span>API & Token Exploits</span>
                <span style={{ color: '#F0A500' }}>{Math.round((totalApi / totalCompetencyPoints) * 100)}%</span>
              </div>
              <div style={{ width: '100%', background: '#070710', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(totalApi / totalCompetencyPoints) * 100}%`, background: '#F0A500', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Leaderboard Table Grid */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>
          🏆 TEAM CONTRIBUTION LEADERBOARD
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text2)' }}>
                <th style={{ padding: '12px 8px' }}>RANK</th>
                <th style={{ padding: '12px 8px' }}>MEMBER</th>
                <th style={{ padding: '12px 8px' }}>ROLE</th>
                <th style={{ padding: '12px 8px' }}>WEB</th>
                <th style={{ padding: '12px 8px' }}>INFRA</th>
                <th style={{ padding: '12px 8px' }}>CLOUD</th>
                <th style={{ padding: '12px 8px' }}>API</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>TOTAL WEIGHTED SCORE</th>
              </tr>
            </thead>
            <tbody>
              {analytics.leaderboard.map((member, index) => {
                let rankBadge = `${index + 1}`
                if (index === 0) rankBadge = '🥇'
                else if (index === 1) rankBadge = '🥈'
                else if (index === 2) rankBadge = '🥉'

                return (
                  <tr key={member.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: index === 0 ? 'rgba(127,119,221,0.02)' : 'transparent' }}>
                    <td style={{ padding: '14px 8px', fontSize: '14px', fontWeight: 'bold' }}>{rankBadge}</td>
                    <td style={{ padding: '14px 8px' }}>
                      <strong style={{ color: '#fff' }}>@{member.username}</strong>
                      <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{member.email}</div>
                    </td>
                    <td style={{ padding: '14px 8px', textTransform: 'uppercase', color: 'var(--text2)' }}>{member.role}</td>
                    <td style={{ padding: '14px 8px', color: '#7F77DD', fontWeight: 'bold' }}>{member.skills.web}</td>
                    <td style={{ padding: '14px 8px', color: '#39FF14', fontWeight: 'bold' }}>{member.skills.infra}</td>
                    <td style={{ padding: '14px 8px', color: '#FF4560', fontWeight: 'bold' }}>{member.skills.cloud}</td>
                    <td style={{ padding: '14px 8px', color: '#F0A500', fontWeight: 'bold' }}>{member.skills.api}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: index === 0 ? '#39FF14' : '#fff' }}>
                      {member.score} pts
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
