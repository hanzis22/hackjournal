'use client'
import { useState, useEffect } from 'react'

interface CVSSCalculatorProps {
  initialVector?: string
  onChange: (result: { score: number; severity: string; vector: string }) => void
}

// Parse CVSS v3.1 vector string into metrics object
function parseCVSSVector(vector: string) {
  const defaultMetrics = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' }
  if (!vector || !vector.startsWith('CVSS:3.1/')) return defaultMetrics

  const parts = vector.substring(9).split('/')
  const parsed: any = { ...defaultMetrics }
  for (const part of parts) {
    const [key, val] = part.split(':')
    if (key && val) {
      parsed[key] = val
    }
  }
  return parsed
}

// Parse CVSS v4.0 vector string into metrics object
function parseCVSSv4Vector(vector: string) {
  const defaultMetrics = {
    AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N',
    VC: 'H', VI: 'H', VA: 'H',
    SC: 'N', SI: 'N', SA: 'N'
  }
  if (!vector || !vector.startsWith('CVSS:4.0/')) return defaultMetrics

  const parts = vector.substring(9).split('/')
  const parsed: any = { ...defaultMetrics }
  for (const part of parts) {
    const [key, val] = part.split(':')
    if (key && val) {
      parsed[key] = val
    }
  }
  return parsed
}

// Calculate CVSS v3.1 Base Score
function calculateCVSS(metrics: any) {
  const { AV, AC, PR, UI, S, C, I, A } = metrics

  const AV_values: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }
  const AC_values: Record<string, number> = { L: 0.77, H: 0.44 }
  
  let PR_value = 0
  if (S === 'U') {
    const PR_values: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 }
    PR_value = PR_values[PR]
  } else {
    const PR_values: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 }
    PR_value = PR_values[PR]
  }

  const UI_values: Record<string, number> = { N: 0.85, R: 0.62 }
  const C_values: Record<string, number> = { N: 0, L: 0.22, H: 0.56 }
  const I_values: Record<string, number> = { N: 0, L: 0.22, H: 0.56 }
  const A_values: Record<string, number> = { N: 0, L: 0.22, H: 0.56 }

  const av = AV_values[AV] ?? 0.85
  const ac = AC_values[AC] ?? 0.77
  const pr = PR_value ?? 0.85
  const ui = UI_values[UI] ?? 0.85
  
  const c = C_values[C] ?? 0
  const i = I_values[I] ?? 0
  const a = A_values[A] ?? 0

  const exploitability = 8.22 * av * ac * pr * ui
  const iss = 1 - (1 - c) * (1 - i) * (1 - a)
  
  let impact = 0
  if (S === 'U') {
    impact = 6.42 * iss
  } else {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
  }

  let baseScore = 0
  if (impact <= 0) {
    baseScore = 0
  } else {
    if (S === 'U') {
      baseScore = Math.min(impact + exploitability, 10)
    } else {
      baseScore = Math.min(1.08 * (impact + exploitability), 10)
    }
  }

  const score = Math.ceil(baseScore * 10) / 10
  
  let severity = 'None'
  if (score >= 9.0) severity = 'Critical'
  else if (score >= 7.0) severity = 'High'
  else if (score >= 4.0) severity = 'Medium'
  else if (score >= 0.1) severity = 'Low'

  const vector = `CVSS:3.1/AV:${AV}/AC:${AC}/PR:${PR}/UI:${UI}/S:${S}/C:${C}/I:${I}/A:${A}`

  return { score, severity, vector }
}

// Calculate CVSS v4.0 Base Score (Approximation)
function calculateCVSSv4(metrics: any) {
  const { AV, AC, AT, PR, UI, VC, VI, VA, SC, SI, SA } = metrics

  let exploitability = 0
  if (AV === 'N') exploitability += 2.0
  else if (AV === 'A') exploitability += 1.5
  else if (AV === 'L') exploitability += 1.0
  else if (AV === 'P') exploitability += 0.5

  if (AC === 'L') exploitability += 1.0
  else if (AC === 'H') exploitability += 0.5

  if (AT === 'N') exploitability += 1.0
  else if (AT === 'P') exploitability += 0.5

  if (PR === 'N') exploitability += 1.5
  else if (PR === 'L') exploitability += 1.0
  else if (PR === 'H') exploitability += 0.5

  if (UI === 'N') exploitability += 1.5
  else if (UI === 'P') exploitability += 1.0
  else if (UI === 'A') exploitability += 0.5

  let impact = 0
  if (VC === 'H') impact += 2.0
  else if (VC === 'L') impact += 1.0

  if (VI === 'H') impact += 2.0
  else if (VI === 'L') impact += 1.0

  if (VA === 'H') impact += 2.0
  else if (VA === 'L') impact += 1.0

  if (SC === 'H') impact += 1.0
  else if (SC === 'L') impact += 0.5

  if (SI === 'H') impact += 1.0
  else if (SI === 'L') impact += 0.5

  if (SA === 'H') impact += 1.0
  else if (SA === 'L') impact += 0.5

  const baseScore = Math.min((exploitability * 0.4) + (impact * 0.8), 10)
  const score = Math.round(baseScore * 10) / 10

  let severity = 'None'
  if (score >= 9.0) severity = 'Critical'
  else if (score >= 7.0) severity = 'High'
  else if (score >= 4.0) severity = 'Medium'
  else if (score >= 0.1) severity = 'Low'

  const vector = `CVSS:4.0/AV:${AV}/AC:${AC}/AT:${AT}/PR:${PR}/UI:${UI}/VC:${VC}/VI:${VI}/VA:${VA}/SC:${SC}/SI:${SI}/SA:${SA}`

  return { score, severity, vector }
}

