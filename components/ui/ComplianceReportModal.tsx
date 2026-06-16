'use client'
import { useState } from 'react'

interface Props {
  writeup: any
  onClose: () => void
}

const complianceFrameworks = {
  'PCI-DSS v4.0': [
    { control: 'Requirement 6.2.4', description: 'Prevent software vulnerabilities by protecting applications against SQL Injection, XSS, and buffer overflows.' },
    { control: 'Requirement 6.3.2', description: 'Maintain an inventory of custom software and identify vulnerability risks.' },
    { control: 'Requirement 11.3.1', description: 'Establish and implement a methodology for penetration testing.' }
  ],
  'ISO 27001:2022': [
    { control: 'Control A.8.28', description: 'Secure coding principles should be applied to software development.' },
    { control: 'Control A.8.8', description: 'Management of technical vulnerabilities.' },
    { control: 'Control A.5.15', description: 'Access control policy and implementation.' }
  ],
  'SOC 2 Type II': [
    { control: 'CC7.1', description: 'Vulnerability management infrastructure and remediation.' },
    { control: 'CC6.6', description: 'Boundary defense and logical access control to applications.' },
    { control: 'CC7.2', description: 'Detection and assessment of vulnerabilities.' }
  ],
  'NIST SP 800-53': [
    { control: 'SI-2', description: 'Flaw Remediation and vulnerability patching.' },
    { control: 'SA-11', description: 'Developer Security Testing and Evaluation.' },
    { control: 'RA-5', description: 'Vulnerability Monitoring and Scanning.' }
  ]
}

export default function ComplianceReportModal({ writeup, onClose }: Props) {
  const [selectedFramework, setSelectedFramework] = useState<keyof typeof complianceFrameworks>('PCI-DSS v4.0')

  const isSql = writeup.title?.toLowerCase().includes('sql') || writeup.cve_cwe?.toLowerCase().includes('cwe-89') || writeup.content?.toLowerCase().includes('sql')

  // Find relevant mapped controls
  const mappedControls = complianceFrameworks[selectedFramework].filter(c => {
    if (selectedFramework === 'PCI-DSS v4.0') {
      if (isSql && c.control.includes('6.2.4')) return true
      return c.control.includes('6.3.2') // default mapping
    }
    if (selectedFramework === 'ISO 27001:2022') {
      return c.control.includes('A.8.8') || c.control.includes('A.8.28')
    }
    return true
  })

  const downloadComplianceReport = () => {
    const htmlContent = `
      <html>
        <head>
          <title>Compliance Alignment Report - ${writeup.title}</title>
          <style>
            body { font-family: monospace; padding: 40px; background: #fafafa; color: #333; }
            .card { background: white; padding: 24px; border-radius: 8px; border: 1px solid #ddd; }
            h1 { color: #111; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .badge { background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .control-box { border-left: 4px solid #7F77DD; padding-left: 12px; margin-top: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Compliance Alignment Report</h1>
            <p><strong>Vulnerability:</strong> ${writeup.title}</p>
            <p><strong>Framework:</strong> ${selectedFramework}</p>
            <h2>Mapped Controls</h2>
            ${mappedControls.map(c => `
              <div class="control-box">
                <strong>${c.control}</strong>
                <p>${c.description}</p>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance_report_${selectedFramework.replace(/\s+/g, '_').toLowerCase()}.html`
    a.click()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0B0B16',
        border: '1px solid #7F77DD',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '550px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(127, 119, 221, 0.2)',
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
            📋 Compliance Mapping & Report Generator
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#FF4560', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <p style={{ color: 'var(--text2)', fontSize: '12px', marginBottom: '20px', lineHeight: '1.5' }}>
          Map the current vulnerability report findings directly to regulatory frameworks and standards for executive audit logs.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text2)', fontSize: '11px', marginBottom: '6px' }}>SELECT FRAMEWORK</label>
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value as any)}
            style={{ width: '100%', background: '#070710', border: '1px solid var(--border)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '13px' }}
          >
            {Object.keys(complianceFrameworks).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: 'var(--text2)', fontSize: '11px', marginBottom: '10px' }}>MAPPED REGULATORY CONTROLS</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mappedControls.map(c => (
              <div key={c.control} style={{ background: '#121225', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong style={{ color: '#39FF14', fontSize: '12px' }}>{c.control}</strong>
                <p style={{ margin: '6px 0 0 0', color: '#fff', fontSize: '12px', lineHeight: '1.4' }}>{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>Close</button>
          <button onClick={downloadComplianceReport} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#7F77DD', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
            Download HTML Report
          </button>
        </div>
      </div>
    </div>
  )
}
