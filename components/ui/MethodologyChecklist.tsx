'use client'
import React, { useState } from 'react'
import { builtInMethodologies, MethodologyTemplate } from '@/lib/methodologies'

interface MethodologyChecklistProps {
  initialState?: Record<string, boolean>
  onChange?: (state: Record<string, boolean>) => void
}

export default function MethodologyChecklist({ initialState = {}, onChange }: MethodologyChecklistProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MethodologyTemplate | null>(null)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(initialState)
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (id: string) => {
    const newState = { ...checkedItems, [id]: !checkedItems[id] }
    setCheckedItems(newState)
    if (onChange) onChange(newState)
  }

  const handleSelectTemplate = (templateId: string) => {
    const template = builtInMethodologies.find(t => t.id === templateId) || null
    setSelectedTemplate(template)
  }

  const calculateProgress = () => {
    if (!selectedTemplate || selectedTemplate.items.length === 0) return 0
    const total = selectedTemplate.items.length
    const checked = selectedTemplate.items.filter(item => checkedItems[item.id]).length
    return Math.round((checked / total) * 100)
  }

  const progress = calculateProgress()

  return (
    <div style={{ fontFamily: 'monospace', marginBottom: '20px' }}>
      {/* Header / Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: isOpen ? '8px 8px 0 0' : '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>Methodology Checklist</span>
          {selectedTemplate && (
            <span style={{ fontSize: '12px', background: 'var(--purple-900)', color: '#fff', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--purple-600)' }}>
              {selectedTemplate.name}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {selectedTemplate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'var(--purple-500)', transition: 'width 0.3s ease' }}></div>
              </div>
              <span style={{ fontSize: '11px', color: progress === 100 ? 'var(--green)' : 'var(--text2)' }}>{progress}%</span>
            </div>
          )}
          <span style={{ color: 'var(--text2)' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {!selectedTemplate ? (
            <div>
              <p style={{ color: 'var(--text2)', fontSize: '12px', marginBottom: '16px' }}>
                Pilih metodologi untuk melacak progres pengujian Anda pada writeup ini.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {builtInMethodologies.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      padding: '12px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--purple-500)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--purple-300)' }}>{t.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text2)' }}>{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{selectedTemplate.description}</span>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                >
                  Ganti Template
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedTemplate.items.map(item => {
                  const isChecked = !!checkedItems[item.id]
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleToggle(item.id)}
                      style={{
                        background: isChecked ? 'rgba(46, 204, 113, 0.05)' : 'var(--bg2)',
                        border: `1px solid ${isChecked ? 'rgba(46, 204, 113, 0.3)' : 'var(--border)'}`,
                        borderRadius: '6px',
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ paddingTop: '2px' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // Handle on div click
                          style={{ accentColor: 'var(--green)', transform: 'scale(1.2)', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ flex: 1, opacity: isChecked ? 0.6 : 1, textDecoration: isChecked ? 'line-through' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: isChecked ? 'var(--green)' : '#fff', fontWeight: 'bold', fontSize: '13px' }}>{item.name}</span>
                          <span style={{ fontSize: '10px', background: 'var(--bg3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--purple-200)' }}>
                            {item.category}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text2)', fontSize: '11px', lineHeight: '1.4' }}>
                          {item.description}
                        </div>
                        {item.reference && !isChecked && (
                          <div style={{ marginTop: '8px' }}>
                            <a 
                              href={item.reference} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ color: 'var(--purple-400)', fontSize: '11px', textDecoration: 'none' }}
                            >
                              🔗 Referensi / Panduan
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