export default function CVSSCalculator({ initialVector = '', onChange }: CVSSCalculatorProps) {
  const isV4 = initialVector.startsWith('CVSS:4.0/')
  const [cvssVersion, setCvssVersion] = useState<'v3' | 'v4'>(isV4 ? 'v4' : 'v3')

  const [metricsV3, setMetricsV3] = useState(() => parseCVSSVector(initialVector))
  const [metricsV4, setMetricsV4] = useState(() => parseCVSSv4Vector(initialVector))

  const cvssResult = cvssVersion === 'v3' ? calculateCVSS(metricsV3) : calculateCVSSv4(metricsV4)

  useEffect(() => {
    onChange(cvssResult)
  }, [cvssVersion, metricsV3, metricsV4])

  const handleMetricChange = (metric: string, value: string) => {
    if (cvssVersion === 'v3') {
      setMetricsV3(prev => ({ ...prev, [metric]: value }))
    } else {
      setMetricsV4(prev => ({ ...prev, [metric]: value }))
    }
  }

  const renderMetricButtons = (metricKey: string, label: string, options: { val: string; desc: string }[]) => {
    const currentVal = (metricsV3 as any)[metricKey]
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace', marginBottom: '6px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {options.map(opt => {
            const isSelected = currentVal === opt.val
            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => handleMetricChange(metricKey, opt.val)}
                style={{
                  background: isSelected ? 'var(--purple-600)' : 'var(--bg3)',
                  border: isSelected ? '1px solid var(--purple-400)' : '1px solid var(--border)',
                  color: isSelected ? '#fff' : 'var(--text2)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '5px 9px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {opt.desc} ({opt.val})
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMetricButtonsV4 = (metricKey: string, label: string, options: { val: string; desc: string }[]) => {
    const currentVal = (metricsV4 as any)[metricKey]
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace', marginBottom: '6px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {options.map(opt => {
            const isSelected = currentVal === opt.val
            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => handleMetricChange(metricKey, opt.val)}
                style={{
                  background: isSelected ? 'var(--purple-600)' : 'var(--bg3)',
                  border: isSelected ? '1px solid var(--purple-400)' : '1px solid var(--border)',
                  color: isSelected ? '#fff' : 'var(--text2)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '5px 9px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {opt.desc} ({opt.val})
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <h4 style={{ fontFamily: 'monospace', color: 'var(--purple-300)', margin: 0 }}>
          🛡️ CVSS BASE SCORE CALCULATOR
        </h4>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setCvssVersion('v3')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '11px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              background: cvssVersion === 'v3' ? 'var(--purple-600)' : 'transparent',
              color: cvssVersion === 'v3' ? '#fff' : 'var(--text2)'
            }}
          >
            CVSS v3.1
          </button>
          <button
            type="button"
            onClick={() => setCvssVersion('v4')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '11px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              background: cvssVersion === 'v4' ? 'var(--purple-600)' : 'transparent',
              color: cvssVersion === 'v4' ? '#fff' : 'var(--text2)'
            }}
          >
            CVSS v4.0
          </button>
        </div>
      </div>

      {cvssVersion === 'v3' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ fontFamily: 'monospace', color: 'var(--text2)', margin: '0 0 12px 0', fontSize: '11px', letterSpacing: '1px' }}>EXPLOITABILITY</h5>
            {renderMetricButtons('AV', 'Attack Vector (AV)', [
              { val: 'N', desc: 'Network' }, { val: 'A', desc: 'Adjacent' },
              { val: 'L', desc: 'Local' }, { val: 'P', desc: 'Physical' }
            ])}
            {renderMetricButtons('AC', 'Attack Complexity (AC)', [
              { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtons('PR', 'Privileges Required (PR)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtons('UI', 'User Interaction (UI)', [
              { val: 'N', desc: 'None' }, { val: 'R', desc: 'Required' }
            ])}
          </div>
          <div>
            <h5 style={{ fontFamily: 'monospace', color: 'var(--text2)', margin: '0 0 12px 0', fontSize: '11px', letterSpacing: '1px' }}>IMPACT</h5>
            {renderMetricButtons('S', 'Scope (S)', [
              { val: 'U', desc: 'Unchanged' }, { val: 'C', desc: 'Changed' }
            ])}
            {renderMetricButtons('C', 'Confidentiality Impact (C)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtons('I', 'Integrity Impact (I)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtons('A', 'Availability Impact (A)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ fontFamily: 'monospace', color: 'var(--text2)', margin: '0 0 12px 0', fontSize: '11px', letterSpacing: '1px' }}>EXPLOITABILITY (v4.0)</h5>
            {renderMetricButtonsV4('AV', 'Attack Vector (AV)', [
              { val: 'N', desc: 'Network' }, { val: 'A', desc: 'Adjacent' },
              { val: 'L', desc: 'Local' }, { val: 'P', desc: 'Physical' }
            ])}
            {renderMetricButtonsV4('AC', 'Attack Complexity (AC)', [
              { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('AT', 'Attack Requirements (AT)', [
              { val: 'N', desc: 'None' }, { val: 'P', desc: 'Prerequisite' }
            ])}
            {renderMetricButtonsV4('PR', 'Privileges Required (PR)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('UI', 'User Interaction (UI)', [
              { val: 'N', desc: 'None' }, { val: 'P', desc: 'Passive' }, { val: 'A', desc: 'Active' }
            ])}
          </div>
          <div>
            <h5 style={{ fontFamily: 'monospace', color: 'var(--text2)', margin: '0 0 12px 0', fontSize: '11px', letterSpacing: '1px' }}>IMPACT (v4.0)</h5>
            {renderMetricButtonsV4('VC', 'Vulnerable System Confidentiality (VC)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('VI', 'Vulnerable System Integrity (VI)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('VA', 'Vulnerable System Availability (VA)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('SC', 'Subsequent System Confidentiality (SC)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('SI', 'Subsequent System Integrity (SI)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
            {renderMetricButtonsV4('SA', 'Subsequent System Availability (SA)', [
              { val: 'N', desc: 'None' }, { val: 'L', desc: 'Low' }, { val: 'H', desc: 'High' }
            ])}
          </div>
        </div>
      )}

      {/* Score & Vector Output Panel */}
      <div style={{
        marginTop: '20px',
        padding: '14px',
        background: 'var(--bg3)',
        borderRadius: '6px',
        borderLeft: `4px solid ${
          cvssResult.severity === 'Critical' ? 'var(--purple-400)' :
          cvssResult.severity === 'High' ? 'var(--red)' :
          cvssResult.severity === 'Medium' ? 'var(--amber)' :
          cvssResult.severity === 'Low' ? 'var(--green)' : 'var(--border)'
        }`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'monospace' }}>CVSS {cvssVersion === 'v3' ? '3.1' : '4.0'} VECTOR STRING</div>
          <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '2px' }}>
            {cvssResult.vector}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'monospace' }}>SEVERITY</div>
            <div style={{
              fontSize: '15px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: 
                cvssResult.severity === 'Critical' ? 'var(--purple-200)' :
                cvssResult.severity === 'High' ? 'var(--red)' :
                cvssResult.severity === 'Medium' ? 'var(--amber)' :
                cvssResult.severity === 'Low' ? 'var(--green)' : 'var(--text2)'
            }}>
              {cvssResult.severity.toUpperCase()}
            </div>
          </div>
          <div style={{
            background:
              cvssResult.severity === 'Critical' ? 'rgba(175,169,236,0.2)' :
              cvssResult.severity === 'High' ? 'rgba(255,69,96,0.2)' :
              cvssResult.severity === 'Medium' ? 'rgba(240,165,0,0.2)' :
              cvssResult.severity === 'Low' ? 'rgba(57,255,20,0.2)' : 'var(--border)',
            border: `1px solid ${
              cvssResult.severity === 'Critical' ? 'var(--purple-400)' :
              cvssResult.severity === 'High' ? 'var(--red)' :
              cvssResult.severity === 'Medium' ? 'var(--amber)' :
              cvssResult.severity === 'Low' ? 'var(--green)' : 'var(--border)'
            }`,
            color: '#fff',
            borderRadius: '8px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}>
            {cvssResult.score.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  )
}
