import pool from '@/lib/db'
import { notFound } from 'next/navigation'
import ShareWrapper from '@/components/ui/ShareWrapper'

export default async function PublicWriteupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Query only if is_public is true (1) and select only public-safe columns
  const [rows]: any = await pool.query(
    `SELECT id, title, platform, difficulty, tags, content, writeup_mode, 
            cve_id, cve_product, cve_version, cve_cwe, cve_cvss_score, 
            cve_cvss_vector, cve_cvss_severity, cve_impact, cve_poc, 
            cve_remediation, is_encrypted, encryption_salt, encryption_iv, 
            attack_chain, checklist_state, network_diagram, created_at, updated_at, is_public 
     FROM writeups WHERE id = ? AND is_public = 1`, [id]
  )
  const w = (rows as any[])[0]
  if (!w) notFound()

  // Convert dates to string so they can be sent to Client Component
  const writeup = {
    ...w,
    created_at: w.created_at instanceof Date ? w.created_at.toISOString() : w.created_at,
    updated_at: w.updated_at instanceof Date ? w.updated_at.toISOString() : w.updated_at
  }

  return <ShareWrapper writeup={writeup} />
}
