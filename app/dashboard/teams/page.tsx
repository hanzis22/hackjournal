'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'
import SeverityDashboard from '@/components/ui/SeverityDashboard'
import { showToast } from '@/components/ui/Toast'
import { 
  Users, 
  UserPlus, 
  Activity, 
  Settings, 
  Briefcase, 
  Plus, 
  Terminal, 
  RefreshCw, 
  LogOut, 
  ArrowRight, 
  UserCheck, 
  Shield, 
  FolderOpen,
  Trash2,
  Lock,
  Mail,
  FileDown
} from 'lucide-react'

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
  role: 'owner' | 'editor' | 'viewer'
  joined_at: string
  user_id: number
  username: string
  email: string
  avatar: string | null
}

interface Invite {
  id: number
  email: string
  role: 'editor' | 'viewer'
  created_at: string
  expires_at: string
  invited_by_username: string
}

interface ActivityItem {
  id: number
  created_at: string
  title: string
  writeup_id: number
  current_title: string
  username: string
}

export default function TeamsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  
  // Forms & settings state
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [renameValue, setRenameValue] = useState('')
  const [transferUserId, setTransferUserId] = useState<number | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [conflictWriteupsCount, setConflictWriteupsCount] = useState<number | null>(null)

  // Engagements inside team workspace
  const [teamEngagements, setTeamEngagements] = useState<any[]>([])
  const [engName, setEngName] = useState('')
  const [engClient, setEngClient] = useState('')
  const [engScope, setEngScope] = useState('')
  const [engStartDate, setEngStartDate] = useState('')
  const [engEndDate, setEngEndDate] = useState('')

  // Navigation tab inside active team workspace
  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'invites' | 'settings' | 'engagements' | 'analytics'>('members')

  const [lang, setLang] = useState<Lang>('id')
  const [myPendingInvites, setMyPendingInvites] = useState<any[]>([])

  const fetchTeamEngagements = async (teamId: number) => {
    try {
      const res = await fetch(`/api/engagements?team_id=${teamId}`)
      const data = await res.json()
      if (res.ok) {
        setTeamEngagements(data.engagements || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Activity Feed pagination
  const [activityPage, setActivityPage] = useState(1)
  const [totalActivities, setTotalActivities] = useState(0)
  const activitiesLimit = 10

  const fetchMyPendingInvites = async () => {
    try {
      const res = await fetch('/api/invites/mine')
      const data = await res.json()
      if (res.ok) {
        setMyPendingInvites(data.invites || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    setLang(getCurrentLang())
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) setCurrentUser(d.user)
      })
    fetchTeams()
    fetchMyPendingInvites()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/teams?t=${Date.now()}`)
      const data = await res.json()
      if (res.ok) {
        setTeams(data.teams || [])
      } else {
        showToast(data.error || 'Gagal memuat tim', 'error')
      }
    } catch (err: any) {
      console.error(err)
      showToast('Koneksi bermasalah', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName })
      })
      const data = await res.json()
      if (res.ok) {
        setNewTeamName('')
        showToast('Tim berhasil dibuat!', 'success')
        fetchTeams()
      } else {
        showToast(data.error || 'Gagal membuat tim', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const fetchMembers = async (teamId: number) => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`)
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchInvites = async (teamId: number) => {
    setInvitesLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/invites`)
      const data = await res.json()
      if (res.ok) {
        setInvites(data.invites || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setInvitesLoading(false)
    }
  }

  const fetchActivity = useCallback(async (teamId: number, pageNum: number) => {
    setActivitiesLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/activity?page=${pageNum}&limit=${activitiesLimit}`)
      const data = await res.json()
      if (res.ok) {
        setActivities(data.activities || [])
        setTotalActivities(data.total || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActivitiesLoading(false)
    }
  }, [activitiesLimit])

  const handleSelectTeam = (t: Team) => {
    setSelectedTeam(t)
    setMembers([])
    setInvites([])
    setActivities([])
    setRenameValue(t.name)
    setTransferUserId(null)
    setDeleteConfirmName('')
    setConflictWriteupsCount(null)
    setActiveTab('members')
    fetchMembers(t.id)
    fetchInvites(t.id)
    fetchActivity(t.id, 1)
    fetchTeamEngagements(t.id)
    setActivityPage(1)
  }

  const handleCreateEngagement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!engName.trim() || !selectedTeam) return

    try {
      const res = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: engName,
          client: engClient,
          scope: engScope,
          status: 'scoping',
          start_date: engStartDate || null,
          end_date: engEndDate || null,
          team_id: selectedTeam.id
        })
      })
      const data = await res.json()
      if (res.ok) {
        setEngName('')
        setEngClient('')
        setEngScope('')
        setEngStartDate('')
        setEngEndDate('')
        showToast('Engagement berhasil dibuat!', 'success')
        if (selectedTeam) {
          fetchTeamEngagements(selectedTeam.id)
        }
      } else {
        showToast(data.error || 'Gagal membuat engagement', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleUpdateEngagementStatus = async (eng: any, newStatus: string) => {
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
        showToast(`Status diperbarui ke ${newStatus}`, 'success')
        if (selectedTeam) {
          fetchTeamEngagements(selectedTeam.id)
        }
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal memperbarui status', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleDeleteEngagement = async (engId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus engagement ini?')) return
    try {
      const res = await fetch(`/api/engagements/${engId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Engagement berhasil dihapus', 'success')
        if (selectedTeam) {
          fetchTeamEngagements(selectedTeam.id)
        }
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal menghapus engagement', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteUsername.trim() || !selectedTeam) return

    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: inviteUsername, role: inviteRole })
      })
      const data = await res.json()
      if (res.ok) {
        setInviteUsername('')
        showToast('Undangan pending berhasil dikirim!', 'success')
        fetchInvites(selectedTeam.id)
      } else {
        showToast(data.error || 'Gagal mengirim undangan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleRevokeInvite = async (inviteId: number) => {
    if (!selectedTeam) return
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/invites/${inviteId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Undangan berhasil dibatalkan', 'success')
        fetchInvites(selectedTeam.id)
      } else {
        showToast(data.error || 'Gagal membatalkan undangan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeam) return
    if (!confirm('Apakah Anda yakin ingin mengeluarkan anggota ini?')) return
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${memberId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Anggota berhasil dikeluarkan', 'success')
        fetchMembers(selectedTeam.id)
      } else {
        showToast(data.error || 'Gagal mengeluarkan anggota', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleChangeRole = async (memberId: number, currentRole: string) => {
    if (!selectedTeam) return
    const newRole = currentRole === 'editor' ? 'viewer' : 'editor'
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Peran anggota berhasil diperbarui', 'success')
        fetchMembers(selectedTeam.id)
      } else {
        showToast(data.error || 'Gagal mengubah peran', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleLeaveTeam = async () => {
    if (!selectedTeam) return
    if (!confirm('Apakah Anda yakin ingin keluar dari tim ini?')) return
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/leave`, {
        method: 'POST'
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedTeam(null)
        showToast('Anda telah keluar dari tim', 'success')
        fetchTeams()
      } else {
        showToast(data.error || 'Gagal keluar dari tim', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam || !renameValue.trim()) return
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Nama tim berhasil diubah!', 'success')
        setSelectedTeam(prev => prev ? { ...prev, name: renameValue } : null)
        fetchTeams()
      } else {
        showToast(data.error || 'Gagal mengubah nama tim', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam || !transferUserId) return
    if (!confirm('Apakah Anda yakin ingin mentransfer kepemilikan tim ini? Peran Anda akan diubah menjadi Editor.')) return
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerUserId: transferUserId })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Kepemilikan tim berhasil ditransfer!', 'success')
        const updatedTeam = { ...selectedTeam, role: 'editor' as const }
        setSelectedTeam(updatedTeam)
        setTransferUserId(null)
        setActiveTab('members')
        fetchTeams()
        fetchMembers(selectedTeam.id)
      } else {
        showToast(data.error || 'Gagal mentransfer kepemilikan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleDeleteTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) return
    if (deleteConfirmName !== selectedTeam.name) {
      showToast('Nama tim konfirmasi tidak cocok', 'error')
      return
    }

    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Tim berhasil dihapus', 'success')
        setSelectedTeam(null)
        fetchTeams()
      } else if (res.status === 409) {
        showToast(data.error, 'warning')
        setConflictWriteupsCount(data.writeupsCount || 0)
      } else {
        showToast(data.error || 'Gagal menghapus tim', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleAcceptInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/accept/${token}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast('Berhasil bergabung ke tim!', 'success')
        fetchMyPendingInvites()
        fetchTeams()
      } else {
        showToast(data.error || 'Gagal menerima undangan', 'error')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleDeclineInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}/decline`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast('Undangan ditolak', 'info')
        fetchMyPendingInvites()
      } else {
        showToast(data.error || 'Gagal menolak undangan', 'error')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1250px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={22} style={{ color: 'var(--purple-400)' }} />
          <h2 style={{ color: '#fff', margin: 0, fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            {getTranslation(lang, 'teams').toUpperCase()}
          </h2>
        </div>
      </div>

      {/* Conflict banner */}
      {conflictWriteupsCount !== null && (
        <div style={{ background: 'rgba(255, 69, 96, 0.1)', border: '1px solid #FF4560', color: '#FF4560', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.5', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            ⚠️ Gagal menghapus: terdapat <strong>{conflictWriteupsCount}</strong> laporan aktif yang terikat dengan tim ini. Silakan backup laporan terlebih dahulu.
          </div>
          <div>
            <a 
              href={`/api/teams/${selectedTeam?.id}/export`}
              download
              style={{ background: 'var(--purple-600)', color: '#fff', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(127,119,221,0.2)' }}
            >
              <FileDown size={14} /> Download Semua Laporan ({conflictWriteupsCount})
            </a>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        {/* Left Side: Teams list and creation */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Create Team Form */}
          <div style={{ background: '#0e0e1e', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--purple-300)' }}>
              <Plus size={14} /> Buat Tim Baru
            </h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Nama Tim Baru"
                style={{
                  flex: 1,
                  background: '#05050c',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--purple-600)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              >
                Buat
              </button>
            </form>
          </div>

          {/* My Pending Invites */}
          {myPendingInvites.length > 0 && (
            <div style={{ background: 'rgba(127,119,221,0.04)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--purple-300)', letterSpacing: '0.5px' }}>
                📩 UNDANGAN TIM BARU ({myPendingInvites.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myPendingInvites.map(inv => (
                  <div key={inv.id} style={{ background: '#070714', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: '1.4' }}>
                      Anda diundang bergabung dengan tim <strong style={{ color: '#fff' }}>{inv.team_name}</strong> sebagai <strong style={{ color: 'var(--purple-300)' }}>{inv.role.toUpperCase()}</strong> oleh @{inv.invited_by_username}.
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleAcceptInvite(inv.token)}
                        style={{ flex: 1, background: 'var(--purple-600)', border: 'none', color: '#fff', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }}
                      >
                        Terima
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(inv.token)}
                        style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'monospace' }}
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--purple-300)' }}>
              👥 DAFTAR TIM ANDA
            </h3>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} style={{ background: '#0e0e1e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'pulse 1.8s ease-in-out infinite' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '50%', height: '14px', background: '#171730', borderRadius: '3px' }} />
                    <div style={{ width: '40px', height: '14px', background: '#171730', borderRadius: '3px' }} />
                  </div>
                  <div style={{ width: '30%', height: '10px', background: '#111124', borderRadius: '3px' }} />
                </div>
              ))
            ) : teams.length === 0 ? (
              <div style={{ padding: '32px 20px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text2)', textAlign: 'center', background: '#090914' }}>
                <Users size={32} style={{ color: 'var(--text2)', opacity: 0.3, marginBottom: '10px' }} />
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text2)' }}>Anda belum bergabung dengan tim mana pun.</div>
              </div>
            ) : (
              teams.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  style={{
                    background: '#0e0e1e',
                    border: `1px solid ${selectedTeam?.id === t.id ? 'var(--purple-500)' : 'var(--border)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  className="team-card-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', fontFamily: 'monospace' }}>{t.name}</span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      background: t.role === 'owner' ? 'rgba(127,119,221,0.15)' : 'rgba(255,255,255,0.05)',
                      color: t.role === 'owner' ? 'var(--purple-300)' : 'var(--text2)',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>
                      {t.role.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--text2)' }}>
                    <span>Owner: @{t.owner_name}</span>
                    <span>{t.members_count} Anggota</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Members and management */}
        <div style={{ flex: '1 1 600px', background: '#0e0e1e', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minHeight: '480px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
          {selectedTeam ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {selectedTeam.name} Workspace
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace' }}>Peran Anda: <strong style={{ color: 'var(--purple-300)' }}>{selectedTeam.role.toUpperCase()}</strong></span>
                </div>
                {selectedTeam.role !== 'owner' && (
                  <button
                    onClick={handleLeaveTeam}
                    style={{ background: 'rgba(243, 18, 96, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', fontFamily: 'monospace' }}
                    className="leave-btn-hover"
                  >
                    <LogOut size={12} /> Keluar dari Tim
                  </button>
                )}
              </div>

              {/* Workspace Navigation Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'members', label: 'Anggota', icon: <Users size={12} /> },
                  { id: 'activity', label: 'Aktivitas', icon: <Activity size={12} /> },
                  { id: 'invites', label: 'Pending Invites', icon: <UserPlus size={12} />, auth: selectedTeam.role === 'owner' || selectedTeam.role === 'editor' },
                  { id: 'engagements', label: 'Engagements', icon: <Briefcase size={12} /> },
                  { id: 'analytics', label: 'Analytics', icon: <Activity size={12} /> },
                  { id: 'settings', label: 'Settings', icon: <Settings size={12} />, auth: selectedTeam.role === 'owner' }
                ].map(tab => {
                  if (tab.auth === false) return null
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any)
                        if (tab.id === 'invites') fetchInvites(selectedTeam.id)
                        if (tab.id === 'engagements') fetchTeamEngagements(selectedTeam.id)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: isActive ? '#fff' : 'var(--text2)',
                        borderBottom: isActive ? '2px solid var(--purple-500)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: isActive ? 'bold' : 'normal',
                        fontFamily: 'monospace',
                        outline: 'none',
                        transition: 'color 0.2s'
                      }}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Tab Content: Members */}
              {activeTab === 'members' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--purple-300)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    // DAFTAR ANGGOTA TIM
                  </h4>
                  {membersLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={idx} style={{ height: '52px', background: '#05050c', border: '1px solid var(--border)', borderRadius: '8px', animation: 'pulse 1.8s infinite' }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {members.map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#05050c', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', transition: 'border-color 0.2s' }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                              @{m.username} {m.user_id === currentUser?.id && <span style={{ color: 'var(--purple-300)', fontSize: '10px' }}>(Anda)</span>}
                            </div>
                            <div style={{ color: 'var(--text2)', fontSize: '11px', marginTop: '2px' }}>{m.email}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: m.role === 'owner' ? 'rgba(127,119,221,0.15)' : 'rgba(255,255,255,0.05)',
                              color: m.role === 'owner' ? 'var(--purple-300)' : 'var(--text2)',
                              fontFamily: 'monospace'
                            }}>
                              {m.role.toUpperCase()}
                            </span>

                            {selectedTeam.role === 'owner' && m.user_id !== currentUser?.id && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleChangeRole(m.id, m.role)}
                                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}
                                  title="Ubah peran"
                                >
                                  🔄 Ubah Peran
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(m.id)}
                                  style={{ background: 'rgba(243,18,96,0.05)', border: '1px solid rgba(243,18,96,0.2)', color: 'var(--red)', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}
                                  title="Keluarkan anggota"
                                >
                                  🗑️ Keluarkan
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Activity */}
              {activeTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--purple-300)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    // RIWAYAT AKTIVITAS TIM
                  </h4>
                  {activitiesLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} style={{ height: '62px', background: '#05050c', border: '1px solid var(--border)', borderRadius: '8px', animation: 'pulse 1.8s infinite' }} />
                      ))}
                    </div>
                  ) : activities.length === 0 ? (
                    <div style={{ padding: '40px 20px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center', fontSize: '12px', background: '#05050c' }}>
                      <Activity size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <div style={{ fontFamily: 'monospace' }}>Belum ada aktivitas tercatat pada laporan tim.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activities.map(act => (
                          <div key={act.id} style={{ background: '#05050c', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', lineHeight: '1.4' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)', fontSize: '10px', marginBottom: '6px', fontFamily: 'monospace' }}>
                              <span>Oleh: <strong>@{act.username}</strong></span>
                              <span>{new Date(act.created_at).toLocaleString()}</span>
                            </div>
                            <div style={{ color: '#fff' }}>
                              Menyimpan revisi laporan: <span style={{ color: 'var(--purple-300)', fontFamily: 'monospace' }}>"{act.title || act.current_title}"</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalActivities > activitiesLimit && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                          <button
                            onClick={() => {
                              const newPage = Math.max(1, activityPage - 1)
                              setActivityPage(newPage)
                              fetchActivity(selectedTeam.id, newPage)
                            }}
                            disabled={activityPage === 1}
                            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: activityPage === 1 ? 'var(--text2)' : '#fff', padding: '6px 12px', borderRadius: '4px', cursor: activityPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: '11px' }}
                          >
                            ◄ Prev
                          </button>
                          <span style={{ color: 'var(--text2)', fontSize: '11px', fontFamily: 'monospace' }}>Hal {activityPage} / {Math.ceil(totalActivities / activitiesLimit)}</span>
                          <button
                            onClick={() => {
                              const newPage = Math.min(Math.ceil(totalActivities / activitiesLimit), activityPage + 1)
                              setActivityPage(newPage)
                              fetchActivity(selectedTeam.id, newPage)
                            }}
                            disabled={activityPage === Math.ceil(totalActivities / activitiesLimit)}
                            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: activityPage === Math.ceil(totalActivities / activitiesLimit) ? 'var(--text2)' : '#fff', padding: '6px 12px', borderRadius: '4px', cursor: activityPage === Math.ceil(totalActivities / activitiesLimit) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: '11px' }}
                          >
                            Next ►
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Invites */}
              {activeTab === 'invites' && (
                <div>
                  {/* Invite Form */}
                  <div style={{ marginBottom: '24px', background: '#05050c', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>Kirim Undangan Baru</h4>
                    <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={inviteUsername}
                        onChange={e => setInviteUsername(e.target.value)}
                        placeholder="Username atau Email"
                        style={{
                          flex: 1,
                          background: '#0a0a16',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '12px',
                          minWidth: '150px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as any)}
                        style={{
                          background: '#0a0a16',
                          border: '1px solid var(--border)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          outline: 'none',
                          cursor: 'pointer',
                          fontFamily: 'monospace'
                        }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        type="submit"
                        style={{
                          background: 'var(--purple-600)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      >
                        Kirim
                      </button>
                    </form>
                  </div>

                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--purple-300)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    // UNDANGAN PENDING
                  </h4>
                  {invitesLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ height: '48px', background: '#05050c', border: '1px solid var(--border)', borderRadius: '8px', animation: 'pulse 1.8s infinite' }} />
                    </div>
                  ) : invites.length === 0 ? (
                    <div style={{ padding: '32px 20px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center', fontSize: '12px', background: '#05050c' }}>
                      <Mail size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <div style={{ fontFamily: 'monospace' }}>Tidak ada undangan pending.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {invites.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#05050c', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>{inv.email}</div>
                            <div style={{ color: 'var(--text2)', fontSize: '11px', marginTop: '4px' }}>
                              Peran: {inv.role.toUpperCase()} | Pengundang: @{inv.invited_by_username}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '4px', fontFamily: 'monospace' }}>
                              Kedaluwarsa: {new Date(inv.expires_at).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            style={{ background: 'rgba(243,18,96,0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '10px', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Settings */}
              {activeTab === 'settings' && selectedTeam.role === 'owner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Rename Team */}
                  <div style={{ background: '#05050c', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--purple-300)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>Ganti Nama Tim</h4>
                    <form onSubmit={handleRenameTeam} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        style={{
                          flex: 1,
                          background: '#0a0a16',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="submit"
                        style={{ background: 'var(--purple-600)', border: 'none', color: '#fff', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'monospace' }}
                      >
                        Simpan
                      </button>
                    </form>
                  </div>

                  {/* Transfer Ownership */}
                  <div style={{ background: '#05050c', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--purple-300)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>Transfer Kepemilikan Tim</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text2)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                      Pilih anggota tim tujuan transfer kepemilikan. Anda akan di-relegasikan menjadi Editor tim setelah proses selesai.
                    </p>
                    <form onSubmit={handleTransferOwnership} style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={transferUserId || ''}
                        onChange={e => setTransferUserId(e.target.value ? Number(e.target.value) : null)}
                        style={{
                          flex: 1,
                          background: '#0a0a16',
                          border: '1px solid var(--border)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          outline: 'none',
                          cursor: 'pointer',
                          fontFamily: 'monospace'
                        }}
                      >
                        <option value="">-- Pilih Anggota Tujuan --</option>
                        {members
                          .filter(m => m.user_id !== currentUser?.id)
                          .map(m => (
                            <option key={m.user_id} value={m.user_id}>@{m.username} ({m.role.toUpperCase()})</option>
                          ))
                        }
                      </select>
                      <button
                        type="submit"
                        disabled={!transferUserId}
                        style={{
                          background: transferUserId ? 'var(--purple-600)' : 'var(--border)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: transferUserId ? 'pointer' : 'not-allowed',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      >
                        Transfer
                      </button>
                    </form>
                  </div>

                  {/* Danger Zone: Delete Team */}
                  <div style={{ background: 'rgba(243,18,96,0.02)', border: '1px solid rgba(243,18,96,0.2)', padding: '20px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--red)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>Danger Zone: Hapus Tim</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text2)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                      Menghapus tim bersifat permanen dan tidak dapat dibatalkan. Tim hanya bisa dihapus jika tidak ada laporan terkait di dalamnya.
                    </p>
                    <form onSubmit={handleDeleteTeam} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                        Ketik ulang nama tim <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedTeam.name}</strong> untuk konfirmasi:
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={deleteConfirmName}
                          onChange={e => setDeleteConfirmName(e.target.value)}
                          placeholder="Nama tim"
                          style={{
                            flex: 1,
                            background: '#05050c',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#fff',
                            outline: 'none',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={deleteConfirmName !== selectedTeam.name}
                          style={{
                            background: deleteConfirmName === selectedTeam.name ? 'var(--red)' : 'var(--border)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            cursor: deleteConfirmName === selectedTeam.name ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        >
                          Hapus Permanen
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Tab Content: Engagements */}
              {activeTab === 'engagements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ margin: '0', color: 'var(--purple-300)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    // TEAM ENGAGEMENTS (PENTEST PIPELINES)
                  </h4>
                  
                  {/* Overall Team Findings Dashboard */}
                  <SeverityDashboard type="team" id={selectedTeam.id} />

                  {/* Create Engagement Form (Owner & Editor only) */}
                  {(selectedTeam.role === 'owner' || selectedTeam.role === 'editor') && (
                    <div style={{ background: '#05050c', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <h5 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase' }}>Mulai Project Pentest Baru</h5>
                      <form onSubmit={handleCreateEngagement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            value={engName}
                            onChange={e => setEngName(e.target.value)}
                            placeholder="Nama Project (e.g. Audit Keamanan Web)"
                            style={{ flex: 2, minWidth: '200px', background: '#0a0a16', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                            required
                          />
                          <input
                            type="text"
                            value={engClient}
                            onChange={e => setEngClient(e.target.value)}
                            placeholder="Nama Klien (e.g. PT Maju Jaya)"
                            style={{ flex: 1, minWidth: '150px', background: '#0a0a16', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                          />
                        </div>
                        <textarea
                          value={engScope}
                          onChange={e => setEngScope(e.target.value)}
                          placeholder="Detail Scope (IPs, domains, APIs)"
                          style={{ width: '100%', height: '70px', background: '#0a0a16', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '12px', resize: 'none', fontFamily: 'monospace' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 150px' }}>
                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--text2)', marginBottom: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}>START DATE</label>
                            <input type="date" value={engStartDate} onChange={e => setEngStartDate(e.target.value)} style={{ width: '100%', background: '#0a0a16', border: '1px solid var(--border)', color: '#fff', fontSize: '11px', padding: '6px', borderRadius: '4px', fontFamily: 'monospace' }} />
                          </div>
                          <div style={{ flex: '1 1 150px' }}>
                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--text2)', marginBottom: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}>END DATE</label>
                            <input type="date" value={engEndDate} onChange={e => setEngEndDate(e.target.value)} style={{ width: '100%', background: '#0a0a16', border: '1px solid var(--border)', color: '#fff', fontSize: '11px', padding: '6px', borderRadius: '4px', fontFamily: 'monospace' }} />
                          </div>
                          <button type="submit" style={{ background: 'var(--purple-600)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '16px', fontFamily: 'monospace' }}>
                            Launch Project
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Engagements Pipeline List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teamEngagements.length === 0 ? (
                      <div style={{ padding: '40px 20px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text2)', textAlign: 'center', fontSize: '12px', background: '#05050c' }}>
                        <Briefcase size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontFamily: 'monospace' }}>Belum ada project active di tim ini. Mulai project baru di atas!</div>
                      </div>
                    ) : (
                      teamEngagements.map(eng => {
                        const statusLabels: Record<string, string> = {
                          scoping: '📋 Scoping',
                          recon: '🔍 Reconnaissance',
                          exploitation: '⚡ Exploitation',
                          reporting: '📝 Reporting',
                          retesting: '🔄 Retesting',
                          complete: '✅ Complete'
                        }
                        
                        return (
                          <div
                            key={eng.id}
                            style={{
                              background: '#05050c',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '16px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <div>
                                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', fontFamily: 'monospace' }}>{eng.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text2)', marginLeft: '10px' }}>Client: <strong>{eng.client || 'N/A'}</strong></span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select
                                  value={eng.status}
                                  disabled={selectedTeam.role !== 'owner' && selectedTeam.role !== 'editor'}
                                  onChange={ev => handleUpdateEngagementStatus(eng, ev.target.value)}
                                  style={{
                                    background: '#0e0e1e',
                                    border: '1px solid var(--border)',
                                    color: 'var(--purple-300)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {Object.entries(statusLabels).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                                {selectedTeam.role === 'owner' && (
                                  <button
                                    onClick={() => handleDeleteEngagement(eng.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
                                    title="Hapus Engagement"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Timeline and Details */}
                            <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '8px', fontFamily: 'monospace' }}>
                              Timeline: {eng.start_date ? new Date(eng.start_date).toLocaleDateString('id-ID') : 'N/A'} s/d {eng.end_date ? new Date(eng.end_date).toLocaleDateString('id-ID') : 'N/A'}
                            </div>

                            {/* Scope Box */}
                            {eng.scope && (
                              <div style={{ marginTop: '10px', background: '#02020a', padding: '10px', borderRadius: '6px', border: '1px solid #111' }}>
                                <span style={{ fontSize: '9px', color: 'var(--purple-300)', display: 'block', marginBottom: '4px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>IP/DOMAIN SCOPE:</span>
                                <pre style={{ margin: 0, fontSize: '11px', color: '#39FF14', overflowX: 'auto', fontFamily: 'monospace', lineHeight: '1.4' }}>{eng.scope}</pre>
                              </div>
                            )}

                            {/* Engagement Severity Dashboard */}
                            <SeverityDashboard type="engagement" id={eng.id} />

                            <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                              <Link
                                href={`/dashboard/engagements/${eng.id}/war-room`}
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
                                ⚔️ Enter War-Room
                              </Link>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content: Analytics */}
              {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: '#05050c', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-400)', marginBottom: '16px' }}>
                    <Activity size={28} />
                  </div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    Team Performance & Skill-Gap Profile
                  </h4>
                  <p style={{ margin: '8px 0 20px 0', fontSize: '12px', color: 'var(--text2)', maxWidth: '420px', lineHeight: '1.6' }}>
                    Visualisasikan peta kekuatan kategori kerentanan, kontribusi temuan (Weighted Score), dan radar kompetensi seluruh anggota tim Anda secara real-time.
                  </p>
                  <Link
                    href={`/dashboard/teams/${selectedTeam.id}/analytics`}
                    style={{
                      background: 'var(--purple-600)',
                      color: '#fff',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      boxShadow: '0 4px 12px rgba(127,119,221,0.3)',
                      transition: 'all 0.2s'
                    }}
                    className="btn-new-writeup"
                  >
                    📊 Buka Dashboard Analitik Tim
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(127,119,221,0.05)', border: '1px solid rgba(127,119,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'var(--purple-400)' }}>
                👥
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text2)', fontFamily: 'monospace' }}>Pilih tim dari daftar sebelah kiri untuk mengelola workspace tim Anda.</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .team-card-hover:hover {
          border-color: rgba(127, 119, 221, 0.6) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
        }
        .leave-btn-hover:hover {
          background: rgba(243, 18, 96, 0.25) !important;
        }
      `}</style>
    </div>
  )
}
