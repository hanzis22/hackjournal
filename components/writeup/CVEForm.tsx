'use client'
import dynamic from 'next/dynamic'
import TagInput from '../ui/TagInput'
import CVSSCalculator from './CVSSCalculator'

const RichEditor = dynamic(() => import('../ui/RichEditor'), { ssr: false })

interface CVEFormProps {
  form: {
    title: string
    tags: string
    cve_id: string
    cve_product: string
    cve_version: string
    cve_cwe: string
    cve_cvss_score: number
    cve_cvss_vector: string
    cve_cvss_severity: string
    content: string
    cve_impact: string
    cve_poc: string
    cve_remediation: string
  }
  onChange: (field: string, value: any) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => void
  uploadingState: Record<string, boolean>
  fetchCveDetails: () => void
  fetchingCve: boolean
  readOnly?: boolean
}

const POPULAR_CWES = [
  'CWE-22: Path Traversal',
  'CWE-78: OS Command Injection',
  'CWE-79: Cross-Site Scripting (XSS)',
  'CWE-89: SQL Injection (SQLi)',
  'CWE-94: Code Injection',
  'CWE-119: Buffer Overflow / Memory Corruption',
  'CWE-200: Sensitive Information Disclosure',
  'CWE-269: Privilege Escalation',
  'CWE-287: Improper Authentication',
  'CWE-352: Cross-Site Request Forgery (CSRF)',
  'CWE-434: Unrestricted File Upload',
  'CWE-502: Deserialization of Untrusted Data',
  'CWE-601: Open Redirect',
  'CWE-611: XML External Entity (XXE)',
  'CWE-862: Missing Authorization',
  'CWE-863: Incorrect Authorization',
  'CWE-918: Server-Side Request Forgery (SSRF)',
]

export default function CVEForm({
  form,
  onChange,
  onImageUpload,
  uploadingState,
  fetchCveDetails,
  fetchingCve,
  readOnly
}: CVEFormProps) {
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

  const handleCvssChange = (result: { score: number; severity: string; vector: string }) => {
    onChange('cve_cvss_score', result.score)
    onChange('cve_cvss_severity', result.severity)
    onChange('cve_cvss_vector', result.vector)
  }

  return (
    <>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Advisory / CVE Title *</label>
          <input style={inputStyle} value={form.title} required
            placeholder="e.g. SQL Injection in Admin Dashboard Login"
            onChange={e => onChange('title', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>CVE ID (Opsional / Reserved)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={inputStyle} value={form.cve_id}
              placeholder="e.g. CVE-2021-44228"
              onChange={e => onChange('cve_id', e.target.value)}
            />
            <button
              type="button"
              onClick={fetchCveDetails}
              disabled={fetchingCve}
              style={{
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--purple-900)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                opacity: fetchingCve ? 0.7 : 1
              }}
            >
              {fetchingCve ? 'Fetching...' : '⚡ Fetch Registry'}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Target Product / Software *</label>
          <input style={inputStyle} value={form.cve_product} required
            placeholder="e.g. Wordpress Plugin Contact Form 7"
            onChange={e => onChange('cve_product', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Affected Version(s) *</label>
          <input style={inputStyle} value={form.cve_version} required
            placeholder="e.g. <= 5.9.0 atau v2.1.3"
            onChange={e => onChange('cve_version', e.target.value)}
          />
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={labelStyle}>CWE / Vulnerability Type</label>
          <div style={{ position: 'relative' }}>
            <input style={inputStyle} value={form.cve_cwe} list="cwe-suggestions"
              placeholder="Pilih atau ketik CWE, misal CWE-79"
              onChange={e => onChange('cve_cwe', e.target.value)}
            />
            <datalist id="cwe-suggestions">
              {POPULAR_CWES.map(cwe => <option key={cwe} value={cwe} />)}
            </datalist>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Tags</label>
          <TagInput
            value={form.tags}
            onChange={val => onChange('tags', val)}
            placeholder="0day, RCE, Web, bypass..."
          />
        </div>
      </div>

      {/* CVSS Interactive Calculator */}
      <CVSSCalculator
        initialVector={form.cve_cvss_vector}
        onChange={handleCvssChange}
      />

      {/* Form Editors for CVE */}
      <div style={{ marginBottom: '18px' }}>
        <label style={labelStyle}>1. Vulnerability Description *</label>
        <RichEditor value={form.content} onChange={val => onChange('content', val)} readOnly={readOnly} />
        {renderUploadHelper('content')}
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={labelStyle}>2. Technical Impact Assessment</label>
        <RichEditor value={form.cve_impact} onChange={val => onChange('cve_impact', val)} readOnly={readOnly} />
        {renderUploadHelper('cve_impact')}
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={labelStyle}>3. Proof of Concept (PoC)</label>
        <RichEditor value={form.cve_poc} onChange={val => onChange('cve_poc', val)} readOnly={readOnly} />
        {renderUploadHelper('cve_poc')}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>4. Remediation & Mitigation Plan</label>
        <RichEditor value={form.cve_remediation} onChange={val => onChange('cve_remediation', val)} readOnly={readOnly} />
        {renderUploadHelper('cve_remediation')}
      </div>
    </>
  )
}
