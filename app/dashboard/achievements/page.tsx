'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'

interface Achievement {
  key: string
  title: string
  description: string
  badge: string
  color: string
}

const allBadges: Achievement[] = [
  { key: 'first_writeup', title: '🏅 Doc Writer', description: 'Create your very first writeup', badge: '📝', color: '#39FF14' },
  { key: 'xp_100', title: '⭐ Rising Star', description: 'Reach 100 XP', badge: '✨', color: '#00D8FF' },
  { key: 'xp_500', title: '🛡️ Advanced Elite', description: 'Reach 500 XP', badge: '🔥', color: '#FF9F00' },
  { key: 'xp_1000', title: '👑 Grand Master', description: 'Reach 1000 XP', badge: '👑', color: '#FF007F' },
  { key: 'engagement_master', title: '🎯 Campaign Completed', description: 'Complete a full penetration testing engagement', badge: '🚀', color: '#7F77DD' }
]

export default function AchievementsPage() {
  const [user, setUser] = useState<any>(null)
  const [lang, setLang] = useState<Lang>('id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLang(getCurrentLang())
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', fontFamily: 'monospace' }}>
        {getTranslation(lang, 'loading')}
      </div>
    )
  }

  const xp = user?.xp || 0
  const level = Math.floor(xp / 100) + 1
  const currentLevelXp = xp % 100
  const progressPercent = Math.min(100, currentLevelXp)

  const unlockedKeys = user?.achievements || []

  // Simulated Leaderboard
  const leaderboard = [
    { username: 'root_hacker', level: 12, xp: 1150, current: true },
    { username: 'cipher_sec', level: 9, xp: 820 },
    { username: user?.username || 'you', level: level, xp: xp, active: true },
    { username: 'net_crawler', level: 4, xp: 350 },
    { username: 'novice_script', level: 1, xp: 50 }
  ].sort((a, b) => b.xp - a.xp)

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
          🏆 {getTranslation(lang, 'achievementsList')}
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {/* Profile Card / XP Progress */}
        <div style={{ flex: '1 1 400px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#7F77DD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#fff',
              boxShadow: '0 0 15px rgba(127,119,221,0.4)'
            }}>
              {level}
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>@{user?.username}</h3>
              <span style={{ fontSize: '12px', color: '#7F77DD', fontWeight: 'bold' }}>RANK: LEVEL {level} RESEARCHER</span>
            </div>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)' }}>
            <span>XP Progress ({currentLevelXp} / 100 XP)</span>
            <span>Total: {xp} XP</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#070710', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '8px' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#7F77DD', boxShadow: '0 0 8px #7F77DD', transition: 'width 0.4s ease' }}></div>
          </div>
        </div>

        {/* Global Leaderboard */}
        <div style={{ flex: '1 1 300px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>📈 {getTranslation(lang, 'leaderboard')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leaderboard.map((item, index) => (
              <div
                key={item.username}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: item.active ? 'rgba(127,119,221,0.12)' : '#070710',
                  borderRadius: '6px',
                  border: `1px solid ${item.active ? '#7F77DD' : 'var(--border)'}`,
                  fontSize: '12px'
                }}
              >
                <span style={{ color: item.active ? '#fff' : 'var(--text2)' }}>
                  {index + 1}. @{item.username} {item.active ? '(You)' : ''}
                </span>
                <span style={{ color: '#39FF14', fontWeight: 'bold' }}>Lvl {item.level} ({item.xp} XP)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px' }}>Available Badges</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {allBadges.map(badge => {
          const unlocked = unlockedKeys.includes(badge.key)
          return (
            <div
              key={badge.key}
              style={{
                flex: '1 1 200px',
                background: 'var(--bg2)',
                border: `1px solid ${unlocked ? badge.color : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '16px',
                opacity: unlocked ? 1 : 0.4,
                textAlign: 'center',
                transition: 'all 0.2s',
                boxShadow: unlocked ? `0 0 10px ${badge.color}15` : 'none'
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>{badge.badge}</div>
              <h4 style={{ margin: '0 0 6px 0', color: unlocked ? '#fff' : 'var(--text2)', fontSize: '14px' }}>{badge.title}</h4>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>{badge.description}</p>
              <div style={{ marginTop: '12px', fontSize: '10px', fontWeight: 'bold', color: unlocked ? badge.color : 'var(--text2)' }}>
                {unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
