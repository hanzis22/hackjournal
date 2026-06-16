'use client'
import { useState } from 'react'
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

interface Props {
  writeup: any
}

export default function DetailWrapper({ writeup: initialWriteup }: Props) {
  const router = useRouter()
  const [writeup, setWriteup] = useState(initialWriteup)
  const [isDecrypting, setIsDecrypting] = useState(initialWriteup.is_encrypted === 1)
  const [showCompliance, setShowCompliance] = useState(false)

  const handleDecrypted = (decrypted: any) => {
    setWriteup(decrypted)
    setIsDecrypting(false)
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

  return (
    <div className="detail-page-wrapper" style={{ padding:'32px 40px', maxWidth:'900px' }}>
      <CopyCodeHandler contentId={writeup.id} />
      
      {/* Header */}
      <div className="detail-page-header" style={{ marginBottom:'24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {isCve && writeup.cve_id && (
              <span style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                background: 'rgba(127,119,221,0.15)',
                color: 'var(--purple-200)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(127,119,221,0.3)',
                display: 'inline-block',
                marginBottom: '8px',
                letterSpacing: '1px'
              }}>
                🚨 SECURITY ADVISORY &bull; {writeup.cve_id}
              </span>
            )}
            <h1 style={{ fontFamily:'monospace', fontSize:'22px', color:'var(--text)', marginBottom:'14px', lineHeight:1.3 }}>
              {writeup.title}
            </h1>
          </div>

          {/* Quick Score Badge for CVE */}
          {isCve && writeup.cve_cvss_score !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--bg2)',
              border: `1px solid ${sevColor[writeup.cve_cvss_severity] || 'var(--border)'}`,
              padding: '10px 16px',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text2)', fontFamily: 'monospace', textAlign: 'right' }}>CVSS SCORE</div>
                <div style={{
                  fontSize: '14px',
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
                fontSize: '20px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                width: '46px',
                height: '46px',
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

        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', marginBottom:'16px', marginTop: '10px' }}>
          {!isCve && <DiffBadge diff={writeup.difficulty} />}
          <span style={{ fontSize:'11px', padding:'2px 9px', borderRadius:'10px', background:'rgba(127,119,221,0.12)', color:'var(--purple-200)', border:'1px solid rgba(127,119,221,0.2)', fontFamily:'monospace' }}>
            {isCve ? 'Mode CVE' : writeup.platform}
          </span>
          {tags.map((t: string) => (
            <span key={t} style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border)', fontFamily:'monospace' }}>{t}</span>
          ))}
          <span style={{ fontSize:'11px', color:'var(--text2)', fontFamily:'monospace', marginLeft:'4px' }}>
            {new Date(writeup.created_at).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' })}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <Link href={`/dashboard/${writeup.id}/edit`} style={{ padding:'7px 16px', borderRadius:'6px', border:'1px solid var(--border2)', background:'transparent', color:'var(--purple-200)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px', textDecoration:'none' }}>
            ✎ Edit
          </Link>
          <PdfExport writeup={writeup} tags={tags} />
          <MultiExportButton writeup={writeup} tags={tags} />
          <CopyMarkdownButton writeup={writeup} />
          <button
            onClick={() => setShowCompliance(true)}
            style={{ padding:'7px 16px', borderRadius:'6px', border:'1px solid var(--border2)', background:'transparent', color:'var(--purple-200)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}
          >
            📋 Compliance Mapping
          </button>
          {writeup.is_public === 1 && (
            <a href={`/share/${writeup.id}`} target="_blank" rel="noopener noreferrer" style={{ padding:'7px 16px', borderRadius:'6px', border:'1px solid var(--border2)', background:'transparent', color:'var(--purple-200)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px', textDecoration:'none' }}>
              🔗 Share Link
            </a>
          )}
          <DeleteButton id={Number(writeup.id)} />
        </div>
        <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'20px 0' }} />
      </div>

      {/* Render actual content */}
      <WriteupContentRenderer writeup={writeup} />

      {showCompliance && (
        <ComplianceReportModal
          writeup={writeup}
          onClose={() => setShowCompliance(false)}
        />
      )}
    </div>
  )
}
