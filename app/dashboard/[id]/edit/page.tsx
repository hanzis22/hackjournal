import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import pool from '@/lib/db'
import { notFound } from 'next/navigation'
import WriteupForm from '@/components/ui/WriteupForm'

export default async function EditWriteupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('hj_token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) notFound()

  const [rows]: any = await pool.query(
    'SELECT * FROM writeups WHERE id = ? AND user_id = ?', [id, payload.id]
  )
  const w = (rows as any[])[0]
  if (!w) notFound()

  return (
    <div style={{ padding:'32px 40px' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontFamily:'monospace', fontSize:'20px', color:'var(--purple-300)', marginBottom:'6px' }}>// Edit Writeup</h1>
        <p style={{ color:'var(--text2)', fontSize:'13px' }}>Update dokumentasi writeup kamu</p>
      </div>
      <WriteupForm initial={{
        id:         w.id,
        title:      w.title,
        platform:   w.platform,
        difficulty: w.difficulty,
        tags:       w.tags,
        content:    w.content,
        is_public:  !!w.is_public,
        writeup_mode: w.writeup_mode,
        cve_id:       w.cve_id,
        cve_product:  w.cve_product,
        cve_version:  w.cve_version,
        cve_cwe:      w.cve_cwe,
        cve_cvss_score: w.cve_cvss_score,
        cve_cvss_vector: w.cve_cvss_vector,
        cve_cvss_severity: w.cve_cvss_severity,
        cve_impact:   w.cve_impact,
        cve_poc:      w.cve_poc,
        cve_remediation: w.cve_remediation,
        is_encrypted: w.is_encrypted,
        encryption_salt: w.encryption_salt,
        encryption_iv: w.encryption_iv,
        attack_chain: w.attack_chain,
      }} />
    </div>
  )
}
