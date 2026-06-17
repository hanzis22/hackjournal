'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'

interface Team {
  id: number
  name: string
  owner_id: number
  role: 'owner' | 'editor' | 'viewer'
  owner_name: string
  members_count: number
}

interface Member {
  id: number
  role: string
  joined_at: string
  user_id: number
  username: string
  email: string
  avatar: string | null
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [lang, setLang] = useState<Lang>('id')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLang(getCurrentLang())
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/teams?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) {
        setTeams(data.teams || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName })
      })
      const data = await res.json()
      if (res.ok) {
        setNewTeamName('')
        setSuccess('Team created successfully!')
        fetchTeams()
      } else {
        setError(data.error || 'Failed to create team')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchMembers = async (teamId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectTeam = (t: Team) => {
    setSelectedTeam(t)
    setMembers([])
    fetchMembers(t.id)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteUsername.trim() || !selectedTeam) return

    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: inviteUsername, role: inviteRole })
      })
      const data = await res.json()
      if (res.ok) {
        setInviteUsername('')
        setSuccess('Member added successfully!')
        fetchMembers(selectedTeam.id)
      } else {
        setError(data.error || 'Failed to add member')
      }
    } catch (err: any) {
      setError(err.message)
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
          👥 {getTranslation(lang, 'teams')}
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
        {/* Left Side: Teams list and creation */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Create Team Form */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px' }}>Create New Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team Name"
                style={{
                  flex: 1,
                  background: '#070710',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '12px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#7F77DD',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                Create
              </button>
            </form>
          </div>

          {/* Teams list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '14px' }}>Your Teams</h3>
            {teams.length === 0 ? (
              <div style={{ padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center' }}>
                You are not in any teams yet.
              </div>
            ) : (
              teams.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  style={{
                    background: 'var(--bg2)',
                    border: `1px solid ${selectedTeam?.id === t.id ? '#7F77DD' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{t.name}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: t.role === 'owner' ? 'rgba(127,119,221,0.2)' : 'rgba(255,255,255,0.05)',
                      color: t.role === 'owner' ? '#7F77DD' : 'var(--text2)',
                      borderRadius: '4px'
                    }}>
                      {t.role.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: 'var(--text2)' }}>
                    <span>Owner: @{t.owner_name}</span>
                    <span>{t.members_count} Members</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Members and management */}
        <div style={{ flex: '1 1 500px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', minHeight: '400px' }}>
          {selectedTeam ? (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                {selectedTeam.name} Workspace
              </h3>

              {/* Invite Form */}
              {(selectedTeam.role === 'owner' || selectedTeam.role === 'editor') && (
                <div style={{ marginBottom: '24px', background: '#121225', padding: '16px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '13px' }}>Invite Team Member</h4>
                  <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={e => setInviteUsername(e.target.value)}
                      placeholder="Username or Email"
                      style={{
                        flex: 1,
                        background: '#070710',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        color: '#fff',
                        outline: 'none',
                        fontSize: '12px',
                        minWidth: '150px'
                      }}
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as any)}
                      style={{
                        background: '#070710',
                        border: '1px solid var(--border)',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="submit"
                      style={{
                        background: '#7F77DD',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}

              {/* Members list */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px' }}>Members</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#070710', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{m.username}</div>
                        <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{m.email}</div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: m.role === 'owner' ? 'rgba(127,119,221,0.15)' : 'rgba(255,255,255,0.05)',
                        color: m.role === 'owner' ? '#7F77DD' : 'var(--text2)'
                      }}>
                        {m.role.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)' }}>
              Select a team from the list to manage workspace.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
