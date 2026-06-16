'use client'
import { useState, useEffect } from 'react'
import { getTranslation, getCurrentLang, Lang } from '@/lib/i18n'

interface PublicWriteup {
  id: number
  title: string
  platform: string
  difficulty: string
  tags: string
  created_at: string
  writeup_mode: 'journal' | 'cve'
  cve_id: string | null
  cve_cvss_score: number | null
  cve_cvss_severity: string | null
  username: string
  content: string
  upvotes: number
  comments_count: number
  has_upvoted: number
}

export default function FeedPage() {
  const [writeups, setWriteups] = useState<PublicWriteup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWriteup, setSelectedWriteup] = useState<PublicWriteup | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [lang, setLang] = useState<Lang>('id')

  useEffect(() => {
    setLang(getCurrentLang())
    fetchFeed()
  }, [])

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/feed')
      const data = await res.json()
      if (res.ok) {
        setWriteups(data.writeups || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpvote = async (id: number) => {
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeupId: id, type: 'upvote' })
      })
      if (res.ok) {
        // Toggle in state
        setWriteups(prev => prev.map(w => {
          if (w.id === id) {
            const hasUpvoted = w.has_upvoted === 1 ? 0 : 1
            const upvotes = hasUpvoted === 1 ? w.upvotes + 1 : w.upvotes - 1
            return { ...w, has_upvoted: hasUpvoted, upvotes }
          }
          return w
        }))
        if (selectedWriteup && selectedWriteup.id === id) {
          setSelectedWriteup(prev => {
            if (!prev) return null
            const hasUpvoted = prev.has_upvoted === 1 ? 0 : 1
            const upvotes = hasUpvoted === 1 ? prev.upvotes + 1 : prev.upvotes - 1
            return { ...prev, has_upvoted, upvotes }
          })
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchComments = async (id: number) => {
    try {
      const res = await fetch(`/api/feed/${id}/comments`)
      const data = await res.json()
      if (res.ok) {
        setComments(data.comments || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectWriteup = (w: PublicWriteup) => {
    setSelectedWriteup(w)
    setComments([])
    fetchComments(w.id)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedWriteup) return

    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeupId: selectedWriteup.id, type: 'comment', content: newComment })
      })

      if (res.ok) {
        setNewComment('')
        fetchComments(selectedWriteup.id)
        // Update comments count in list
        setWriteups(prev => prev.map(w => {
          if (w.id === selectedWriteup.id) {
            return { ...w, comments_count: w.comments_count + 1 }
          }
          return w
        }))
      }
    } catch (err) {
      console.error(err)
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
          🌐 {getTranslation(lang, 'feed')}
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Left Side: List */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {writeups.length === 0 ? (
            <div style={{ padding: '40px', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text2)' }}>
              No public writeups available yet.
            </div>
          ) : (
            writeups.map(w => (
              <div
                key={w.id}
                onClick={() => handleSelectWriteup(w)}
                style={{
                  background: 'var(--bg2)',
                  border: `1px solid ${selectedWriteup?.id === w.id ? '#7F77DD' : 'var(--border)'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedWriteup?.id === w.id ? '0 0 15px rgba(127,119,221,0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>{w.title}</h3>
                  <span style={{ fontSize: '11px', color: '#7F77DD' }}>@{w.username}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text2)', borderRadius: '4px' }}>
                    {w.platform}
                  </span>
                  {w.writeup_mode === 'cve' ? (
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,69,96,0.1)', color: 'var(--red)', borderRadius: '4px' }}>
                      CVSS {w.cve_cvss_score || '-'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(57,255,20,0.08)', color: 'var(--green)', borderRadius: '4px' }}>
                      {w.difficulty}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text2)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpvote(w.id) }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: w.has_upvoted === 1 ? '#7F77DD' : 'var(--text2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    ▲ {w.upvotes} Upvotes
                  </button>
                  <span>💬 {w.comments_count} Comments</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Detail View */}
        <div style={{ flex: '1 1 500px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', minHeight: '400px' }}>
          {selectedWriteup ? (
            <div>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#7F77DD' }}>PUBLISHED BY @{selectedWriteup.username}</span>
                  <button
                    onClick={() => handleUpvote(selectedWriteup.id)}
                    style={{
                      background: 'rgba(127,119,221,0.1)',
                      border: '1px solid #7F77DD',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    {selectedWriteup.has_upvoted === 1 ? '▲ Upvoted' : '▲ Upvote'} ({selectedWriteup.upvotes})
                  </button>
                </div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{selectedWriteup.title}</h3>
              </div>

              {/* Content preview */}
              <div style={{
                background: '#070710',
                padding: '16px',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '13px',
                lineHeight: '1.6',
                maxHeight: '300px',
                overflowY: 'auto',
                marginBottom: '24px',
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedWriteup.content}
              </div>

              {/* Comments Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px' }}>Comments</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                  {comments.length === 0 ? (
                    <div style={{ color: 'var(--text2)', fontSize: '12px', fontStyle: 'italic' }}>No comments yet. Share your thoughts!</div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={{ background: '#121225', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8F9CAE', marginBottom: '4px' }}>
                          <span>@{c.username}</span>
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ color: '#fff', fontSize: '12px' }}>{c.content}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a feedback or comment..."
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
                    Send
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)' }}>
              Select a writeup from the feed to view and comment.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
