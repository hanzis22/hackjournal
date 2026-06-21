'use client'
import dynamic from 'next/dynamic'
import TagInput from '../ui/TagInput'

const RichEditor = dynamic(() => import('../ui/RichEditor'), { ssr: false })

interface JournalFormProps {
  form: {
    title: string
    platform: string
    difficulty: string
    tags: string
    content: string
  }
  onChange: (field: string, value: any) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => void
  uploadingState: Record<string, boolean>
  readOnly?: boolean
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Insane']

export default function JournalForm({
  form,
  onChange,
  onImageUpload,
  uploadingState,
  readOnly
}: JournalFormProps) {
  const labelStyle = { display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
  const inputStyle = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }

  const renderUploadHelper = (fieldKey: string) => {
    const isUploading = uploadingState[fieldKey]
    return (
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'var(--text)',
            cursor: 'pointer',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          📷 Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={e => onImageUpload(e, fieldKey)}
            style={{ display: 'none' }}
          />
        </label>
        {isUploading && (
          <span style={{ color: 'var(--purple-300)', fontSize: '11px', fontFamily: 'monospace' }}>
            // Sedang mengunggah gambar ke server...
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={form.title} required
            placeholder="e.g. Blue Team Lab — Splunk"
            onChange={e => onChange('title', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Platform / Category</label>
          <input style={inputStyle} value={form.platform}
            placeholder="TryHackMe, HackTheBox, Custom..."
            onChange={onChange ? e => onChange('platform', e.target.value) : undefined}
          />
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Difficulty</label>
          <div style={{ position: 'relative' }}>
            <select style={{...inputStyle, appearance: 'none' as const, paddingRight: '30px'}} value={form.difficulty}
              onChange={e => onChange('difficulty', e.target.value)}
            >
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text2)', fontSize: '10px' }}>
              ▼
            </div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Tags</label>
          <TagInput
            value={form.tags}
            onChange={val => onChange('tags', val)}
            placeholder="OSINT, SQLi, Privilege Escalation, Web..."
          />
        </div>
      </div>

      {/* Editor */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Writeup Content</label>
        <RichEditor value={form.content} onChange={val => onChange('content', val)} readOnly={readOnly} />
        {renderUploadHelper('content')}
      </div>
    </>
  )
}
