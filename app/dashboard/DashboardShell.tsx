'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import DiffBadge from '@/components/ui/DiffBadge'
import CommandPalette from '@/components/ui/CommandPalette'
import CustomModal from '@/components/ui/CustomModal'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'

interface Writeup {
  id: number
  title: string
  platform: string
  difficulty: string
  tags: string
  created_at: string
  folder_id: number | null
  is_starred: number
  writeup_mode?: 'journal' | 'cve'
  cve_id?: string
  cve_cvss_score?: number
  cve_cvss_severity?: string
}

interface Folder {
  id: number
  name: string
  color: string
  icon: string
  parent_id: number | null
}

interface User { id: number; username: string; email: string }

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [writeups, setWriteups] = useState<Writeup[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lang, setLang] = useState<Lang>('id')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [writeupsSectionOpen, setWriteupsSectionOpen] = useState(true)

  // Auto-collapse/expand based on route
  useEffect(() => {
    const isWriteupView = pathname === '/dashboard' || pathname === '/dashboard/new' || (pathname.startsWith('/dashboard/') && !['/dashboard/feed', '/dashboard/teams', '/dashboard/engagements', '/dashboard/achievements', '/dashboard/vault', '/dashboard/analytics', '/dashboard/settings'].some(p => pathname.startsWith(p)))
    if (isWriteupView) {
      setWriteupsSectionOpen(true)
    } else {
      setWriteupsSectionOpen(false)
    }
  }, [pathname])

  // Redirect legacy tab=tim links to new /dashboard/teams path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('tab') === 'tim') {
        router.push('/dashboard/teams')
      }
    }
  }, [pathname, router])

  // Search & Filters State
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState('all') // difficulty filter
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // 'starred', 'unorganized', or folder ID string
  
  // Advanced search options
  const [isRegex, setIsRegex] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allUniqueTags, setAllUniqueTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    type: 'prompt' | 'confirm'
    title: string
    message?: string
    placeholder?: string
    initialValue?: string
    onConfirm: (value?: string) => void
  } | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalWriteups, setTotalWriteups] = useState(0)
  const limit = 10

  // Team-Writeups states
  const [scope, setScope] = useState<'personal' | 'team'>('personal')
  const [myTeams, setMyTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [notifTab, setNotifTab] = useState<'action' | 'activity'>('action')

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const d = await res.json()
        setNotifications(d.notifications || [])
        setUnreadCount(d.unreadCount || 0)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const markAsRead = async (id: number, link?: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      fetchNotifications()
      if (link) {
        router.push(link)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user)
          if (d.user.language) {
            setLang(d.user.language)
            localStorage.setItem('hj_lang', d.user.language)
          }
        }
      })
    setLang(getCurrentLang())
    fetchFolders()
    fetchUniqueTags()
    fetchNotifications()

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    // Fetch teams list
    fetch('/api/teams')
      .then(r => r.json())
      .then(d => {
        const teamsList = d.teams || []
        setMyTeams(teamsList)
        if (teamsList.length > 0) {
          setSelectedTeamId(teamsList[0].id)
        }
      })
      .catch(err => console.error('Error fetching teams in shell:', err))

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Debounce search term changes (300ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      if (res.ok) {
        const data = await res.json()
        setFolders(data.folders || [])
      }
    } catch (err) {
      console.error('Failed to load folders:', err)
    }
  }

  const fetchUniqueTags = async () => {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        setAllUniqueTags((data.tags || []).map((t: any) => t.name))
      }
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }

  const fetchWriteups = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filter !== 'all') params.set('difficulty', filter)
      if (isRegex) params.set('regex', 'true')
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
      if (sortBy) params.set('sort_by', sortBy)
      if (sortOrder) params.set('sort_order', sortOrder)

      if (scope === 'team') {
        if (selectedTeamId === null) {
          setWriteups([])
          setLoading(false)
          return
        }
        params.set('scope', 'team')
        params.set('team_id', String(selectedTeamId))
      } else {
        params.set('scope', 'personal')
        if (selectedFolderId === 'starred') {
          params.set('is_starred', 'true')
        } else if (selectedFolderId === 'unorganized') {
          params.set('folder_id', 'null')
        } else if (selectedFolderId) {
          params.set('folder_id', selectedFolderId)
        }
      }

      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/writeups?${params}`)
      if (res.ok) {
        const data = await res.json()
        setWriteups(data.writeups || [])
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1)
          setTotalWriteups(data.pagination.total || 0)
        }
      } else {
        setWriteups([])
      }
    } catch (err) {
      console.error('Fetch writeups network error:', err)
      setWriteups([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filter, selectedFolderId, isRegex, startDate, endDate, selectedTags, sortBy, sortOrder, page, scope, selectedTeamId])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filter, selectedFolderId, isRegex, startDate, endDate, selectedTags, sortBy, sortOrder])

  useEffect(() => {
    fetchWriteups()
  }, [fetchWriteups])

  // Folder CRUD operations inline
  const createFolder = () => {
    setModalConfig({
      type: 'prompt',
      title: '📁 Buat Folder Baru',
      placeholder: 'Masukkan nama folder baru...',
      onConfirm: async (name) => {
        if (!name?.trim()) return
        try {
          const res = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
          })
          if (res.ok) {
            fetchFolders()
          }
        } catch (err) {
          console.error('Failed to create folder:', err)
        } finally {
          setModalConfig(null)
        }
      }
    })
  }

  const renameFolder = (id: number, oldName: string) => {
    setModalConfig({
      type: 'prompt',
      title: '✏️ Ganti Nama Folder',
      initialValue: oldName,
      placeholder: 'Masukkan nama folder...',
      onConfirm: async (name) => {
        if (!name?.trim() || name === oldName) return
        try {
          const res = await fetch(`/api/folders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
          })
          if (res.ok) {
            fetchFolders()
          }
        } catch (err) {
          console.error('Failed to rename folder:', err)
        } finally {
          setModalConfig(null)
        }
      }
    })
  }

  const deleteFolder = (id: number, name: string) => {
    setModalConfig({
      type: 'confirm',
      title: '🗑️ Hapus Folder',
      message: `Apakah Anda yakin ingin menghapus folder "${name}"? Laporan di dalamnya tidak akan terhapus dan akan dikembalikan ke "Tanpa Folder".`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/folders/${id}`, {
            method: 'DELETE'
          })
          if (res.ok) {
            fetchFolders()
            if (selectedFolderId === String(id)) setSelectedFolderId(null)
          }
        } catch (err) {
          console.error('Failed to delete folder:', err)
        } finally {
          setModalConfig(null)
        }
      }
    })
  }

  const toggleStarWriteup = async (w: Writeup, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newStarStatus = w.is_starred === 1 ? 0 : 1
    try {
      const res = await fetch(`/api/writeups/${w.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: w.title,
          difficulty: w.difficulty,
          platform: w.platform,
          tags: w.tags,
          writeup_mode: w.writeup_mode,
          is_starred: newStarStatus
        })
      })
      if (res.ok) {
        // Optimistic UI update
        setWriteups(prev => prev.map(item => item.id === w.id ? { ...item, is_starred: newStarStatus } : item))
      }
    } catch (err) {
      console.error('Failed to toggle star:', err)
    }
  }

  async function logout() {
    setModalConfig({
      type: 'confirm',
      title: '🚪 Logout',
      message: 'Apakah Anda yakin ingin keluar dari akun?',
      onConfirm: async () => {
        setModalConfig(null)
        await fetch('/api/auth/login', { method: 'DELETE' })
        router.push('/login')
        router.refresh()
      }
    })
  }

  const counts = {
    Easy:   writeups.filter(w => w.difficulty === 'Easy').length,
    Medium: writeups.filter(w => w.difficulty === 'Medium').length,
    Hard:   writeups.filter(w => w.difficulty === 'Hard').length,
    Insane: writeups.filter(w => w.difficulty === 'Insane').length,
  }

  const activeId = pathname.split('/')[2]
  const sidebarBg = 'var(--bg2)'
  const borderColor = 'var(--border)'

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const getPageTitle = () => {
    if (pathname === '/dashboard') return getTranslation(lang, 'writeups')
    if (pathname.startsWith('/dashboard/feed')) return getTranslation(lang, 'feed')
    if (pathname.startsWith('/dashboard/teams')) return getTranslation(lang, 'teams')
    if (pathname.startsWith('/dashboard/engagements')) return getTranslation(lang, 'engagements')
    if (pathname.startsWith('/dashboard/achievements')) return getTranslation(lang, 'achievements')
    if (pathname.startsWith('/dashboard/vault')) return getTranslation(lang, 'vault')
    if (pathname.startsWith('/dashboard/analytics')) return getTranslation(lang, 'dashboard')
    if (pathname.startsWith('/dashboard/settings')) return getTranslation(lang, 'settings')
    if (pathname.startsWith('/dashboard/new')) return getTranslation(lang, 'newWriteup')
    if (pathname.split('/')[2]) return 'Detail Laporan'
    return 'HackJournal'
  }

  return (
    <div className="dashboard-container">
      {/* Global Command Palette */}
      <CommandPalette writeups={writeups} />

      {/* Custom Themed Dialogs */}
      {modalConfig && (
        <CustomModal
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          placeholder={modalConfig.placeholder}
          initialValue={modalConfig.initialValue}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}

      {/* TOPBAR */}
      <div style={{ height:'56px', background:'rgba(19, 19, 40, 0.8)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${borderColor}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', fontFamily:'monospace' }}>
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg, var(--purple-600), var(--purple-400))', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', color:'#fff', fontWeight:'bold', boxShadow:'0 0 12px rgba(127,119,221,0.3)' }}>⬡</div>
          <span className="no-print" style={{ display: 'flex', fontSize:'18px', fontWeight:'bold', letterSpacing:'0.5px' }}>Hack<span style={{ color:'var(--purple-400)' }}>Journal</span></span>
          
          <span style={{ display:'flex', alignItems:'center', color:'var(--border2)', margin:'0 8px', fontSize:'14px' }}>/</span>
          <span style={{ fontSize:'13px', color:'var(--text)', fontWeight:'600' }}>{getPageTitle()}</span>

          <span className="command-palette-pill" style={{ fontSize: '10px', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px', color: 'var(--text2)', marginLeft: '12px' }}>Ctrl + K</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          {!(scope === 'team' && myTeams.find(t => t.id === selectedTeamId)?.role === 'viewer') && (
            <Link href={scope === 'team' && selectedTeamId ? `/dashboard/new?team_id=${selectedTeamId}` : '/dashboard/new'} style={{ padding:'6px 14px', borderRadius:'6px', background:'var(--purple-600)', color:'#fff', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'6px', fontWeight:'600', transition:'all 0.2s', boxShadow:'0 2px 8px rgba(83,74,183,0.3)' }} className="btn-new-writeup">
              + {getTranslation(lang, 'newWriteup')}
            </Link>
          )}
          
          {/* Notification Bell Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setNotifDropdownOpen(!notifDropdownOpen); fetchNotifications(); }} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', position: 'relative', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', color: 'var(--text2)' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--red)', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid var(--bg2)' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setNotifDropdownOpen(false)} />
                <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '320px', background: 'rgba(19, 19, 40, 0.95)', border: '1px solid var(--border2)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', zIndex: 999, backdropFilter: 'blur(10px)', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'monospace' }}>// Notifikasi ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: 'var(--purple-400)', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace', padding: 0 }}>
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  
                  {/* Segmentation Tabs */}
                  {(() => {
                    const actionRequiredNotifs = notifications.filter(n => n.is_task === 1 || n.type === 'review_request' || n.type === 'team_invite')
                    const activityNotifs = notifications.filter(n => !(n.is_task === 1 || n.type === 'review_request' || n.type === 'team_invite'))
                    const filteredList = notifTab === 'action' ? actionRequiredNotifs : activityNotifs

                    return (
                      <>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                          <button
                            onClick={() => setNotifTab('action')}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: notifTab === 'action' ? 'rgba(127,119,221,0.08)' : 'transparent',
                              border: 'none',
                              color: notifTab === 'action' ? '#fff' : 'var(--text2)',
                              borderBottom: notifTab === 'action' ? '2px solid var(--purple-500)' : '2px solid transparent',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              outline: 'none'
                            }}
                          >
                            ⚠️ Tasks ({actionRequiredNotifs.length})
                          </button>
                          <button
                            onClick={() => setNotifTab('activity')}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: notifTab === 'activity' ? 'rgba(127,119,221,0.08)' : 'transparent',
                              border: 'none',
                              color: notifTab === 'activity' ? '#fff' : 'var(--text2)',
                              borderBottom: notifTab === 'activity' ? '2px solid var(--purple-500)' : '2px solid transparent',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              outline: 'none'
                            }}
                          >
                            💬 Activity ({activityNotifs.length})
                          </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
                          {filteredList.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '11px', fontFamily: 'monospace' }}>
                              Tidak ada notifikasi
                            </div>
                          ) : (
                            filteredList.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => { setNotifDropdownOpen(false); markAsRead(n.id, n.link); }}
                                style={{ 
                                  padding: '10px 12px', 
                                  borderRadius: '6px', 
                                  background: n.is_read ? 'transparent' : 'rgba(127,119,221,0.05)', 
                                  borderBottom: '1px solid rgba(127,119,221,0.05)',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                  marginBottom: '4px',
                                  textAlign: 'left'
                                }}
                                className="dropdown-item"
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: n.is_read ? '500' : 'bold', color: n.is_read ? 'var(--text)' : '#fff' }}>
                                    {n.title}
                                  </span>
                                  {!n.is_read && (
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--purple-500)', flexShrink: 0, marginTop: '5px' }} />
                                  )}
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>
                                  {n.message}
                                </p>
                                <span style={{ fontSize: '9px', color: 'var(--border2)', display: 'block', marginTop: '6px', textAlign: 'right' }}>
                                  {new Date(n.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </div>

          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--purple-600)', border: '2px solid var(--border2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s' }} className="avatar-hover">
                {(user?.username || 'U').substring(0, 2).toUpperCase()}
              </div>
            </button>
            {userDropdownOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setUserDropdownOpen(false)} />
                <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '220px', background: 'rgba(19, 19, 40, 0.95)', border: '1px solid var(--border2)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', zIndex: 999, overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>@{user?.username}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px', wordBreak: 'break-all' }}>{user?.email || 'user@hackjournal.local'}</span>
                  </div>
                  <div style={{ padding: '6px' }}>
                    <Link href="/dashboard/settings" onClick={() => setUserDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '6px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px', transition: 'background 0.2s' }} className="dropdown-item">
                      ⚙️ {getTranslation(lang, 'settings')}
                    </Link>
                  </div>
                  <div style={{ padding: '6px', borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => { setUserDropdownOpen(false); logout(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '6px', color: 'var(--red)', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }} className="dropdown-item-logout">
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="dashboard-body">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}

        {/* SIDEBAR */}
        <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ fontFamily: 'monospace' }}>
          
          {/* MAIN NAVIGATION */}
          <div style={{ padding: '16px 12px 10px', borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--purple-400)', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>
              🧭 MENU UTAMA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { path: '/dashboard/feed', label: getTranslation(lang, 'feed'), icon: '🌐' },
                { path: '/dashboard', label: getTranslation(lang, 'writeups'), icon: '📓', exact: true },
                { path: '/dashboard/teams', label: getTranslation(lang, 'teams'), icon: '👥' },
                { path: '/dashboard/engagements', label: getTranslation(lang, 'engagements'), icon: '📦' },
                { path: '/dashboard/achievements', label: getTranslation(lang, 'achievements'), icon: '🏆' },
                { path: '/dashboard/vault', label: getTranslation(lang, 'vault'), icon: '🔐' },
                { path: '/dashboard/library', label: 'Library', icon: '📚' },
                { path: '/dashboard/analytics', label: getTranslation(lang, 'dashboard'), icon: '📊' },
              ].map(item => {
                const isActive = item.exact ? pathname === item.path : (pathname.startsWith(item.path) && item.path !== '/dashboard')
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: isActive ? '#fff' : 'var(--text2)',
                      background: isActive ? 'rgba(127,119,221,0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--purple-500)' : '3px solid transparent',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      transition: 'all 0.2s',
                    }}
                    className="sidebar-nav-item"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* COLLAPSIBLE LAPORAN SAYA */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div 
              onClick={() => setWriteupsSectionOpen(!writeupsSectionOpen)}
              style={{ 
                padding: '12px 20px', 
                borderBottom: `1px solid ${borderColor}`, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.1)',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--purple-400)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📁 LAPORAN SAYA
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text2)' }}>
                {writeupsSectionOpen ? '▲' : '▼'}
              </span>
            </div>

            {writeupsSectionOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Tabs switcher */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, background: 'rgba(0,0,0,0.2)' }}>
                  <button
                    onClick={() => setScope('personal')}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      background: scope === 'personal' ? 'rgba(127,119,221,0.12)' : 'transparent',
                      border: 'none',
                      color: scope === 'personal' ? '#fff' : 'var(--text2)',
                      borderBottom: scope === 'personal' ? '2px solid var(--purple-500)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      outline: 'none'
                    }}
                  >
                    👤 Personal
                  </button>
                  <button
                    onClick={() => setScope('team')}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      background: scope === 'team' ? 'rgba(127,119,221,0.12)' : 'transparent',
                      border: 'none',
                      color: scope === 'team' ? '#fff' : 'var(--text2)',
                      borderBottom: scope === 'team' ? '2px solid var(--purple-500)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      outline: 'none'
                    }}
                  >
                    👥 Tim
                  </button>
                </div>

                {/* Team Selector if scope is team */}
                {scope === 'team' && (
                  <div style={{ padding: '8px 12px', borderBottom: `1px solid ${borderColor}`, background: 'rgba(0,0,0,0.15)' }}>
                    <select
                      value={selectedTeamId || ''}
                      onChange={e => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                      style={{
                        width: '100%',
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Pilih Tim --</option>
                      {myTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Advanced Search & Filtering Box */}
                <div style={{ padding:'12px', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari laporan..."
                      style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'6px', padding:'7px 32px 7px 10px', color:'var(--text)', fontSize:'13px', outline:'none', fontFamily:'monospace' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsRegex(!isRegex)}
                      title="Gunakan regex search"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: isRegex ? 'var(--purple-600)' : 'transparent',
                        border: 'none',
                        color: isRegex ? '#fff' : 'var(--text2)',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      .*
                    </button>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--purple-300)',
                      fontSize: '11px',
                      textAlign: 'left',
                      padding: '6px 0 0 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{showAdvancedFilters ? '▲ Sembunyikan Filter' : '▼ Tampilkan Filter'}</span>
                  </button>

                  {showAdvancedFilters && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      {/* Date Filter */}
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text2)', marginBottom: '3px' }}>RENTANG TANGGAL</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '10px', padding: '3px', borderRadius: '4px', fontFamily: 'monospace' }} />
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '10px', padding: '3px', borderRadius: '4px', fontFamily: 'monospace' }} />
                        </div>
                      </div>

                      {/* Sort Order */}
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text2)', marginBottom: '3px' }}>URUTKAN BERDASARKAN</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: '65%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '10px', padding: '3px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            <option value="created_at">Tanggal Dibuat</option>
                            <option value="updated_at">Tanggal Diubah</option>
                            <option value="title">Judul Laporan</option>
                            <option value="difficulty">Difficulty</option>
                            <option value="cve_cvss_score">Nilai CVSS</option>
                          </select>
                          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ width: '35%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '10px', padding: '3px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            <option value="DESC">DESC</option>
                            <option value="ASC">ASC</option>
                          </select>
                        </div>
                      </div>

                      {/* Tag Filters */}
                      {allUniqueTags.length > 0 && (
                        <div>
                          <div style={{ fontSize: '9px', color: 'var(--text2)', marginBottom: '3px' }}>FILTER TAGS</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxHeight: '55px', overflowY: 'auto' }}>
                            {allUniqueTags.map(tag => {
                              const isSel = selectedTags.includes(tag)
                              return (
                                <span
                                  key={tag}
                                  onClick={() => toggleTagSelection(tag)}
                                  style={{
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    border: `1px solid ${isSel ? 'var(--purple-500)' : 'var(--border)'}`,
                                    background: isSel ? 'var(--purple-900)' : 'transparent',
                                    color: isSel ? '#fff' : 'var(--text2)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sidebar Folder tree section */}
                {scope === 'personal' && (
                  <div style={{ padding: '10px 12px 6px', borderBottom: `1px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--purple-300)', letterSpacing: '0.5px' }}>📁 WORKSPACES / FOLDERS</span>
                      <button 
                        onClick={createFolder} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--purple-200)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '0 4px' }}
                        title="Buat folder baru"
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                      <div 
                        onClick={() => setSelectedFolderId(null)}
                        style={{ 
                          padding: '5px 8px', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          background: selectedFolderId === null ? 'rgba(127,119,221,0.1)' : 'transparent',
                          color: selectedFolderId === null ? '#fff' : 'var(--text2)'
                        }}
                      >
                        🗂️ Semua Laporan
                      </div>
                      <div 
                        onClick={() => setSelectedFolderId('starred')}
                        style={{ 
                          padding: '5px 8px', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          background: selectedFolderId === 'starred' ? 'rgba(127,119,221,0.1)' : 'transparent',
                          color: selectedFolderId === 'starred' ? '#fff' : 'var(--text2)'
                        }}
                      >
                        ⭐ Favorit / Berbintang
                      </div>
                      <div 
                        onClick={() => setSelectedFolderId('unorganized')}
                        style={{ 
                          padding: '5px 8px', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          background: selectedFolderId === 'unorganized' ? 'rgba(127,119,221,0.1)' : 'transparent',
                          color: selectedFolderId === 'unorganized' ? '#fff' : 'var(--text2)'
                        }}
                      >
                        📥 Tanpa Folder
                      </div>

                      {/* Folders List */}
                      {folders.map(f => (
                        <div 
                          key={f.id}
                          style={{ 
                            padding: '5px 8px', 
                            borderRadius: '4px', 
                            cursor: 'pointer', 
                            background: selectedFolderId === String(f.id) ? 'rgba(127,119,221,0.15)' : 'transparent',
                            color: selectedFolderId === String(f.id) ? '#fff' : 'var(--text2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          className="folder-item-row"
                          onClick={() => setSelectedFolderId(String(f.id))}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: f.color }}>{f.icon}</span>
                            <span>{f.name}</span>
                          </span>
                          <span className="folder-actions" style={{ display: 'none', gap: '6px' }}>
                            <button onClick={(e) => { e.stopPropagation(); renameFolder(f.id, f.name) }} style={{ background:'transparent', border:'none', color:'var(--text2)', fontSize:'10px', cursor:'pointer' }}>✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteFolder(f.id, f.name) }} style={{ background:'transparent', border:'none', color:'var(--red)', fontSize:'10px', cursor:'pointer' }}>🗑️</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Difficulty Quick Filter */}
                <div style={{ padding:'10px 12px 8px', display:'flex', gap:'4px', flexWrap:'wrap', borderBottom:`1px solid ${borderColor}` }}>
                  {['all','Easy','Medium','Hard','Insane'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', border:`1px solid ${filter===f ? 'var(--purple-600)' : 'var(--border)'}`, background: filter===f ? 'var(--purple-600)' : 'transparent', color: filter===f ? '#fff' : 'var(--text2)', cursor:'pointer', fontFamily:'monospace' }}>
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                </div>

                {/* Writeups List */}
                <div style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
                  {loading ? (
                    <div style={{ padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid rgba(127,119,221,0.08)' }}>
                          <div className="skeleton-pulse" style={{ height: '14px', width: '85%' }} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <div className="skeleton-pulse" style={{ height: '12px', width: '35px' }} />
                            <div className="skeleton-pulse" style={{ height: '12px', width: '55px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : writeups.length === 0 ? (
                    <div style={{ padding:'20px', textAlign:'center', color:'var(--text2)', fontFamily:'monospace', fontSize:'12px' }}>No writeups found</div>
                  ) : writeups.map(w => (
                    <Link key={w.id} href={`/dashboard/${w.id}`}
                      className={`sidebar-item ${String(w.id) === activeId ? 'active' : ''}`}
                      style={{ display:'block', textDecoration:'none', padding:'10px 14px', position: 'relative' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <div className="title" style={{ fontSize:'13px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight: '12px' }}>{w.title}</div>
                        <button 
                          onClick={(e) => toggleStarWriteup(w, e)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: 0,
                            opacity: w.is_starred === 1 ? 1 : 0.2
                          }}
                        >
                          ⭐
                        </button>
                      </div>
                      <div style={{ display:'flex', gap:'5px', alignItems:'center', flexWrap:'wrap' }}>
                        {w.writeup_mode === 'cve' ? (
                          <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,69,96,0.1)', color: 'var(--red)', border: '1px solid rgba(255,69,96,0.2)' }}>
                            CVSS {w.cve_cvss_score ? Number(w.cve_cvss_score).toFixed(1) : '-'}
                          </span>
                        ) : (
                          <DiffBadge diff={w.difficulty} />
                        )}
                        <span className="badge-platform" style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'10px', background:'rgba(127,119,221,0.12)', color:'var(--purple-200)', border:'1px solid rgba(127,119,221,0.2)', fontFamily:'monospace' }} title={w.platform}>{w.platform}</span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderTop:'1px solid var(--border)', background:'rgba(0,0,0,0.15)', fontFamily:'monospace' }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: page === 1 ? 'var(--text2)' : '#fff',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      ◄ Prev
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: page === totalPages ? 'var(--text2)' : '#fff',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Next ►
                    </button>
                  </div>
                )}

                {/* Stats */}
                <div style={{ padding:'8px 14px', borderTop:`1px solid ${borderColor}`, display:'flex', gap:'10px', flexWrap:'wrap', fontFamily:'monospace', fontSize:'10px', color:'var(--text2)' }}>
                  <span>Total <span style={{ color:'var(--purple-400)' }}>{writeups.length}</span></span>
                  <span style={{ color:'var(--green)' }}>Easy {counts.Easy}</span>
                  <span style={{ color:'var(--amber)' }}>Med {counts.Medium}</span>
                  <span style={{ color:'var(--red)' }}>Hard {counts.Hard}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN */}
        <div className="dashboard-main">
          {children}
        </div>
      </div>

      <style jsx global>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg);
        }
        .dashboard-body {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        .dashboard-sidebar {
          width: 280px;
          flex-shrink: 0;
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: transform 0.3s ease;
          z-index: 90;
        }
        .dashboard-main {
          flex: 1;
          overflow-y: auto;
        }
        .menu-toggle {
          display: none;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-family: monospace;
          font-size: 14px;
        }
        .sidebar-overlay {
          display: none;
        }
        .sidebar-item {
          border-left: 3px solid transparent;
          background: transparent;
          color: var(--text);
        }
        .sidebar-item:hover {
          background: rgba(255,255,255,0.02);
        }
        .sidebar-item.active {
          background: rgba(127,119,221,0.08);
          border-left-color: var(--purple-500);
          color: #fff;
        }
        .folder-item-row:hover .folder-actions {
          display: flex !important;
        }
        .sidebar-nav-item:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          color: #fff !important;
        }
        .avatar-hover:hover {
          border-color: var(--purple-400) !important;
          box-shadow: 0 0 10px rgba(127,119,221,0.4);
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .dropdown-item-logout:hover {
          background: rgba(255, 69, 96, 0.08) !important;
        }
        .btn-new-writeup:hover {
          background: var(--purple-800) !important;
          box-shadow: 0 4px 12px rgba(83,74,183,0.5) !important;
          transform: translateY(-1px);
        }
        .command-palette-pill {
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .command-palette-pill:hover {
          opacity: 1;
        }
        @media (max-width: 768px) {
          .menu-toggle {
            display: block;
          }
          .dashboard-sidebar {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 56px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 80;
          }
        }
      `}</style>
    </div>
  )
}
