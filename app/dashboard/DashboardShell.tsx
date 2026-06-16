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
  }, [])

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

      if (selectedFolderId === 'starred') {
        params.set('is_starred', 'true')
      } else if (selectedFolderId === 'unorganized') {
        params.set('folder_id', 'null')
      } else if (selectedFolderId) {
        params.set('folder_id', selectedFolderId)
      }

      const res = await fetch(`/api/writeups?${params}`)
      if (res.ok) {
        const data = await res.json()
        setWriteups(data.writeups || [])
      } else {
        setWriteups([])
      }
    } catch (err) {
      console.error('Fetch writeups network error:', err)
      setWriteups([])
    } finally {
      setLoading(false)
    }
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
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
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
      <div style={{ height:'52px', background:sidebarBg, borderBottom:`1px solid ${borderColor}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', fontFamily:'monospace', fontSize:'18px', color:'var(--purple-400)' }}>
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div style={{ width:'32px', height:'32px', background:'var(--purple-600)', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'#fff' }}>⬡</div>
          <span className="no-print" style={{ display: 'flex' }}>Hack<span style={{ color:'var(--purple-200)' }}>Journal</span></span>
          <span style={{ fontSize: '10px', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text2)', marginLeft: '12px' }}>Ctrl + K Command Palette</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'var(--text2)', fontFamily:'monospace' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'var(--green)', display:'inline-block' }}></span>
            {user?.username || '...'}
          </span>
          <Link href="/dashboard" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            📓 {getTranslation(lang, 'writeups')}
          </Link>
          <Link href="/dashboard/feed" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/feed' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/feed' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            🌐 {getTranslation(lang, 'feed')}
          </Link>
          <Link href="/dashboard/teams" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/teams' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/teams' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            👥 {getTranslation(lang, 'teams')}
          </Link>
          <Link href="/dashboard/engagements" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/engagements' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/engagements' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            📦 {getTranslation(lang, 'engagements')}
          </Link>
          <Link href="/dashboard/achievements" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/achievements' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/achievements' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            🏆 {getTranslation(lang, 'achievements')}
          </Link>
          <Link href="/dashboard/vault" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/vault' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/vault' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            🔐 {getTranslation(lang, 'vault')}
          </Link>
          <Link href="/dashboard/analytics" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/analytics' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/analytics' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text2)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            📊 {getTranslation(lang, 'dashboard')}
          </Link>
          <Link href="/dashboard/settings" style={{ padding:'6px 10px', borderRadius:'6px', border:pathname === '/dashboard/settings' ? '1px solid var(--purple-500)' : '1px solid var(--border)', background:pathname === '/dashboard/settings' ? 'rgba(127,119,221,0.1)' : 'transparent', color:'var(--text2)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
            ⚙ {getTranslation(lang, 'settings')}
          </Link>
          <Link href="/dashboard/new" style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid var(--border2)', background:'transparent', color:'var(--purple-200)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px', textDecoration:'none', display:'flex', alignItems:'center', gap:'6px' }}>
            + {getTranslation(lang, 'newWriteup')}
          </Link>
          <button onClick={logout} style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid rgba(255,69,96,0.3)', background:'transparent', color:'var(--red)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px' }}>
            Logout
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="dashboard-body">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}

        {/* SIDEBAR */}
        <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ fontFamily: 'monospace' }}>
          
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
              <div style={{ padding:'20px', textAlign:'center', color:'var(--text2)', fontFamily:'monospace', fontSize:'12px' }}>// Loading...</div>
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

          {/* Stats */}
          <div style={{ padding:'8px 14px', borderTop:`1px solid ${borderColor}`, display:'flex', gap:'10px', flexWrap:'wrap', fontFamily:'monospace', fontSize:'10px', color:'var(--text2)' }}>
            <span>Total <span style={{ color:'var(--purple-400)' }}>{writeups.length}</span></span>
            <span style={{ color:'var(--green)' }}>Easy {counts.Easy}</span>
            <span style={{ color:'var(--amber)' }}>Med {counts.Medium}</span>
            <span style={{ color:'var(--red)' }}>Hard {counts.Hard}</span>
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
            top: 52px;
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
