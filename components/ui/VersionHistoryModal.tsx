'use client'
import React, { useState, useEffect } from 'react'

interface Version {
  id: number
  created_at: string
  title: string
}

interface VersionHistoryModalProps {
  writeupId: number
  onClose: () => void
  onRestore: (snapshot: any) => void
}

export default function VersionHistoryModal({ writeupId, onClose, onRestore }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  useEffect(() => {
    fetch(`/api/writeups/${writeupId}/versions`)
      .then(r => r.json())
      .then(d => {
        if (d.versions) setVersions(d.versions)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [writeupId])

  const loadSnapshot = async (vid: number) => {
    setLoadingSnapshot(true)
    try {
      const res = await fetch(`/api/writeups/${writeupId}/versions/${vid}`)
      const data = await res.json()
      if (data.snapshot) {
        setSelectedSnapshot(data.snapshot)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSnapshot(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: '8px', width: '900px', height: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: 'var(--purple-300)', fontFamily: 'monospace' }}>🕒 Version History</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: '300px', borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg2)' }}>
            {loading ? <div style={{ padding: '20px', color: 'var(--text2)' }}>Loading...</div> : versions.length === 0 ? <div style={{ padding: '20px', color: 'var(--text2)' }}>No previous versions found.</div> : versions.map(v => (
              <div 
                key={v.id} 
                onClick={() => loadSnapshot(v.id)}
                style={{
                  padding: '16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedSnapshot?.id === v.id ? 'var(--purple-900)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>{v.title || 'Untitled'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace' }}>
                  {new Date(v.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          
          {/* Main Content */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {loadingSnapshot ? (
              <div style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>Loading snapshot...</div>
            ) : selectedSnapshot ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: '#fff' }}>{selectedSnapshot.title}</h3>
                  <button 
                    onClick={() => onRestore(selectedSnapshot)}
                    style={{
                      padding: '8px 16px', background: 'var(--purple-600)', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    Restore this version
                  </button>
                </div>
                <div style={{ background: 'var(--bg2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
                  {selectedSnapshot.content || 'No content'}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text2)', fontFamily: 'monospace', margin: 'auto' }}>
                Select a version from the left panel to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
