'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'react-ok' // wait, useRouter should come from next/navigation
import { useRouter as useNextRouter } from 'next/navigation'
import { encryptPayload, bufToHex } from '@/lib/cryptoClient'
import HttpFormatter from './HttpFormatter'
import EncryptionGate from './EncryptionGate'
import JournalForm from '../writeup/JournalForm'
import CVEForm from '../writeup/CVEForm'
import AttackChainEditor from '../writeup/AttackChainEditor'
import TemplateSelector from './TemplateSelector'
import { WriteupTemplate } from '@/lib/templates'
import ScreenshotAnnotator from './ScreenshotAnnotator'
import MethodologyChecklist from './MethodologyChecklist'
import VersionHistoryModal from './VersionHistoryModal'
import PluginParsersModal from './PluginParsersModal'
import NetworkDiagramTool from './NetworkDiagramTool'
import AIAssistantModal from './AIAssistantModal'
import EncryptionToggle from '../writeup/EncryptionToggle'

interface Props {
  initial?: {
    id?: number
    title?: string
    platform?: string
    difficulty?: string
    tags?: string
    content?: string
    is_public?: boolean
    writeup_mode?: 'journal' | 'cve'
    cve_id?: string
    cve_product?: string
    cve_version?: string
    cve_cwe?: string
    cve_cvss_score?: number
    cve_cvss_vector?: string
    cve_cvss_severity?: string
    cve_impact?: string
    cve_poc?: string
    cve_remediation?: string
    is_encrypted?: number
    encryption_salt?: string
    encryption_iv?: string
    attack_chain?: string
    checklist_state?: string
    network_diagram?: string
  }
}

