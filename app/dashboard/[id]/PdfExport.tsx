'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  writeup: any
  tags: string[]
}

export default function PdfExport({ writeup, tags }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const date = new Date(writeup.created_at).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const isCve = writeup.writeup_mode === 'cve'
  const diffColor: Record<string, string> = {
    Easy: '#39ff14', Medium: '#f0a500', Hard: '#ff4560', Insane: '#AFA9EC'
  }
  const sevColor: Record<string, string> = {
    Critical: '#AFA9EC', High: '#ff4560', Medium: '#f0a500', Low: '#39ff14', None: '#888'
  }

  function handlePrint() {
    window.print()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ padding:'7px 16px', borderRadius:'6px', border:'1px solid var(--border2)', background:'transparent', color:'var(--purple-200)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}>
        ↓ Export PDF
      </button>

      {open && mounted && createPortal(
        <div className="pdf-backdrop" 
             onClick={(e) => {
               if ((e.target as HTMLElement).classList.contains('pdf-backdrop')) {
                 setOpen(false)
               }
             }}
             style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px' }}>
          {/* PDF doc */}
          <div className="pdf-print-container" style={{ background:'#0f0f1e', width:'720px', maxWidth:'96vw', maxHeight:'78vh', borderRadius:'10px', overflow:'auto', border:'1px solid var(--purple-600)', boxShadow:'0 0 40px rgba(83,74,183,0.35)' }}>
            <div style={{ padding:'40px', fontFamily:'monospace' }}>
              {/* Header */}
              <div style={{ borderBottom:'2px solid var(--purple-600)', paddingBottom:'16px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontSize:'20px', color:'var(--purple-400)' }}>
                  ⬡ {isCve ? 'HACKJOURNAL ADVISORY' : 'HackJournal'}
                </div>
                <div style={{ textAlign:'right', fontSize:'11px', color:'var(--text2)' }}>
                  <div>{isCve ? `Ref: ${writeup.cve_id || 'PENDING'}` : 'CTF / Lab Writeup'}</div>
                  <div style={{ color:'var(--purple-400)', marginTop:'3px' }}>{date}</div>
                </div>
              </div>

              {/* Title block */}
              <div style={{ marginBottom:'24px' }}>
                <div style={{ fontSize:'22px', color:'var(--purple-200)', marginBottom:'12px' }}>
                  {isCve ? `Vulnerability Advisory: ${writeup.title}` : writeup.title}
                </div>
                
                {!isCve ? (
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'11px', padding:'2px 9px', borderRadius:'10px', background:`rgba(${writeup.difficulty==='Easy'?'57,255,20':writeup.difficulty==='Medium'?'240,165,0':writeup.difficulty==='Hard'?'255,69,96':'175,169,236'},0.12)`, color: diffColor[writeup.difficulty]||'#fff', border:`1px solid rgba(${writeup.difficulty==='Easy'?'57,255,20':writeup.difficulty==='Medium'?'240,165,0':writeup.difficulty==='Hard'?'255,69,96':'175,169,236'},0.3)` }}>{writeup.difficulty}</span>
                    <span style={{ fontSize:'11px', padding:'2px 9px', borderRadius:'10px', background:'rgba(127,119,221,0.12)', color:'var(--purple-200)', border:'1px solid rgba(127,119,221,0.2)' }}>{writeup.platform}</span>
                    {tags.map(t => (
                      <span key={t} style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border)' }}>{t}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    {writeup.cve_cvss_score !== null && (
                      <span style={{
                        fontSize:'11px',
                        padding:'2px 9px',
                        borderRadius:'10px',
                        background: 'rgba(255, 69, 96, 0.12)',
                        color: sevColor[writeup.cve_cvss_severity] || '#fff',
                        border: `1px solid ${sevColor[writeup.cve_cvss_severity] || '#ff4560'}`,
                        fontFamily:'monospace'
                      }}>
                        CVSS {Number(writeup.cve_cvss_score).toFixed(1)} ({writeup.cve_cvss_severity})
                      </span>
                    )}
                    <span style={{ fontSize:'11px', padding:'2px 9px', borderRadius:'10px', background:'rgba(127,119,221,0.12)', color:'var(--purple-200)', border:'1px solid rgba(127,119,221,0.2)' }}>Mode CVE</span>
                    {tags.map(t => (
                      <span key={t} style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Advisory Details Table for CVE */}
              {isCve && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div><span style={{ color: 'var(--text2)' }}>Product:</span> <strong style={{ color: 'var(--text)' }}>{writeup.cve_product || '-'}</strong></div>
                    <div><span style={{ color: 'var(--text2)' }}>Affected Version:</span> <strong style={{ color: 'var(--text)' }}>{writeup.cve_version || '-'}</strong></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div><span style={{ color: 'var(--text2)' }}>Classification:</span> <strong style={{ color: 'var(--text)' }}>{writeup.cve_cwe || '-'}</strong></div>
                    <div><span style={{ color: 'var(--text2)' }}>CVE Ref:</span> <strong style={{ color: 'var(--text)' }}>{writeup.cve_id || 'PENDING'}</strong></div>
                  </div>
                  {writeup.cve_cvss_vector && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px', wordBreak: 'break-all' }}>
                      <span style={{ color: 'var(--text2)' }}>CVSS Vector:</span> <code style={{ color: 'var(--purple-300)', fontSize: '11px' }}>{writeup.cve_cvss_vector}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Attack Chain rendering inside PDF */}
              {writeup.attack_chain && (() => {
                let attackChain: any[] = [];
                try {
                  attackChain = typeof writeup.attack_chain === 'string' ? JSON.parse(writeup.attack_chain) : writeup.attack_chain;
                } catch {
                  attackChain = [];
                }
                if (!attackChain || attackChain.length === 0) return null;
                return (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--purple-400)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                      🔗 ATTACK CHAIN VECTOR
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '12px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px',
                      overflow: 'visible',
                      flexWrap: 'wrap'
                    }} className="pdf-attack-chain">
                      {attackChain.map((step: any, idx: number) => (
                        <div key={step.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <div className="pdf-step-card" style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            border: `2px solid ${step.color || 'var(--purple-600)'}`, 
                            color: step.color,
                            borderRadius: '6px', 
                            padding: '10px', 
                            minWidth: '130px', 
                            maxWidth: '160px'
                          }}>
                            <div style={{ fontSize: '8px', color: step.color, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                              {step.icon === 'entry' ? '🚪 Entry' : step.icon === 'vuln' ? '💥 Vuln' : step.icon === 'pivot' ? '🔀 Pivot' : '🎯 Target'}
                            </div>
                            <strong style={{ display: 'block', fontSize: '11px', color: '#fff', marginBottom: '2px' }}>{step.name}</strong>
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text2)', lineHeight: '1.3' }}>{step.desc}</span>
                          </div>
                          {idx < attackChain.length - 1 && (
                            <div style={{ color: 'var(--purple-400)', fontSize: '16px', fontWeight: 'bold' }}>➡</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Content rendering */}
              {!isCve ? (
                <>
                  <div style={{ borderLeft:'3px solid var(--purple-600)', paddingLeft:'12px', marginBottom:'12px' }}>
                    <div style={{ fontSize:'11px', color:'var(--purple-400)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'12px' }}>// Writeup Content</div>
                  </div>
                  <div
                    className="writeup-content"
                    dangerouslySetInnerHTML={{ __html: writeup.content }}
                    style={{ fontSize:'13px', color:'var(--text2)', lineHeight:'1.85' }}
                  />
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ borderLeft:'3px solid var(--purple-600)', paddingLeft:'10px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'11px', color:'var(--purple-400)', fontWeight:'bold' }}>1. VULNERABILITY SUMMARY</span>
                    </div>
                    <div className="writeup-content" dangerouslySetInnerHTML={{ __html: writeup.content }} style={{ fontSize:'13px', color:'var(--text2)', lineHeight:'1.85' }} />
                  </div>

                  {writeup.cve_impact && (
                    <div>
                      <div style={{ borderLeft:'3px solid var(--purple-600)', paddingLeft:'10px', marginBottom:'8px' }}>
                        <span style={{ fontSize:'11px', color:'var(--purple-400)', fontWeight:'bold' }}>2. TECHNICAL IMPACT ASSESSMENT</span>
                      </div>
                      <div className="writeup-content" dangerouslySetInnerHTML={{ __html: writeup.cve_impact }} style={{ fontSize:'13px', color:'var(--text2)', lineHeight:'1.85' }} />
                    </div>
                  )}

                  {writeup.cve_poc && (
                    <div>
                      <div style={{ borderLeft:'3px solid var(--purple-600)', paddingLeft:'10px', marginBottom:'8px' }}>
                        <span style={{ fontSize:'11px', color:'var(--purple-400)', fontWeight:'bold' }}>3. PROOF OF CONCEPT (PoC)</span>
                      </div>
                      <div className="writeup-content" dangerouslySetInnerHTML={{ __html: writeup.cve_poc }} style={{ fontSize:'13px', color:'var(--text2)', lineHeight:'1.85' }} />
                    </div>
                  )}

                  {writeup.cve_remediation && (
                    <div>
                      <div style={{ borderLeft:'3px solid var(--purple-600)', paddingLeft:'10px', marginBottom:'8px' }}>
                        <span style={{ fontSize:'11px', color:'var(--purple-400)', fontWeight:'bold' }}>4. REMEDIATION & MITIGATION PLAN</span>
                      </div>
                      <div className="writeup-content" dangerouslySetInnerHTML={{ __html: writeup.cve_remediation }} style={{ fontSize:'13px', color:'var(--text2)', lineHeight:'1.85' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:'12px', marginTop:'32px', fontSize:'10px', color:'var(--text2)', textAlign:'center' }}>
                Generated by HackJournal Advisory &nbsp;|&nbsp; {date} &nbsp;|&nbsp; hackjournal.local
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pdf-actions" style={{ display:'flex', gap:'10px' }}>
            <button onClick={() => setOpen(false)}
              style={{ padding:'9px 20px', borderRadius:'6px', border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}>
              Tutup
            </button>
            <button onClick={handlePrint}
              style={{ padding:'9px 20px', borderRadius:'6px', border:'none', background:'var(--purple-600)', color:'#fff', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}>
              🖨 Print / Save PDF
            </button>
          </div>
          <p className="pdf-actions" style={{ fontSize:'11px', color:'var(--text2)', fontFamily:'monospace' }}>
            Browser Print → Save as PDF (Tata letak cetak ramah kertas & multi-halaman otomatis aktif)
          </p>

          <style>{`
            @media print {
              /* Hide all other elements on the body */
              body > *:not(.pdf-backdrop) {
                display: none !important;
              }
              
              /* Reset HTML and body layout for natural printing */
              html, body {
                background: #ffffff !important;
                color: #111111 !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                position: static !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              
              /* Style backdrop as a normal printable block wrapper */
              .pdf-backdrop {
                position: static !important;
                background: #ffffff !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              
              /* Render print container fully on all pages with light theme */
              .pdf-print-container {
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #111111 !important;
              }

              /* Force light colors on elements inside print container */
              .pdf-print-container,
              .pdf-print-container * {
                color: #111111 !important;
                background: transparent !important;
                border-color: #dddddd !important;
                text-shadow: none !important;
                box-shadow: none !important;
              }

              /* Custom header styling on print */
              .pdf-print-container h1, 
              .pdf-print-container h2, 
              .pdf-print-container h3, 
              .pdf-print-container strong {
                color: #000000 !important;
              }

              .pdf-print-container h2 {
                border-left: 3px solid #534ab7 !important;
                padding-left: 12px !important;
              }

              /* Code blocks styling in print */
              .pdf-print-container code {
                font-family: monospace !important;
                background: #f3f4f6 !important;
                color: #d11141 !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
                border: 1px solid #e5e7eb !important;
                font-size: 12px !important;
              }

              .pdf-print-container pre {
                background: #f8f9fa !important;
                border: 1px solid #e5e7eb !important;
                border-radius: 8px !important;
                padding: 12px !important;
                margin: 12px 0 !important;
                overflow: visible !important;
                white-space: pre-wrap !important;
                word-break: break-all !important;
              }

              .pdf-print-container pre code {
                background: none !important;
                border: none !important;
                color: #111111 !important;
                padding: 0 !important;
              }

              .pdf-print-container blockquote {
                border-left: 3px solid #534ab7 !important;
                background: #f9fafb !important;
                color: #4b5563 !important;
              }

              /* Hide print buttons and extra info */
              .pdf-actions, .no-print, .copy-code-btn {
                display: none !important;
              }

              /* Page breaks configuration */
              .pdf-print-container h1, 
              .pdf-print-container h2, 
              .pdf-print-container h3 {
                page-break-after: avoid;
                break-after: avoid;
              }

              .pdf-print-container img {
                max-width: 100% !important;
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  )
}
