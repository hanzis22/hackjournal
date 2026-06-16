'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CommandPaletteProps {
  writeups: any[]
  onClose?: () => void
}

export default function CommandPalette({ writeups, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        if (onClose) onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Define static quick actions
  const actions = [
    { id: 'new-writeup', title: '➕ Buat Writeup Baru', action: () => router.push('/dashboard/new') },
    { id: 'settings', title: '⚙️ Buka Pengaturan', action: () => router.push('/dashboard/settings') },
    { id: 'theme-toggle', title: '🌓 Ganti Tema (Terang/Gelap)', action: () => {
      const current = document.documentElement.getAttribute('data-theme')
      document.documentElement.setAttribute('data-theme', current === 'light' ? 'dark' : 'light')
    }},
    { id: 'logout', title: '🚪 Logout', action: async () => {
      await fetch('/api/auth/login', { method: 'DELETE' })
      router.push('/login')
      router.refresh()
    }}
  ]

  // Filter items
  const filteredWriteups = writeups
    .filter(w => w.title.toLowerCase().includes(search.toLowerCase()))
    .map(w => ({
      id: `w-${w.id}`,
      title: `📝 ${w.title}`,
      action: () => router.push(`/dashboard/${w.id}`)
    }))

  const allItems = [
    ...actions.filter(a => a.title.toLowerCase().includes(search.toLowerCase())),
    ...filteredWriteups
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % allItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action()
        setIsOpen(false)
        if (onClose) onClose()
      }
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 8, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 2000,
      paddingTop: '15vh',
      fontFamily: 'monospace'
    }} onClick={() => { setIsOpen(false); if (onClose) onClose(); }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '550px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ color: 'var(--purple-400)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ketik perintah atau cari laporan..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text2)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: '4px' }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
          {allItems.length > 0 ? (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action()
                    setIsOpen(false)
                    if (onClose) onClose()
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'var(--purple-900)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text2)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{item.title}</span>
                  {isSelected && (
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>↩ Enter</span>
                  )}
                </div>
              )
            })
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text2)', fontSize: '12px' }}>
              Tidak ada hasil ditemukan
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