export default function WriteupForm({ initial }: Props) {
  const router = useNextRouter()
  const isEdit = !!initial?.id

  // Decryption states
  const [isDecrypting, setIsDecrypting] = useState(!!initial?.is_encrypted)

  // Encryption states for form
  const [isEncrypted, setIsEncrypted] = useState(!!initial?.is_encrypted)
  const [passphrase, setPassphrase] = useState('')

  // Mode state
  const [mode, setMode] = useState<'journal' | 'cve'>(initial?.writeup_mode || 'journal')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showAnnotator, setShowAnnotator] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showPlugins, setShowPlugins] = useState(false)
  const [showDiagram, setShowDiagram] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const handleSelectTemplate = (template: WriteupTemplate) => {
    setMode(template.writeup_mode)
    setForm(prev => ({
      ...prev,
      title: template.title_pattern || prev.title,
      tags: template.default_tags || prev.tags,
      content: template.content || prev.content,
      cve_product: template.cve_product || prev.cve_product,
      cve_version: template.cve_version || prev.cve_version,
      cve_cwe: template.cve_cwe || prev.cve_cwe,
      cve_cvss_vector: template.cve_cvss_vector || prev.cve_cvss_vector,
      cve_impact: template.cve_impact || prev.cve_impact,
      cve_poc: template.cve_poc || prev.cve_poc,
      cve_remediation: template.cve_remediation || prev.cve_remediation,
    }))
    setShowTemplateSelector(false)
  }

  const handleImportAIDraft = (draft: any) => {
    setForm(prev => {
      if (mode === 'cve') {
        return {
          ...prev,
          title: draft.title || prev.title,
          cve_cwe: draft.cwe || prev.cve_cwe,
          cve_cvss_score: draft.cvssScore || prev.cve_cvss_score,
          cve_cvss_vector: draft.cvssVector || prev.cve_cvss_vector,
          cve_cvss_severity: draft.cvssSeverity || prev.cve_cvss_severity,
          cve_impact: draft.impact || prev.cve_impact,
          cve_poc: draft.rawLogs || prev.cve_poc,
          cve_remediation: draft.remediation || prev.cve_remediation,
          content: draft.description || prev.content,
        }
      } else {
        const fullContent = `### Description\n${draft.description}\n\n### Impact\n${draft.impact}\n\n### Remediation\n${draft.remediation}\n\n### Proof of Concept Logs\n\`\`\`\n${draft.rawLogs}\n\`\`\``
        return {
          ...prev,
          title: draft.title || prev.title,
          tags: draft.cwe.toLowerCase().includes('sql') ? 'sqli, web, cwe-89' : 'info-disclosure, web',
          content: prev.content ? prev.content + '\n\n' + fullContent : fullContent
        }
      }
    })
    setShowAI(false)
  }

  // Form State
  const [folders, setFolders] = useState<any[]>([])
  const [form, setForm] = useState({
    title: initial?.title || '',
    platform: initial?.platform || '',
    difficulty: initial?.difficulty || 'Easy',
    tags: initial?.tags || '',
    content: initial?.content || '',
    is_public: !!initial?.is_public,
    cve_id: initial?.cve_id || '',
    cve_product: initial?.cve_product || '',
    cve_version: initial?.cve_version || '',
    cve_cwe: initial?.cve_cwe || '',
    cve_cvss_score: initial?.cve_cvss_score || 0,
    cve_cvss_vector: initial?.cve_cvss_vector || '',
    cve_cvss_severity: initial?.cve_cvss_severity || 'None',
    cve_impact: initial?.cve_impact || '',
    cve_poc: initial?.cve_poc || '',
    cve_remediation: initial?.cve_remediation || '',
    folder_id: initial?.folder_id || '',
    is_starred: initial?.is_starred === 1,
    network_diagram: initial?.network_diagram || '',
  })

  useEffect(() => {
    fetch('/api/folders')
      .then(res => res.json())
      .then(data => setFolders(data.folders || []))
  }, [])

  // Attack Chain states
  const [attackChain, setAttackChain] = useState<any[]>(() => {
    if (initial?.attack_chain && initial.is_encrypted !== 1) {
      try {
        return JSON.parse(initial.attack_chain)
      } catch {
        return []
      }
    }
    return []
  })

  // Methodology Checklist state
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    if (initial?.checklist_state && initial.is_encrypted !== 1) {
      try {
        return JSON.parse(initial.checklist_state)
      } catch {
        return {}
      }
    }
    return {}
  })

  // Draft states
  const [hasDraft, setHasDraft] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)

  // CVE fetch state
  const [fetchingCve, setFetchingCve] = useState(false)

  // Uploading states
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({})

  // General message states
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Check drafts on mount (only for new writeups)
  useEffect(() => {
    if (!isEdit) {
      const draft = localStorage.getItem('hj_writeup_draft')
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
          setDraftData(parsed)
          setHasDraft(true)
        } catch {
          localStorage.removeItem('hj_writeup_draft')
        }
      }
    }
  }, [isEdit])

  // Auto-save draft
  useEffect(() => {
    if (!isEdit && !success) {
      const timer = setTimeout(() => {
        const payload = {
          ...form,
          mode,
          attackChain,
          checklistState,
          network_diagram: form.network_diagram,
          updatedAt: Date.now()
        }
        localStorage.setItem('hj_writeup_draft', JSON.stringify(payload))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [form, mode, attackChain, checklistState, isEdit, success])

  const handleDecrypted = (decrypted: any) => {
    setForm({
      title: decrypted.title || '',
      platform: decrypted.platform || '',
      difficulty: decrypted.difficulty || 'Easy',
      tags: decrypted.tags || '',
      content: decrypted.content || '',
      is_public: !!initial?.is_public,
      cve_id: decrypted.cve_id || '',
      cve_product: decrypted.cve_product || '',
      cve_version: decrypted.cve_version || '',
      cve_cwe: decrypted.cve_cwe || '',
      cve_cvss_score: decrypted.cve_cvss_score || 0,
      cve_cvss_vector: decrypted.cve_cvss_vector || '',
      cve_cvss_severity: decrypted.cve_cvss_severity || 'None',
      cve_impact: decrypted.cve_impact || '',
      cve_poc: decrypted.cve_poc || '',
      cve_remediation: decrypted.cve_remediation || '',
      folder_id: initial?.folder_id || '',
      is_starred: initial?.is_starred === 1,
      network_diagram: decrypted.network_diagram || '',
    })
    if (decrypted.writeup_mode) setMode(decrypted.writeup_mode)
    if (decrypted.attack_chain) {
      try {
        setAttackChain(typeof decrypted.attack_chain === 'string' ? JSON.parse(decrypted.attack_chain) : decrypted.attack_chain)
      } catch {
        setAttackChain([])
      }
    }
    if (decrypted.checklist_state) {
      try {
        setChecklistState(typeof decrypted.checklist_state === 'string' ? JSON.parse(decrypted.checklist_state) : decrypted.checklist_state)
      } catch {
        setChecklistState({})
      }
    }
    const savedKey = sessionStorage.getItem('hj_encryption_key') || ''
    setIsEncrypted(true)
    setPassphrase(savedKey)
    setIsDecrypting(false)
  }

  const handleFormFieldChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingState(prev => ({ ...prev, [fieldKey]: true }))
    setError('')

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah gambar')

      // Insert image markdown into the respective editor
      const markdownImage = `![${file.name}](${data.url})`
      const currentVal = (form as any)[fieldKey] || ''
      handleFormFieldChange(fieldKey, currentVal + `<p>${markdownImage}</p>`)
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah gambar')
    } finally {
      setUploadingState(prev => ({ ...prev, [fieldKey]: false }))
    }
  }

  // CVE fetch handler
  async function fetchCveDetails() {
    if (!form.cve_id.trim()) {
      setError('Masukkan CVE ID terlebih dahulu (contoh: CVE-2021-44228)')
      return
    }
    setFetchingCve(true)
    setError('')
    try {
      const res = await fetch(`/api/cve/${form.cve_id.trim()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari Mitre Registry')
      }

      setForm(prev => ({
        ...prev,
        title: prev.title || data.title || '',
        cve_product: prev.cve_product || data.product || '',
        cve_version: prev.cve_version || data.version || '',
        cve_cwe: prev.cve_cwe || data.cwe || '',
        content: prev.content || data.description || '',
      }))
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data CVE')
    } finally {
      setFetchingCve(false)
    }
  }

  // Draft operations
  const applyDraft = () => {
    if (!draftData) return
    setForm({
      title: draftData.title || '',
      platform: draftData.platform || '',
      difficulty: draftData.difficulty || 'Easy',
      tags: draftData.tags || '',
      content: draftData.content || '',
      is_public: !!draftData.is_public,
      cve_id: draftData.cve_id || '',
      cve_product: draftData.cve_product || '',
      cve_version: draftData.cve_version || '',
      cve_cwe: draftData.cve_cwe || '',
      cve_cvss_score: draftData.cve_cvss_score || 0,
      cve_cvss_vector: draftData.cve_cvss_vector || '',
      cve_cvss_severity: draftData.cve_cvss_severity || 'None',
      cve_impact: draftData.cve_impact || '',
      cve_poc: draftData.cve_poc || '',
      cve_remediation: draftData.cve_remediation || '',
      network_diagram: draftData.network_diagram || '',
    })
    if (draftData.mode) setMode(draftData.mode)
    if (draftData.attackChain) setAttackChain(draftData.attackChain)
    if (draftData.checklistState) setChecklistState(draftData.checklistState)
    discardDraft()
  }

  const discardDraft = () => {
    localStorage.removeItem('hj_writeup_draft')
    setHasDraft(false)
    setDraftData(null)
  }

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let submitTitle = form.title
      let isEnc = 0
      let encSalt = ''
      let encIv = ''

      // Prepare payload content
      const payload: any = {
        platform: mode === 'journal' ? form.platform : '',
        difficulty: mode === 'journal' ? form.difficulty : 'Easy',
        tags: form.tags,
        content: form.content,
        writeup_mode: mode,
        attack_chain: JSON.stringify(attackChain),
        checklist_state: JSON.stringify(checklistState),
        network_diagram: form.network_diagram,
      }

      if (mode === 'cve') {
        payload.cve_id = form.cve_id
        payload.cve_product = form.cve_product
        payload.cve_version = form.cve_version
        payload.cve_cwe = form.cve_cwe
        payload.cve_cvss_score = form.cve_cvss_score
        payload.cve_cvss_vector = form.cve_cvss_vector
        payload.cve_cvss_severity = form.cve_cvss_severity
        payload.cve_impact = form.cve_impact
        payload.cve_poc = form.cve_poc
        payload.cve_remediation = form.cve_remediation
      }

      let submitContent = JSON.stringify(payload)

      // Encrypt client-side if enabled
      if (isEncrypted) {
        if (!passphrase.trim()) {
          throw new Error('Passphrase enkripsi wajib diisi jika enkripsi diaktifkan')
        }
        isEnc = 1
        const saltBytes = window.crypto.getRandomValues(new Uint8Array(16))
        encSalt = bufToHex(saltBytes)

        const ivTitleBytes = window.crypto.getRandomValues(new Uint8Array(12))
        const ivContentBytes = window.crypto.getRandomValues(new Uint8Array(12))
        const ivTitleHex = bufToHex(ivTitleBytes)
        const ivContentHex = bufToHex(ivContentBytes)

        encIv = `${ivTitleHex}:${ivContentHex}`

        // Encrypt fields
        submitTitle = await encryptPayload(passphrase, form.title, encSalt, ivTitleHex)
        submitContent = await encryptPayload(passphrase, submitContent, encSalt, ivContentHex)

        // Store key locally for user convenience during active session
        sessionStorage.setItem('hj_encryption_key', passphrase)
      } else {
        sessionStorage.removeItem('hj_encryption_key')
      }

      const bodyData = {
        title: submitTitle,
        content: submitContent,
        difficulty: mode === 'journal' ? form.difficulty : 'Easy',
        platform: mode === 'journal' ? form.platform : 'Mode CVE',
        tags: form.tags,
        is_public: form.is_public ? 1 : 0,
        writeup_mode: mode,
        is_encrypted: isEnc,
        encryption_salt: encSalt,
        encryption_iv: encIv,
        folder_id: form.folder_id ? Number(form.folder_id) : null,
        is_starred: form.is_starred ? 1 : 0,
        network_diagram: form.network_diagram
      }

      const url = isEdit ? `/api/writeups/${initial?.id}` : '/api/writeups'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan writeup')

      // Discard draft on successful save
      localStorage.removeItem('hj_writeup_draft')

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        router.push(`/dashboard/${isEdit ? initial?.id : data.id}`)
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Server error')
    } finally {
      setSaving(false)
    }
  }

  if (isDecrypting && initial) {
    return (
      <EncryptionGate
        initialWriteup={initial}
        onDecrypted={handleDecrypted}
        onBack={() => router.back()}
        backLabel="Kembali"
      />
    )
  }

  const labelStyle = { display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Controls: Mode Switcher & Templates */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', background: 'var(--bg2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '280px' }}>
          <button
            type="button"
            onClick={() => setMode('journal')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'journal' ? 'var(--purple-600)' : 'transparent',
              color: mode === 'journal' ? '#fff' : 'var(--text2)',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📓 MODE JURNAL (STANDAR LAB/CTF)
          </button>
          <button
            type="button"
            onClick={() => setMode('cve')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'cve' ? 'var(--purple-600)' : 'transparent',
              color: mode === 'cve' ? '#fff' : 'var(--text2)',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🛡️ MODE CVE (SECURITY ADVISORY PROFESSIONAL)
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplateSelector(true)}
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            border: '1px solid var(--purple-500)',
            background: 'rgba(127,119,221,0.08)',
            color: 'var(--purple-200)',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📑 Pilih Template
        </button>
      </div>

      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {showVersions && isEdit && initial?.id && (
        <VersionHistoryModal 
          writeupId={initial.id}
          onClose={() => setShowVersions(false)}
          onRestore={(snapshot) => {
            handleDecrypted(snapshot)
            setShowVersions(false)
            alert('Revisi dimuat. Silakan simpan (Save) untuk mempermanenkan.')
          }}
        />
      )}

      {showPlugins && (
        <PluginParsersModal
          onClose={() => setShowPlugins(false)}
          onImport={(parsed) => {
            if (parsed.title) handleFormFieldChange('title', parsed.title)
            if (parsed.tags) handleFormFieldChange('tags', parsed.tags)
            if (parsed.difficulty) handleFormFieldChange('difficulty', parsed.difficulty)
            if (parsed.content) {
              const currentContent = (form as any).content || ''
              handleFormFieldChange('content', currentContent + (currentContent ? '\n\n' : '') + parsed.content)
            }
            setShowPlugins(false)
          }}
        />
      )}

      {showAI && (
        <AIAssistantModal
          onClose={() => setShowAI(false)}
          onImport={handleImportAIDraft}
        />
      )}

      {showAnnotator && (
        <ScreenshotAnnotator
          onSave={async (dataUrl) => {
            setShowAnnotator(false)
            setUploadingState(prev => ({ ...prev, content: true }))
            
            try {
              // Convert dataURL to Blob directly without using fetch()
              const parts = dataUrl.split(',')
              const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
              const bstr = atob(parts[1])
              let n = bstr.length
              const u8arr = new Uint8Array(n)
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
              }
              const blob = new Blob([u8arr], { type: mime })
              const file = new File([blob], 'annotation.png', { type: 'image/png' })
              const formData = new FormData()
              formData.append('image', file)
              
              const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
              const data = await uploadRes.json()
              if (!uploadRes.ok) throw new Error(data.error)
              
              const markdownImage = `![Screenshot Annotation](${data.url})`
              const currentVal = (form as any).content || ''
              handleFormFieldChange('content', currentVal + `\n\n${markdownImage}\n`)
            } catch (err: any) {
              setError('Failed to save annotation: ' + err.message)
            } finally {
              setUploadingState(prev => ({ ...prev, content: false }))
            }
          }}
          onCancel={() => setShowAnnotator(false)}
        />
      )}

      {/* HTTP requests utility tool */}
      <HttpFormatter />

      {/* Methodology Checklist */}
      <MethodologyChecklist initialState={checklistState} onChange={setChecklistState} />

      {/* Network Diagram */}
      <div style={{ marginBottom: '20px' }}>
        <div 
          onClick={() => setShowDiagram(!showDiagram)}
          style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: showDiagram ? '8px 8px 0 0' : '8px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🗺️</span>
            <span style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>Network/Attack Path Diagram</span>
          </div>
          <span style={{ color: 'var(--text2)' }}>{showDiagram ? '▲' : '▼'}</span>
        </div>
        {showDiagram && (
          <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
            <NetworkDiagramTool initialData={form.network_diagram} onChange={val => handleFormFieldChange('network_diagram', val)} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '12px' }}>
        {isEdit && (
          <button
            type="button"
            onClick={() => setShowVersions(true)}
            style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
          >
            🕒 Version History
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPlugins(true)}
          style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--purple-600)', color: 'var(--purple-300)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          🧩 Run Plugin / Import Tool Data
        </button>
        <button
          type="button"
          onClick={() => setShowAnnotator(true)}
          style={{ padding: '8px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--purple-300)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          🖼️ Open Screenshot Annotator
        </button>
        <button
          type="button"
          onClick={() => setShowAI(true)}
          style={{ padding: '8px 14px', background: 'var(--bg2)', border: '1px solid #7F77DD', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          🤖 AI Assistant
        </button>
      </div>

      {hasDraft && (
        <div style={{ background:'rgba(127,119,221,0.12)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap: '12px' }}>
          <div style={{ color:'var(--purple-200)', fontSize:'13px', fontFamily:'monospace' }}>
            📝 Draf penulisan sebelumnya ditemukan ({draftData?.title || 'Tanpa Judul'}).
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button type="button" onClick={applyDraft}
              style={{ padding:'6px 12px', borderRadius:'6px', border:'none', background:'var(--purple-600)', color:'#fff', cursor:'pointer', fontFamily:'monospace', fontSize:'12px' }}>
              Gunakan
            </button>
            <button type="button" onClick={discardDraft}
              style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid rgba(255,69,96,0.4)', background:'transparent', color:'var(--red)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px' }}>
              Hapus
            </button>
          </div>
        </div>
      )}

      {/* RENDER FORM FIELDS */}
      {mode === 'journal' ? (
        <JournalForm
          form={form}
          onChange={handleFormFieldChange}
          onImageUpload={handleImageUpload}
          uploadingState={uploadingState}
        />
      ) : (
        <CVEForm
          form={form}
          onChange={handleFormFieldChange}
          onImageUpload={handleImageUpload}
          uploadingState={uploadingState}
          fetchCveDetails={fetchCveDetails}
          fetchingCve={fetchingCve}
        />
      )}

      {/* Attack Chain Vector */}
      <AttackChainEditor
        attackChain={attackChain}
        onChange={setAttackChain}
      />

      {/* Zero-Knowledge Encryption */}
      <EncryptionToggle
        isEncrypted={isEncrypted}
        setIsEncrypted={setIsEncrypted}
        passphrase={passphrase}
        setPassphrase={setPassphrase}
      />

      {/* Metadata settings: Folder, Star, Public */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
        {/* Folder Select */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ ...labelStyle, marginBottom: '6px' }}>📁 Pindahkan ke Folder</label>
          <div style={{ position: 'relative' }}>
            <select
              value={form.folder_id}
              onChange={e => handleFormFieldChange('folder_id', e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace', outline: 'none', appearance: 'none' }}
            >
              <option value="">-- Tanpa Folder (Unorganized) --</option>
              {folders.map(fold => (
                <option key={fold.id} value={fold.id}>
                  {fold.icon} {fold.name}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text2)', fontSize: '10px' }}>
              ▼
            </div>
          </div>
        </div>

        {/* Star & Public Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="is_starred"
              checked={form.is_starred}
              onChange={e => handleFormFieldChange('is_starred', e.target.checked)}
              style={{ accentColor: 'var(--purple-400)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_starred" style={{ color: 'var(--text2)', fontSize: '13px', fontFamily: 'monospace', cursor: 'pointer' }}>
              ⭐ Tandai Bintang (Prioritas/Favorit)
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="is_public"
              checked={form.is_public}
              onChange={e => handleFormFieldChange('is_public', e.target.checked)}
              style={{ accentColor: 'var(--purple-400)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_public" style={{ color: 'var(--text2)', fontSize: '13px', fontFamily: 'monospace', cursor: 'pointer' }}>
              🔗 Jadikan writeup ini publik (Shareable)
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background:'rgba(255,69,96,0.1)', border:'1px solid rgba(255,69,96,0.3)', borderRadius:'6px', padding:'10px 14px', color:'var(--red)', fontSize:'13px', marginBottom:'16px', fontFamily:'monospace' }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{ background:'rgba(57,255,20,0.08)', border:'1px solid rgba(57,255,20,0.3)', borderRadius:'6px', padding:'10px 14px', color:'var(--green)', fontSize:'13px', marginBottom:'16px', fontFamily:'monospace' }}>
          ✓ Tersimpan! Mengalihkan...
        </div>
      )}

      <div style={{ display:'flex', gap:'10px' }}>
        <button type="button" onClick={() => router.back()}
          style={{ padding:'10px 20px', borderRadius:'6px', border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ padding:'10px 28px', borderRadius:'6px', border:'none', background:'var(--purple-600)', color:'#fff', cursor:'pointer', fontFamily:'monospace', fontSize:'13px', opacity: saving ? 0.7 : 1 }}>
          {saving ? '// Saving...' : isEdit ? '// Update Writeup' : '// Save Writeup'}
        </button>
      </div>
    </form>
  )
}
