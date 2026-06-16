'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/writeups/${id}`, { method: 'DELETE' })
    router.push('/dashboard')
    router.refresh()
  }

  if (confirm) return (
    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
      <span style={{ fontSize:'12px', color:'var(--red)', fontFamily:'monospace' }}>Yakin hapus?</span>
      <button onClick={handleDelete} disabled={loading}
        style={{ padding:'7px 14px', borderRadius:'6px', border:'1px solid rgba(255,69,96,0.4)', background:'rgba(255,69,96,0.1)', color:'var(--red)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px' }}>
        {loading ? '...' : 'Ya, hapus'}
      </button>
      <button onClick={() => setConfirm(false)}
        style={{ padding:'7px 14px', borderRadius:'6px', border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', cursor:'pointer', fontFamily:'monospace', fontSize:'12px' }}>
        Batal
      </button>
    </div>
  )

  return (
    <button onClick={() => setConfirm(true)}
      style={{ padding:'7px 16px', borderRadius:'6px', border:'1px solid rgba(255,69,96,0.3)', background:'transparent', color:'var(--red)', cursor:'pointer', fontFamily:'monospace', fontSize:'13px' }}>
      🗑 Delete
    </button>
  )
}
