'use client'
import { useState, useEffect, use } from 'react'
import { showToast } from '@/components/ui/Toast'

interface CommandLog {
  id: number
  command: string
  tool_name: string
  created_at: string
  username: string
}

interface AttackNode {
  id: string
  label: string
  type: 'External' | 'Subdomain' | 'Foothold' | 'Internal' | 'Domain Admin'
  status: 'secure' | 'scanned' | 'compromised'
  notes?: string
  locked_by?: number | string | null
  locked_by_name?: string | null
}

export default function WarRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const engagementId = Number(resolvedParams.id)

  const [commands, setCommands] = useState<CommandLog[]>([])
  const [nodes, setNodes] = useState<AttackNode[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Input states
  const [newCommand, setNewCommand] = useState('')
  const [newTool, setNewTool] = useState('nmap')

  // Node editing state
  const [editingNode, setEditingNode] = useState<AttackNode | null>(null)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeType, setNewNodeType] = useState<'External' | 'Subdomain' | 'Foothold' | 'Internal' | 'Domain Admin'>('Subdomain')
  const [newNodeStatus, setNewNodeStatus] = useState<'secure' | 'scanned' | 'compromised'>('scanned')
  const [newNodeNotes, setNewNodeNotes] = useState('')

  const [isAccessRevoked, setIsAccessRevoked] = useState(false)

  // Deterministic user color helper
  const getUserColor = (username: string) => {
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      '#FF4560', // Neon Red
      '#39FF14', // Neon Green
      '#F0A500', // Gold/Yellow
      '#7F77DD', // Soft Purple
      '#00E5FF', // Neon Cyan
      '#FF00FF', // Neon Magenta
      '#FF8000', // Vibrant Orange
      '#ADFF2F', // GreenYellow
    ]
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Fetch current user details
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (isAccessRevoked) return

    fetchData(true)
    const interval = setInterval(() => {
      fetchData(false)
    }, 5000) // Poll every 5s (fallback)

    // Real-time kill switch listener & War Room subscriber
    const eventSource = new EventSource(`/api/realtime/events?engagement_id=${engagementId}`)
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'force_disconnect') {
          setIsAccessRevoked(true)
        } else if (data.type === 'map_updated') {
          if (data.attack_map_data) {
            const parsed = typeof data.attack_map_data === 'string'
              ? JSON.parse(data.attack_map_data)
              : data.attack_map_data
            setNodes(parsed.nodes || [])
          }
        } else if (data.type === 'command_logged') {
          if (data.command) {
            setCommands(prev => {
              if (prev.some(c => c.id === data.command.id)) return prev
              return [data.command, ...prev]
            })
          }
        }
      } catch (err) {
        console.error('SSE parser error:', err)
      }
    }

    return () => {
      clearInterval(interval)
      eventSource.close()
    }
  }, [engagementId, isAccessRevoked])

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch(`/api/engagements/${engagementId}/war-room?t=${Date.now()}`)
      if (res.status === 403 || res.status === 404) {
        setIsAccessRevoked(true)
        return
      }
      const data = await res.json()
      if (res.ok) {
        setCommands(data.commands || [])
        if (data.attack_map_data) {
          const parsed = typeof data.attack_map_data === 'string'
            ? JSON.parse(data.attack_map_data)
            : data.attack_map_data
          setNodes(parsed.nodes || [])
        } else {
          // Default baseline nodes
          setNodes([
            { id: '1', label: 'External Scope', type: 'External', status: 'scanned', notes: 'Initial target scope defined.' },
            { id: '2', label: 'Primary Subdomain', type: 'Subdomain', status: 'secure' },
            { id: '3', label: 'Web Application Server', type: 'Foothold', status: 'secure' },
            { id: '4', label: 'Active Directory DC', type: 'Domain Admin', status: 'secure' }
          ])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleLogCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommand.trim()) return

    try {
      const res = await fetch(`/api/engagements/${engagementId}/war-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_command',
          command: newCommand.trim(),
          tool_name: newTool
        })
      })

      if (res.ok) {
        const data = await res.json()
        setNewCommand('')
        if (data.command) {
          setCommands(prev => {
            if (prev.some(c => c.id === data.command.id)) return prev
            return [data.command, ...prev]
          })
        } else {
          fetchData()
        }
        showToast('Perintah berhasil dicatat di War-Room!', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal menyimpan perintah', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Koneksi bermasalah', 'error')
    }
  }

  const handleSaveMap = async (updatedNodes: AttackNode[]) => {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/war-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_map',
          attack_map_data: { nodes: updatedNodes }
        })
      })

      if (res.ok) {
        showToast('Attack Map berhasil diperbarui!', 'success')
        fetchData()
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal menyimpan peta serangan', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Koneksi bermasalah', 'error')
    }
  }

  const handleAddNode = () => {
    const newNode: AttackNode = {
      id: Date.now().toString(),
      label: 'New Target Node',
      type: 'Subdomain',
      status: 'secure',
      notes: ''
    }
    const updated = [...nodes, newNode]
    setNodes(updated)
    handleSaveMap(updated)
  }

  const handleRemoveNode = (id: string) => {
    const updated = nodes.filter(n => n.id !== id)
    setNodes(updated)
    handleSaveMap(updated)
  }

  const handleSaveNodeEdits = async () => {
    if (!editingNode) return
    const updated = nodes.map(n => {
      if (n.id === editingNode.id) {
        return {
          ...n,
          label: newNodeLabel,
          type: newNodeType,
          status: newNodeStatus,
          notes: newNodeNotes,
          locked_by: null,
          locked_by_name: null
        }
      }
      return n
    })
    setNodes(updated)
    setEditingNode(null)
    handleSaveMap(updated)
  }

  const startEditNode = async (node: AttackNode) => {
    if (!currentUser) return

    // If node is already locked by someone else, block editing
    if (node.locked_by && node.locked_by !== currentUser.id) {
      showToast(`Node sedang diedit oleh @${node.locked_by_name}`, 'error')
      return
    }

    try {
      const res = await fetch(`/api/engagements/${engagementId}/war-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock_node', nodeId: node.id })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.attack_map_data) {
          setNodes(data.attack_map_data.nodes || [])
        }
        setEditingNode(node)
        setNewNodeLabel(node.label)
        setNewNodeType(node.type)
        setNewNodeStatus(node.status)
        setNewNodeNotes(node.notes || '')
      } else {
        const data = await res.json()
        showToast(data.error || 'Gagal mengunci node', 'error')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const cancelEditNode = async () => {
    if (!editingNode) return
    const nodeId = editingNode.id
    setEditingNode(null)

    try {
      const res = await fetch(`/api/engagements/${engagementId}/war-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock_node', nodeId })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.attack_map_data) {
          setNodes(data.attack_map_data.nodes || [])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendToWriteup = async (cmd: CommandLog) => {
    const formattedLog = `<p><strong>@${cmd.username}</strong> executed <strong>${cmd.tool_name}</strong>:</p><pre style="background:#070710;padding:10px;border-radius:4px;color:#39FF14;border:1px solid rgba(57,255,20,0.2);"><code>$ ${cmd.command}</code></pre>`
    try {
      const res = await fetch(`/api/engagements/${engagementId}/writeups/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formattedLog })
      })
      if (res.ok) {
        showToast('Command appended to active draft', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to append command', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Koneksi bermasalah', 'error')
    }
  }

  if (isAccessRevoked) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(7, 7, 16, 0.98)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FF4560',
        fontFamily: 'monospace',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          border: '2px solid #FF4560',
          borderRadius: '8px',
          padding: '40px',
          background: 'rgba(255, 69, 96, 0.05)',
          maxWidth: '500px',
          boxShadow: '0 0 30px rgba(255, 69, 96, 0.2)'
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px', margin: 0, fontWeight: 'bold' }}>🚫 ACCESS REVOKED</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.6', margin: '16px 0 24px 0' }}>
            Sesi kolaborasi Anda telah dihentikan oleh administrator atau Anda telah dikeluarkan dari tim pemilik dokumen ini.
          </p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: '#FF4560',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(255, 69, 96, 0.4)'
            }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', fontFamily: 'monospace' }}>
        Loading Ops Command Center...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: 'monospace', color: '#fff' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#FF4560', textShadow: '0 0 10px rgba(255, 69, 96, 0.3)' }}>
            ⚡ LIVE WAR-ROOM
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
            Real-time Tactical Command Center & Target Map
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Left: Interactive Attack Map */}
        <div style={{ flex: '2 1 700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#090915', border: '1px solid #FF4560', borderRadius: '8px', padding: '20px', position: 'relative', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#FF4560' }}>
                🗺️ ATTACK PATH MAP
              </span>
              <button
                onClick={handleAddNode}
                style={{
                  background: 'rgba(255, 69, 96, 0.1)',
                  border: '1px solid #FF4560',
                  color: '#FF4560',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                + Add Node
              </button>
            </div>

            {/* Visual Node Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '10px' }}>
              {nodes.map((node) => {
                const isLockedByMe = currentUser && node.locked_by === currentUser.id
                const isLockedByOther = currentUser && node.locked_by && node.locked_by !== currentUser.id

                const glowColor = isLockedByOther
                  ? '#FF3B30' // Red for locked by others
                  : isLockedByMe
                  ? '#007AFF' // Blue for locked by me
                  : node.status === 'compromised'
                  ? '#FF4560'
                  : node.status === 'scanned'
                  ? '#F0A500'
                  : '#39FF14'
                
                return (
                  <div
                    key={node.id}
                    onClick={() => startEditNode(node)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: `1.5px solid ${glowColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                      boxShadow: `0 0 8px ${glowColor}25`,
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text2)', marginBottom: '8px' }}>
                      <span>{node.type.toUpperCase()}</span>
                      <span style={{ color: glowColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isLockedByOther && <span>🔒 LOCKED BY @{node.locked_by_name}</span>}
                        {isLockedByMe && <span>✏️ EDITING</span>}
                        {!node.locked_by && node.status.toUpperCase()}
                      </span>
                    </div>

                    <strong style={{ display: 'block', fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                      {node.label}
                    </strong>

                    {node.notes && (
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text2)', lineBreak: 'anywhere' }}>
                        {node.notes}
                      </p>
                    )}

                    {!isLockedByOther && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveNode(node.id)
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Hapus Node"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Editing Node Sidebar Modal Panel */}
            {editingNode && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '320px',
                background: '#0e0e1e',
                borderLeft: '1px solid var(--border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#FF4560' }}>✏️ EDIT NODE</span>
                  <button onClick={cancelEditNode} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text2)', marginBottom: '4px' }}>NODE LABEL</label>
                  <input
                    type="text"
                    value={newNodeLabel}
                    onChange={e => setNewNodeLabel(e.target.value)}
                    style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text2)', marginBottom: '4px' }}>TYPE</label>
                  <select
                    value={newNodeType}
                    onChange={e => setNewNodeType(e.target.value as any)}
                    style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="External">External</option>
                    <option value="Subdomain">Subdomain</option>
                    <option value="Foothold">Foothold</option>
                    <option value="Internal">Internal</option>
                    <option value="Domain Admin">Domain Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text2)', marginBottom: '4px' }}>STATUS</label>
                  <select
                    value={newNodeStatus}
                    onChange={e => setNewNodeStatus(e.target.value as any)}
                    style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="secure">Secure (Green)</option>
                    <option value="scanned">Scanned (Yellow)</option>
                    <option value="compromised">Compromised (Red)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text2)', marginBottom: '4px' }}>NOTES</label>
                  <textarea
                    value={newNodeNotes}
                    onChange={e => setNewNodeNotes(e.target.value)}
                    style={{ width: '100%', height: '80px', background: '#070710', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '12px', resize: 'none' }}
                  />
                </div>

                <button
                  onClick={handleSaveNodeEdits}
                  style={{
                    background: '#FF4560',
                    border: 'none',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Terminal Logs */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#070710', border: '1px solid #39FF14', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#39FF14', display: 'block', marginBottom: '16px' }}>
              📟 COPS TERMINAL COMMAND LOG
            </span>

            {/* Input Log Command Form */}
            <form onSubmit={handleLogCommand} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(57, 255, 20, 0.2)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newTool}
                  onChange={e => setNewTool(e.target.value)}
                  style={{ background: '#000', border: '1px solid #39FF14', color: '#39FF14', padding: '8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                >
                  <option value="nmap">Nmap</option>
                  <option value="gobuster">Gobuster</option>
                  <option value="sqlmap">Sqlmap</option>
                  <option value="bloodhound">Bloodhound</option>
                  <option value="metasploit">Metasploit</option>
                  <option value="custom">Custom</option>
                </select>

                <input
                  type="text"
                  placeholder="Ketik command yang Anda gunakan..."
                  value={newCommand}
                  onChange={e => setNewCommand(e.target.value)}
                  style={{ flex: 1, background: '#000', border: '1px solid #39FF14', borderRadius: '4px', padding: '8px 12px', color: '#39FF14', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: 'rgba(57, 255, 20, 0.1)',
                  border: '1px solid #39FF14',
                  color: '#39FF14',
                  padding: '8px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Log Command
              </button>
            </form>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: '#000',
              border: '1px solid rgba(57, 255, 20, 0.15)',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '340px'
            }}>
              {commands.length === 0 ? (
                <div style={{ color: 'rgba(57, 255, 20, 0.4)', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
                  No operations command logged.
                </div>
              ) : (
                commands.map((c) => (
                  <div key={c.id} style={{ fontSize: '12px', borderBottom: '1px dashed rgba(57, 255, 20, 0.08)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '10px', marginBottom: '2px' }}>
                        <span style={{ color: getUserColor(c.username), fontWeight: 'bold' }}>👤 @{c.username} ({c.tool_name})</span>
                        <span>{new Date(c.created_at).toLocaleTimeString()}</span>
                      </div>
                      <code style={{ color: '#39FF14', wordBreak: 'break-all' }}>
                        $ {c.command}
                      </code>
                    </div>
                    <button
                      onClick={() => handleSendToWriteup(c)}
                      style={{
                        background: 'rgba(57, 255, 20, 0.1)',
                        border: '1px solid rgba(57, 255, 20, 0.3)',
                        color: '#39FF14',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        transition: 'all 0.1s'
                      }}
                      title="Send to Writeup"
                    >
                      📝 Send
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
