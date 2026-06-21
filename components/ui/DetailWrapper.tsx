'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DiffBadge from '@/components/ui/DiffBadge'
import DeleteButton from '@/app/dashboard/[id]/DeleteButton'
import PdfExport from '@/app/dashboard/[id]/PdfExport'
import CopyCodeHandler from '@/components/ui/CopyCodeHandler'
import CopyMarkdownButton from '@/components/ui/CopyMarkdownButton'
import MultiExportButton from '@/components/ui/MultiExportButton'
import EncryptionGate from '@/components/ui/EncryptionGate'
import WriteupContentRenderer from '@/components/ui/WriteupContentRenderer'
import ComplianceReportModal from '@/components/ui/ComplianceReportModal'
import { showToast } from '@/components/ui/Toast'
import { 
  MessageSquare, 
  MessageSquareDashed, 
  Trash2, 
  Eye, 
  EyeOff, 
  BellOff, 
  Bell, 
  Check, 
  FolderSync, 
  FileSignature, 
  ExternalLink,
  ChevronRight,
  ClipboardList
} from 'lucide-react'

interface Props {
  writeup: any
}

export default function DetailWrapper({ writeup: initialWriteup }: Props) {
  const router = useRouter()
  const [writeup, setWriteup] = useState(initialWriteup)
  const [isDecrypting, setIsDecrypting] = useState(initialWriteup.is_encrypted === 1)
  const [showCompliance, setShowCompliance] = useState(false)

  // Team states
  const [teamRole, setTeamRole] = useState<'owner' | 'editor' | 'viewer' | null>(null)
  const [teamName, setTeamName] = useState('')
  const [myTeams, setMyTeams] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Copy to team UI states
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [isCopying, setIsCopying] = useState(false)

  // Promote to library UI states
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteTeamId, setPromoteTeamId] = useState('')
  const [isPromoting, setIsPromoting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUser(data.user)
      })
      .catch(err => console.error('Error fetching current user:', err))
  }, [])

  useEffect(() => {
    // Load teams and find role/context
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        const teamsList = data.teams || []
        setMyTeams(teamsList)
        if (writeup.team_id) {
          const matched = teamsList.find((t: any) => t.id === writeup.team_id)
          if (matched) {
            setTeamRole(matched.role)
            setTeamName(matched.name)
          }
        }
      })
      .catch(err => console.error('Error fetching teams:', err))
  }, [writeup.team_id])

  const [teamMembers, setTeamMembers] = useState<any[]>([])

  useEffect(() => {
    if (writeup.team_id) {
      fetch(`/api/teams/${writeup.team_id}/members`)
        .then(res => res.json())
        .then(data => setTeamMembers(data.members || []))
        .catch(err => console.error('Error fetching team members:', err))
    }
  }, [writeup.team_id])

  const handleDecrypted = (decrypted: any) => {
    setWriteup(decrypted)
    setIsDecrypting(false)
  }

  // Inline Comments states
  const [comments, setComments] = useState<any[]>([])
  const [activeSelection, setActiveSelection] = useState<{
    quote: string
    prefix: string
    suffix: string
  } | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false)
  const [replyInput, setReplyInput] = useState<Record<number, string>>({})
  const [commentFilter, setCommentFilter] = useState<'all' | 'active'>('active')

  const [isTask, setIsTask] = useState(false)
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [mutedThreadIds, setMutedThreadIds] = useState<number[]>([])

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/writeups/${writeup.id}/comments`)
      const data = await res.json()
      if (res.ok) {
        setComments(data.comments || [])
        setMutedThreadIds(data.mutedThreadIds || [])
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [writeup.id])

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString().trim()
    if (!selectedText) return

    // Get selection context
    const anchorNode = selection.anchorNode
    if (!anchorNode) return

    const fullText = anchorNode.parentElement?.textContent || ''
    const index = fullText.indexOf(selectedText)

    let prefix = ''
    let suffix = ''

    if (index !== -1) {
      prefix = fullText.substring(Math.max(0, index - 60), index)
      suffix = fullText.substring(index + selectedText.length, index + selectedText.length + 60)
    }

    setActiveSelection({
      quote: selectedText,
      prefix,
      suffix
    })
    setShowCommentsSidebar(true) // auto open comments sidebar when text is selected!
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim()) return

    try {
      const res = await fetch(`/api/writeups/${writeup.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentInput,
          anchor_quote: activeSelection?.quote || null,
          anchor_prefix: activeSelection?.prefix || null,
          anchor_suffix: activeSelection?.suffix || null,
          is_task: isTask,
          task_assignee_id: isTask && taskAssigneeId ? Number(taskAssigneeId) : null
        })
      })

      if (res.ok) {
        setCommentInput('')
        setActiveSelection(null)
        setIsTask(false)
        setTaskAssigneeId('')
        showToast('Komentar berhasil ditambahkan', 'success')
        fetchComments()
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal mengirim komentar', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleAddReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault()
    const replyText = replyInput[parentId]
    if (!replyText || !replyText.trim()) return

    try {
      const res = await fetch(`/api/writeups/${writeup.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText,
          parent_comment_id: parentId
        })
      })

      if (res.ok) {
        setReplyInput(prev => ({ ...prev, [parentId]: '' }))
        showToast('Balasan dikirim', 'success')
        fetchComments()
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal mengirim balasan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  const handleToggleResolve = async (commentId: number, currentResolved: boolean) => {
    try {
      const res = await fetch(`/api/writeups/${writeup.id}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_resolved: !currentResolved })
      })
      if (res.ok) {
        showToast(!currentResolved ? 'Komentar diselesaikan' : 'Komentar dibuka kembali', 'info')
        fetchComments()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleMute = async (commentId: number, currentMuted: boolean) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mute: !currentMuted })
      })
      if (res.ok) {
        showToast(!currentMuted ? 'Thread dinonaktifkan (Muted)' : 'Thread diaktifkan (Unmuted)', 'info')
        fetchComments()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Hapus komentar ini?')) return
    try {
      const res = await fetch(`/api/writeups/${writeup.id}/comments/${commentId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Komentar dihapus', 'success')
        fetchComments()
      } else {
        showToast('Gagal menghapus komentar', 'error')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopyToTeam = async () => {
    if (!selectedTeamId) return
    setIsCopying(true)

    try {
      const res = await fetch(`/api/writeups/${writeup.id}/share-to-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: Number(selectedTeamId),
          decrypted_content: initialWriteup.is_encrypted === 1 ? writeup.content : undefined
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Laporan berhasil disalin ke tim!', 'success')
        setTimeout(() => {
          setShowCopyModal(false)
          router.push(`/dashboard/${data.newWriteupId}`)
          router.refresh()
        }, 1200)
      } else {
        showToast(data.error || 'Gagal menyalin laporan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsCopying(false)
    }
  }

  const executePromotion = async (targetTeamId: number, severity: string, description: string, remediation: string) => {
    setIsPromoting(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: writeup.title,
          severity,
          description,
          remediation,
          team_id: targetTeamId
        })
      })

      if (res.ok) {
        showToast('Laporan berhasil dipromosikan ke Findings Library!', 'success')
        setShowPromoteModal(false)
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal mempromosikan ke library', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsPromoting(false)
    }
  }

  const handleConfirmPromotion = () => {
    if (!promoteTeamId) return
    const isCve = writeup.writeup_mode === 'cve'
    const severity = isCve ? (writeup.cve_cvss_severity || 'Medium') : (writeup.global_severity !== 'None' ? writeup.global_severity : 'Medium')
    const description = isCve ? (writeup.cve_impact || '') : (writeup.content || '')
    const remediation = isCve ? (writeup.cve_remediation || '') : 'Silakan lengkapi rekomendasi untuk template ini.'
    executePromotion(Number(promoteTeamId), severity, description, remediation)
  }

  const handlePromoteToLibrary = async () => {
    try {
      const isCve = writeup.writeup_mode === 'cve'
      const severity = isCve ? (writeup.cve_cvss_severity || 'Medium') : (writeup.global_severity !== 'None' ? writeup.global_severity : 'Medium')
      const description = isCve ? (writeup.cve_impact || '') : (writeup.content || '')
      const remediation = isCve ? (writeup.cve_remediation || '') : 'Silakan lengkapi rekomendasi untuk template ini.'

      if (!description || !description.trim()) {
        showToast('Deskripsi laporan kosong, gagal mempromosikan ke library.', 'error')
        return
      }

      let targetTeamId = writeup.team_id
      if (!targetTeamId) {
        setSelectedTeamId('')
        setPromoteTeamId('')
        setShowPromoteModal(true)
        return
      }

      await executePromotion(targetTeamId, severity, description, remediation)
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan jaringan', 'error')
    }
  }

  if (isDecrypting) {
    return (
      <EncryptionGate
        initialWriteup={initialWriteup}
        onDecrypted={handleDecrypted}
        onBack={() => router.back()}
        backLabel="Kembali"
      />
    )
  }

  const isCve = writeup.writeup_mode === 'cve'
  const tags: string[] = writeup.tags
    ? (typeof writeup.tags === 'string' ? writeup.tags.split(',') : writeup.tags).filter(Boolean)
    : []

  const sevColor: Record<string, string> = {
    Critical: 'var(--purple-400)',
    High: 'var(--red)',
    Medium: 'var(--amber)',
    Low: 'var(--green)',
    None: 'var(--text2)',
  }

  const sevBg: Record<string, string> = {
    Critical: 'rgba(175,169,236,0.12)',
    High: 'rgba(255,69,96,0.12)',
    Medium: 'rgba(240,165,0,0.12)',
    Low: 'rgba(57,255,20,0.12)',
    None: 'var(--bg3)',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft 📝',
    in_review: 'In Review 🔍',
    approved: 'Approved 🛡️',
    completed: 'Completed ✅'
  }
  const statusColors: Record<string, string> = {
    draft: '#6B7280',
    in_review: '#F59E0B',
    approved: '#10B981',
    completed: '#3B82F6'
  }
  const statusBgs: Record<string, string> = {
    draft: 'rgba(107, 114, 128, 0.12)',
    in_review: 'rgba(245, 158, 11, 0.12)',
    approved: 'rgba(16, 185, 129, 0.12)',
    completed: 'rgba(59, 130, 246, 0.12)'
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/writeups/${writeup.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Status berhasil diperbarui ke ${newStatus}`, 'success')
        setWriteup((prev: any) => ({ ...prev, status: newStatus }))
        router.refresh()
      } else {
        showToast(data.error || 'Gagal memperbarui status', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error')
    }
  }

  // Filter teams where user is owner or editor
  const eligibleTeams = myTeams.filter(t => t.role === 'owner' || t.role === 'editor')

  const filteredComments = comments.filter(c => {
    if (commentFilter === 'active') return !c.is_resolved
    return true
  })

  const rootComments = filteredComments.filter(c => !c.parent_comment_id)

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Main writeup detail section */}
      <div className="detail-page-wrapper" style={{ flex: 1, padding: '32px 40px', minWidth: 0 }}>
        <CopyCodeHandler contentId={writeup.id} />
        
        {/* Header Context Badge */}
        {writeup.team_id !== null && teamName && (
          <div style={{
            background: 'rgba(127,119,221,0.06)',
            border: '1px solid rgba(127,119,221,0.2)',
            color: 'var(--purple-300)',
            fontSize: '11px',
            fontFamily: 'monospace',
            padding: '6px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            👥 Tim: <strong>{teamName}</strong> ({teamRole === 'owner' ? 'Owner' : teamRole === 'editor' ? 'Editor' : 'Viewer'})
          </div>
        )}

        {/* Cloned source indicator */}
        {writeup.cloned_from_id !== null && (
          <div style={{ marginBottom: '16px' }}>
            <Link 
              href={`/dashboard/${writeup.cloned_from_id}`}
              style={{ fontSize: '11px', color: 'var(--purple-300)', fontFamily: 'monospace', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              ↪ Disalin dari laporan pribadi
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="detail-page-header" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              {isCve && writeup.cve_id && (
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  background: 'rgba(127,119,221,0.12)',
                  color: 'var(--purple-200)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(127,119,221,0.2)',
                  display: 'inline-block',
                  marginBottom: '8px',
                  letterSpacing: '1px',
                  fontWeight: 'bold'
                }}>
                  🚨 SECURITY ADVISORY &bull; {writeup.cve_id}
                </span>
              )}
              <h1 style={{ fontFamily: 'monospace', fontSize: '22px', color: '#fff', marginBottom: '14px', lineHeight: 1.3, fontWeight: 'bold' }}>
                {writeup.title}
              </h1>
            </div>

            {/* Quick Score Badge for CVE */}
            {isCve && writeup.cve_cvss_score !== null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#0e0e1e',
                border: `1px solid ${sevColor[writeup.cve_cvss_severity] || 'var(--border)'}`,
                padding: '10px 16px',
                borderRadius: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '8px', color: 'var(--text2)', fontFamily: 'monospace', textAlign: 'right', letterSpacing: '0.5px' }}>CVSS SCORE</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    color: sevColor[writeup.cve_cvss_severity] || 'var(--text)',
                    textAlign: 'right'
                  }}>
                    {(writeup.cve_cvss_severity || 'NONE').toUpperCase()}
                  </div>
                </div>
                <div style={{
                  background: sevBg[writeup.cve_cvss_severity] || 'var(--bg3)',
                  color: sevColor[writeup.cve_cvss_severity] || '#fff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${sevColor[writeup.cve_cvss_severity] || 'var(--border)'}`
                }}>
                  {Number(writeup.cve_cvss_score).toFixed(1)}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', marginTop: '10px' }}>
            {!isCve && <DiffBadge diff={writeup.difficulty} />}
            <span style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '10px', background: 'rgba(127,119,221,0.12)', color: 'var(--purple-200)', border: '1px solid rgba(127,119,221,0.2)', fontFamily: 'monospace' }}>
              {isCve ? 'Mode CVE' : writeup.platform}
            </span>
            <span style={{
              fontSize: '11px',
              padding: '2px 9px',
              borderRadius: '10px',
              background: statusBgs[writeup.status || 'draft'],
              color: statusColors[writeup.status || 'draft'],
              border: `1px solid ${statusColors[writeup.status || 'draft']}50`,
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}>
              {statusLabels[writeup.status || 'draft']}
            </span>
            {tags.map((t: string) => (
              <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', fontFamily: 'monospace' }}>{t}</span>
            ))}
            <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace', marginLeft: '4px' }}>
              {new Date(writeup.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* Actions panel */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--purple-500)',
                background: showCommentsSidebar ? 'rgba(127,119,221,0.2)' : 'transparent',
                color: 'var(--purple-200)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <MessageSquare size={13} /> Komentar ({comments.length})
            </button>

            {teamRole !== 'viewer' && (
              writeup.status && writeup.status !== 'draft' ? (
                <span style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text2)', fontFamily: 'monospace', fontSize: '12px', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  🔒 Locked (ReadOnly)
                </span>
              ) : (
                <Link href={`/dashboard/${writeup.id}/edit`} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--purple-200)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', textDecoration: 'none' }}>
                  ✎ Edit
                </Link>
              )
            )}

            {/* Status Transition Actions */}
            {teamRole && teamRole !== 'viewer' && (
              <div style={{ display: 'inline-flex', gap: '8px' }}>
                {(writeup.status === 'draft' || !writeup.status) && (
                  <button
                    onClick={() => handleStatusUpdate('in_review')}
                    style={{ padding: '8px 14px', background: 'var(--purple-600)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    🔍 Request Review
                  </button>
                )}
                {teamRole === 'owner' && writeup.status === 'in_review' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('approved')}
                      style={{ padding: '8px 14px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      🛡️ Approve Report
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('draft')}
                      style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      ↩ Reject to Draft
                    </button>
                  </>
                )}
                {teamRole === 'owner' && writeup.status === 'approved' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      style={{ padding: '8px 14px', background: 'var(--purple-600)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      ✅ Mark Completed
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('draft')}
                      style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      ↩ Revert to Draft (Unlock)
                    </button>
                  </>
                )}
                {teamRole === 'owner' && writeup.status === 'completed' && (
                  <button
                    onClick={() => handleStatusUpdate('draft')}
                    style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    ↩ Reopen (Revert to Draft)
                  </button>
                )}
              </div>
            )}

            <PdfExport writeup={writeup} tags={tags} />
            <MultiExportButton writeup={writeup} tags={tags} />
            <CopyMarkdownButton writeup={writeup} />
            
            {((writeup.team_id === null && currentUser && currentUser.id === writeup.user_id) || (writeup.team_id !== null && teamRole === 'owner')) && (
              <button
                onClick={handlePromoteToLibrary}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--purple-500)',
                  background: 'rgba(127,119,221,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ⭐ Promosikan ke Library
              </button>
            )}

            <button
              onClick={() => setShowCompliance(true)}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--purple-200)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ClipboardList size={13} /> Compliance Mapping
            </button>

            {(writeup.team_id === null || teamRole === 'owner') && writeup.is_public === 1 && (
              <a href={`/share/${writeup.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--purple-200)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                🔗 Share Link <ExternalLink size={11} />
              </a>
            )}

            {/* Copy to team button - only for personal writeups */}
            {writeup.team_id === null && (
              <button
                onClick={() => {
                  setSelectedTeamId('')
                  setShowCopyModal(true)
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--purple-500)', background: 'rgba(127,119,221,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FolderSync size={13} /> Salin ke Tim
              </button>
            )}

            {/* Save as template button - only for personal owner or team owner/editor */}
            {(writeup.team_id === null || teamRole === 'owner' || teamRole === 'editor') && (
              <button
                onClick={async () => {
                  const name = prompt('Masukkan nama template:')
                  if (!name || !name.trim()) return
                  const description = prompt('Masukkan deskripsi template (opsional):') || ''

                  try {
                    const res = await fetch(`/api/writeups/${writeup.id}/save-as-template`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: name.trim(),
                        description: description.trim(),
                        team_id: writeup.team_id ? Number(writeup.team_id) : undefined
                      })
                    })
                    const data = await res.json()
                    if (res.ok) {
                      showToast('Template berhasil disimpan!', 'success')
                    } else {
                      showToast(data.error || 'Gagal menyimpan template', 'error')
                    }
                  } catch (err: any) {
                    showToast(err.message || 'Koneksi gagal', 'error')
                  }
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--purple-200)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSignature size={13} /> Simpan Sebagai Template
              </button>
            )}

            {(writeup.team_id === null || teamRole === 'owner') && (
              <DeleteButton id={Number(writeup.id)} />
            )}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
        </div>

        {/* Content Area */}
        <div onMouseUp={handleTextSelection} style={{ position: 'relative' }}>
          <WriteupContentRenderer writeup={writeup} />
        </div>

        {showCompliance && (
          <ComplianceReportModal
            writeup={writeup}
            onClose={() => setShowCompliance(false)}
          />
        )}

        {/* Copy to Team Modal */}
        {showCopyModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 32px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>👥 Salin ke Workspace Tim</h3>
              
              {eligibleTeams.length === 0 ? (
                <p style={{ color: 'var(--text2)', fontSize: '12px', marginBottom: '20px', lineHeight: '1.5' }}>
                  Anda tidak memiliki tim aktif di mana Anda bertugas sebagai Owner atau Editor.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text2)', fontWeight: 'bold' }}>PILIH TIM TUJUAN</label>
                  <select
                    value={selectedTeamId}
                    onChange={e => setSelectedTeamId(e.target.value)}
                    style={{ background: '#05050c', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <option value="">-- Pilih Tim --</option>
                    {eligibleTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  onClick={() => setShowCopyModal(false)}
                  disabled={isCopying}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px' }}
                >
                  Batal
                </button>
                {eligibleTeams.length > 0 && (
                  <button
                    onClick={handleCopyToTeam}
                    disabled={isCopying || !selectedTeamId}
                    style={{ padding: '8px 16px', background: 'var(--purple-600)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}
                  >
                    {isCopying ? 'Menyalin...' : 'Salin Laporan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Promote to Library Modal */}
        {showPromoteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 32px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>📚 Pilih Tim Tujuan</h3>
              <p style={{ color: 'var(--text2)', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>
                Laporan ini tidak terikat dengan tim mana pun. Silakan pilih tim tujuan untuk mempromosikan temuan ini ke Findings Library tim tersebut.
              </p>
              
              {eligibleTeams.length === 0 ? (
                <p style={{ color: 'var(--text2)', fontSize: '12px', marginBottom: '20px', lineHeight: '1.5' }}>
                  Anda tidak memiliki tim aktif di mana Anda bertugas sebagai Owner atau Editor.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text2)', fontWeight: 'bold' }}>PILIH TIM TUJUAN</label>
                  <select
                    value={promoteTeamId}
                    onChange={e => setPromoteTeamId(e.target.value)}
                    style={{ background: '#05050c', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <option value="">-- Pilih Tim --</option>
                    {eligibleTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  onClick={() => setShowPromoteModal(false)}
                  disabled={isPromoting}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', borderRadius: '6px', fontSize: '12px' }}
                >
                  Batal
                </button>
                {eligibleTeams.length > 0 && (
                  <button
                    onClick={handleConfirmPromotion}
                    disabled={isPromoting || !promoteTeamId}
                    style={{ padding: '8px 16px', background: 'var(--purple-600)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}
                  >
                    {isPromoting ? 'Mempromosikan...' : 'Konfirmasi Promosi'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Inline Comments thread panel with smooth slide transition */}
      <div style={{
        width: showCommentsSidebar ? '380px' : '0px',
        opacity: showCommentsSidebar ? 1 : 0,
        overflowX: 'hidden',
        background: '#0e0e1e',
        borderLeft: showCommentsSidebar ? '1px solid var(--border)' : 'none',
        padding: showCommentsSidebar ? '24px' : '0px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxHeight: '100vh',
        overflowY: 'auto',
        position: 'sticky',
        top: 0,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: showCommentsSidebar ? '-8px 0 24px rgba(0,0,0,0.3)' : 'none'
      }}>
        {showCommentsSidebar && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--purple-300)' }}>
                💬 Komentar Laporan
              </h3>
              <button
                onClick={() => setShowCommentsSidebar(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Active Selection Info */}
            {activeSelection && (
              <div style={{ background: 'rgba(127,119,221,0.06)', border: '1px solid rgba(127,119,221,0.2)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '9px', color: 'var(--purple-300)', display: 'block', marginBottom: '6px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>TEKS TERPILIH:</span>
                <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#fff', fontStyle: 'italic', background: '#02020a', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)', lineHeight: '1.4' }}>
                  "{activeSelection.quote}"
                </p>
                <button
                  onClick={() => setActiveSelection(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '10px', cursor: 'pointer', padding: 0, fontFamily: 'monospace' }}
                >
                  [Batal Pilihan]
                </button>
              </div>
            )}

            {/* New Comment Input */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder={activeSelection ? "Tulis tanggapan untuk teks terpilih..." : "Tulis komentar umum..."}
                style={{ width: '100%', height: '80px', background: '#05050c', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'monospace', lineHeight: '1.4' }}
                required
              />

              {/* Task configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="is_task_checkbox"
                    checked={isTask}
                    onChange={e => setIsTask(e.target.checked)}
                    style={{ accentColor: 'var(--purple-500)', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_task_checkbox" style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'monospace', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🚩 Jadikan Tugas (Task Assignment)
                  </label>
                </div>
                {isTask && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--text2)', fontFamily: 'monospace' }}>PILIH PENANGGUNG JAWAB (ASSIGNEE)</label>
                    <select
                      value={taskAssigneeId}
                      onChange={e => setTaskAssigneeId(e.target.value)}
                      required={isTask}
                      style={{ width: '100%', background: '#05050c', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '11px', fontFamily: 'monospace', outline: 'none' }}
                    >
                      <option value="">-- Pilih Assignee --</option>
                      {(writeup.team_id ? teamMembers : (currentUser ? [{ user_id: currentUser.id, username: currentUser.username }] : [])).map((mem: any) => (
                        <option key={mem.user_id} value={mem.user_id}>
                          @{mem.username} {mem.role ? `(${mem.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                style={{ background: 'var(--purple-600)', border: 'none', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                Kirim Komentar
              </button>
            </form>

            {/* Comments Filter Tabs */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <button
                onClick={() => setCommentFilter('active')}
                style={{ background: 'transparent', border: 'none', color: commentFilter === 'active' ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: '11px', borderBottom: commentFilter === 'active' ? '2px solid var(--purple-500)' : 'none', paddingBottom: '6px', fontWeight: commentFilter === 'active' ? 'bold' : 'normal', fontFamily: 'monospace' }}
              >
                Aktif
              </button>
              <button
                onClick={() => setCommentFilter('all')}
                style={{ background: 'transparent', border: 'none', color: commentFilter === 'all' ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: '11px', borderBottom: commentFilter === 'all' ? '2px solid var(--purple-500)' : 'none', paddingBottom: '6px', fontWeight: commentFilter === 'all' ? 'bold' : 'normal', fontFamily: 'monospace' }}
              >
                Semua ({comments.length})
              </button>
            </div>

            {/* Comment Threads List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {rootComments.length === 0 ? (
                /* Premium Empty State inside comments */
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text2)', background: '#05050c', borderRadius: '8px', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <MessageSquareDashed size={20} style={{ opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                    {activeSelection 
                      ? "Gunakan form di atas untuk menanggapi teks terpilih." 
                      : "Belum ada komentar. Sorot teks pada laporan untuk membuat komentar inline ala Google Docs."}
                  </p>
                </div>
              ) : (
              rootComments.map(c => {
                  const replies = comments.filter(r => r.parent_comment_id === c.id)
                  const isCommentTask = c.is_task === 1
                  const isCommentResolved = c.is_resolved === 1
                  const assignee = teamMembers.find((m: any) => m.user_id === c.task_assignee_id)
                  const assigneeName = assignee ? assignee.username : (c.task_assignee_id === currentUser?.id ? currentUser.username : null)
                  
                  return (
                    <div 
                      key={c.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border)', 
                        paddingBottom: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px',
                        borderLeft: isCommentTask ? `3px solid ${isCommentResolved ? 'var(--green)' : '#F59E0B'}` : 'none',
                        paddingLeft: isCommentTask ? '10px' : '0px',
                        background: isCommentTask ? 'rgba(245,158,11,0.02)' : 'transparent',
                        borderRadius: isCommentTask ? '0 8px 8px 0' : '0'
                      }}
                    >
                      {/* Anchor Quote */}
                      {c.anchor_quote && (
                        <div style={{ borderLeft: '3px solid var(--purple-500)', padding: '8px', marginBottom: '4px', fontSize: '11px', background: 'rgba(127,119,221,0.03)', borderRadius: '4px' }}>
                           <span style={{ fontSize: '8px', color: 'var(--purple-300)', display: 'block', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: '2px' }}>KONTEKS TEKS:</span>
                           <div style={{ color: '#fff', fontStyle: 'italic', lineHeight: '1.4' }}>"{c.anchor_quote}"</div>
                           {c.is_orphaned === 1 && (
                             <span style={{ color: 'var(--red)', fontSize: '9px', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>⚠️ Teks asal telah berubah/dihapus (Orphaned)</span>
                           )}
                        </div>
                      )}
 
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--purple-300)', fontWeight: 'bold', fontSize: '12px', fontFamily: 'monospace' }}>@{c.username}</span>
                        {isCommentTask && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            color: isCommentResolved ? 'var(--green)' : '#F59E0B',
                            background: isCommentResolved ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${isCommentResolved ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
                          }}>
                            🚩 TUGAS {isCommentResolved ? 'SELESAI' : `UNTUK @${assigneeName || 'Assignee'}`}
                          </span>
                        )}
                        <span style={{ fontSize: '9px', color: 'var(--text2)', fontFamily: 'monospace' }}>{new Date(c.created_at).toLocaleString('id-ID')}</span>
                      </div>
 
                      <div
                        style={{ fontSize: '12px', color: '#fff', margin: '4px 0', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
                        dangerouslySetInnerHTML={{ __html: c.content }}
                      />
 
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '10px', marginTop: '4px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px', fontFamily: 'monospace', alignItems: 'center' }}>
                        <button
                          onClick={() => handleToggleResolve(c.id, c.is_resolved === 1)}
                          style={{
                            background: isCommentTask ? 'var(--purple-600)' : 'transparent',
                            border: 'none',
                            color: isCommentTask ? '#fff' : (c.is_resolved === 1 ? 'var(--green)' : 'var(--text2)'),
                            padding: isCommentTask ? '3px 8px' : '0px',
                            borderRadius: isCommentTask ? '4px' : '0px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: isCommentTask ? 'bold' : 'normal'
                          }}
                        >
                          <Check size={10} /> {c.is_resolved === 1 ? 'Selesai (Resolved)' : (isCommentTask ? 'Tandai Selesai' : 'Resolve')}
                        </button>
                        <button
                          onClick={() => handleToggleMute(c.id, mutedThreadIds.includes(c.id))}
                          style={{ background: 'transparent', border: 'none', color: mutedThreadIds.includes(c.id) ? 'var(--purple-300)' : 'var(--text2)', cursor: 'pointer', padding: 0, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          {mutedThreadIds.includes(c.id) ? <BellOff size={10} /> : <Bell size={10} />}
                          {mutedThreadIds.includes(c.id) ? 'Muted' : 'Mute Thread'}
                        </button>
                        {(c.user_id === currentUser?.id || teamRole === 'owner') && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <Trash2 size={10} /> Hapus
                          </button>
                        )}
                      </div>

                      {/* Nested Replies */}
                      {replies.length > 0 && (
                        <div style={{ marginLeft: '12px', borderLeft: '1px dashed var(--border)', paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 10px 12px' }}>
                          {replies.map(r => (
                            <div key={r.id} style={{ background: '#05050c', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--purple-200)', fontWeight: 'bold', fontSize: '11px', fontFamily: 'monospace' }}>@{r.username}</span>
                                <span style={{ fontSize: '9px', color: 'var(--text2)', fontFamily: 'monospace' }}>{new Date(r.created_at).toLocaleString('id-ID')}</span>
                              </div>
                              <div
                                style={{ fontSize: '11px', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}
                                dangerouslySetInnerHTML={{ __html: r.content }}
                              />
                              {(r.user_id === currentUser?.id || teamRole === 'owner') && (
                                <button
                                  onClick={() => handleDeleteComment(r.id)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: '9px', marginTop: '6px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '2px' }}
                                >
                                  <Trash2 size={8} /> Hapus
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      <form
                        onSubmit={(e) => handleAddReply(e, c.id)}
                        style={{ display: 'flex', gap: '6px', marginLeft: '12px', marginTop: '6px' }}
                      >
                        <input
                          type="text"
                          value={replyInput[c.id] || ''}
                          onChange={ev => setReplyInput(prev => ({ ...prev, [c.id]: ev.target.value }))}
                          placeholder="Balas thread..."
                          style={{ flex: 1, background: '#05050c', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '11px', outline: 'none', fontFamily: 'monospace' }}
                          required
                        />
                        <button
                          type="submit"
                          style={{ background: 'var(--purple-600)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                          Reply <ChevronRight size={10} />
                        </button>
                      </form>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
