'use client'
import { useState, useEffect, useRef } from 'react'

interface TagInputProps {
  value: string // comma-separated tags
  onChange: (val: string) => void
  placeholder?: string
}

export default function TagInput({ value, onChange, placeholder = 'Tambahkan tag...' }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<{ name: string; count: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : []

  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags')
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.tags || [])
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err)
      }
    }
    fetchTags()
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().replace(/,/g, '')
    if (cleanTag && !tags.includes(cleanTag)) {
      const updated = [...tags, cleanTag].join(',')
      onChange(updated)
    }
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tagToRemove: string) => {
    const updated = tags.filter(t => t !== tagToRemove).join(',')
    onChange(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  // Generate deterministic color based on string hash for cool aesthetics
  const getTagColor = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return {
      bg: `hsla(${hue}, 70%, 15%, 0.35)`,
      border: `hsla(${hue}, 75%, 60%, 0.45)`,
      text: `hsla(${hue}, 85%, 85%, 1)`
    }
  }

  const availableSuggestions = suggestions.filter(
    s => s.name.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s.name)
  )

  return (
    <div ref={wrapperRef} style={{ position: 'relative', fontFamily: 'monospace' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '6px 10px',
        minHeight: '40px'
      }}>
        {tags.map(t => {
          const colors = getTagColor(t)
          return (
            <span
              key={t}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                userSelect: 'none'
              }}
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.text,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ×
              </button>
            </span>
          )
        })}

        <input
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '120px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'monospace',
            padding: '2px 0'
          }}
        />
      </div>

      {/* Suggestion Dropdown */}
      {showSuggestions && availableSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          marginTop: '4px',
          maxHeight: '180px',
          overflowY: 'auto',
          zIndex: 50,
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          {availableSuggestions.map(s => (
            <div
              key={s.name}
              onClick={() => addTag(s.name)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: 'var(--text2)',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.02)'
              }}
              className="suggestion-item"
            >
              <span>{s.name}</span>
              <span style={{ color: 'var(--purple-400)', fontSize: '10px' }}>({s.count} writeups)</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .suggestion-item:hover {
          background: var(--purple-900) !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  )
}
