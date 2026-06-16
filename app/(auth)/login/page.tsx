'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>⬡</div>
          <h1 style={{ fontFamily:'monospace', fontSize:'24px', color:'var(--purple-400)', margin:0 }}>HackJournal</h1>
          <p style={{ color:'var(--text2)', fontSize:'13px', marginTop:'6px' }}>Cybersecurity Writeup Platform</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'12px', padding:'32px' }}>
          <h2 style={{ fontFamily:'monospace', fontSize:'14px', color:'var(--purple-300)', letterSpacing:'2px', marginBottom:'24px', textTransform:'uppercase' }}>// Access Terminal</h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'var(--text2)', marginBottom:'6px', fontFamily:'monospace', letterSpacing:'1px', textTransform:'uppercase' }}>Email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="hacker@email.com"
                style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'6px', padding:'10px 12px', color:'var(--text)', fontSize:'14px', outline:'none', fontFamily:'monospace' }}
                onFocus={e => e.target.style.borderColor = 'var(--purple-400)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'var(--text2)', marginBottom:'6px', fontFamily:'monospace', letterSpacing:'1px', textTransform:'uppercase' }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  placeholder="••••••••"
                  style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'6px', padding:'10px 42px 10px 12px', color:'var(--text)', fontSize:'14px', outline:'none', fontFamily:'monospace' }}
                  onFocus={e => e.target.style.borderColor = 'var(--purple-400)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:'10px', fontFamily:'monospace', outline:'none' }}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:'rgba(255,69,96,0.1)', border:'1px solid rgba(255,69,96,0.3)', borderRadius:'6px', padding:'10px 12px', color:'var(--red)', fontSize:'13px', marginBottom:'16px', fontFamily:'monospace' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--purple-600)', border:'none', borderRadius:'6px', padding:'12px', color:'#fff', fontSize:'14px', fontFamily:'monospace', cursor:'pointer', letterSpacing:'1px', opacity: loading ? 0.7 : 1 }}>
              {loading ? '// Authenticating...' : '// Login →'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'var(--text2)' }}>
            Belum punya akun?{' '}
            <Link href="/register" style={{ color:'var(--purple-400)', textDecoration:'none' }}>Register di sini</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
