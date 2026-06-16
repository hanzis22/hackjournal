import WriteupForm from '@/components/ui/WriteupForm'

export default function NewWriteupPage() {
  return (
    <div style={{ padding:'32px 40px' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontFamily:'monospace', fontSize:'20px', color:'var(--purple-300)', marginBottom:'6px' }}>// New Writeup</h1>
        <p style={{ color:'var(--text2)', fontSize:'13px' }}>Dokumentasikan lab atau CTF yang baru selesai</p>
      </div>
      <WriteupForm />
    </div>
  )
}
