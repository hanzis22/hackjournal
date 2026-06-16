import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import pool from '@/lib/db'
import { notFound } from 'next/navigation'
import DetailWrapper from '@/components/ui/DetailWrapper'

export default async function WriteupDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Convert dates to string so they can be sent to Client Component
  const writeup = {
    ...w,
    created_at: w.created_at instanceof Date ? w.created_at.toISOString() : w.created_at,
    updated_at: w.updated_at instanceof Date ? w.updated_at.toISOString() : w.updated_at
  }

  return <DetailWrapper writeup={writeup} />
}
