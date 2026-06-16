'use client'
import { useState } from 'react'

interface AttackChainStep {
  id: string
  name: string
  desc: string
  icon: 'entry' | 'vuln' | 'pivot' | 'target'
  color: string
}

interface AttackChainEditorProps {
  attackChain: AttackChainStep[]
  onChange: (chain: AttackChainStep[]) => void
}

export default function AttackChainEditor({ attackChain, onChange }: AttackChainEditorProps) {
  const [newStep, setNewStep] = useState<Omit<AttackChainStep, 'id'>>({
    name: '',
    desc: '',
    icon: 'vuln',
    color: '#7F77DD'
  })

  const addStep = () => {
    if (!newStep.name.trim()) return
    const step: AttackChainStep = {
      ...newStep,
      id: Math.random().toString(36).substring(2, 9)
    }
    const updated = [...attackChain, step]
    onChange(updated)
    setNewStep({
      name: '',
      desc: '',
      icon: 'vuln',
      color: '#7F77DD'
    })
  }

  const removeStep = (id: string) => {
    const updated = attackChain.filter(step => step.id !== id)
    onChange(updated)
  }

  const moveStep = (index: number, direction: number) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= attackChain.length) return
    const updated = [...attackChain]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    onChange(updated)
  }

  const labelStyle = { display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
  const inputStyle = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
      <h4 style={{ fontFamily: 'monospace', color: 'var(--purple-300)', margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        🔗 VISUAL ATTACK CHAIN VECTOR
      </h4>

      {attackChain.length > 0 ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '16px', 
          background: 'var(--bg3)', 
          borderRadius: '8px', 
          marginBottom: '20px', 
          overflowX: 'auto',
          border: '1px solid var(--border)'
        }}>
          {attackChain.map((step, idx) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                background: 'var(--bg2)', 
                border: `2px solid ${step.color || 'var(--purple-600)'}`, 
                borderRadius: '8px', 
                padding: '12px', 
                minWidth: '160px', 
                maxWidth: '220px',
                boxShadow: `0 0 10px ${step.color}22`,
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', background: `${step.color}22`, color: step.color, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {step.icon === 'entry' ? '🚪 Entry' : step.icon === 'vuln' ? '💥 Vuln' : step.icon === 'pivot' ? '🔀 Pivot' : '🎯 Target'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: '10px' }}>▲</button>
                    <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === attackChain.length - 1} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: '10px' }}>▼</button>
                    <button type="button" onClick={() => removeStep(step.id)} style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>×</button>
                  </div>
                </div>
                <strong style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '4px' }}>{step.name}</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>{step.desc}</span>
              </div>
              {idx < attackChain.length - 1 && (
                <div style={{ color: 'var(--purple-400)', fontSize: '20px', fontWeight: 'bold' }}>➡</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: '1px dashed var(--border2)', borderRadius: '8px', padding: '20px', textAlign: 'center', color: 'var(--text2)', fontSize: '12px', marginBottom: '20px' }}>
          Belum ada langkah rantai serangan. Gunakan formulir di bawah untuk menambahkannya.
        </div>
      )}

      {/* Add Step Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Nama Langkah / Kerentanan</label>
          <input 
            style={inputStyle} 
            value={newStep.name} 
            placeholder="e.g. SQL Injection on login.php" 
            onChange={e => setNewStep(s => ({ ...s, name: e.target.value }))}
          />
        </div>
        <div>
          <label style={labelStyle}>Deskripsi singkat</label>
          <input 
            style={inputStyle} 
            value={newStep.desc} 
            placeholder="e.g. Mendapatkan akses admin session token" 
            onChange={e => setNewStep(s => ({ ...s, desc: e.target.value }))}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Jenis Node / Peran</label>
          <select 
            style={inputStyle} 
            value={newStep.icon} 
            onChange={e => setNewStep(s => ({ ...s, icon: e.target.value as any }))}
          >
            <option value="entry">Entry Point (Pintu Masuk)</option>
            <option value="vuln">Vulnerability (Kerentanan)</option>
            <option value="pivot">Pivoting / Lateral Movement</option>
            <option value="target">Final Target / Impact</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Warna Visual</label>
          <select 
            style={inputStyle} 
            value={newStep.color} 
            onChange={e => setNewStep(s => ({ ...s, color: e.target.value }))}
          >
            <option value="#7F77DD">Ungu (Default)</option>
            <option value="#ff4560">Merah (Critical/Danger)</option>
            <option value="#f0a500">Kuning (Medium/Warning)</option>
            <option value="#39ff14">Hijau (Low/Info)</option>
            <option value="#AFA9EC">Lilac (Target)</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={addStep}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          background: 'var(--purple-600)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}
      >
        + Tambahkan Langkah Serangan
      </button>
    </div>
  )
}
