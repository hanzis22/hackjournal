import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { triggerWebhooks } from '@/lib/webhook'

async function getWriteup(id: number, userId: number) {
  const [rows]: any = await pool.query(
    'SELECT * FROM writeups WHERE id = ? AND user_id = ?', [id, userId]
  )
  return (rows as any[])[0] || null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const writeup = await getWriteup(Number(id), payload.id)
  if (!writeup) return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })

  return NextResponse.json({ writeup })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const writeup = await getWriteup(Number(id), payload.id)
  if (!writeup) return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })

  try {
    const {
      title, platform, difficulty, tags, content, is_public,
      writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
      cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
      cve_impact, cve_poc, cve_remediation,
      is_encrypted, encryption_salt, encryption_iv, attack_chain,
      folder_id, is_starred, checklist_state
    } = await req.json()

    // FEATURE 11: Save previous version history
    const previousSnapshot = JSON.stringify(writeup)
    await pool.query(
      `INSERT INTO writeup_versions (writeup_id, user_id, title, content, full_snapshot) VALUES (?, ?, ?, ?, ?)`,
      [writeup.id, payload.id, writeup.title, writeup.content, previousSnapshot]
    )

    await pool.query(
      `UPDATE writeups SET 
        title=?, platform=?, difficulty=?, tags=?, content=?, is_public=?, 
        writeup_mode=?, cve_id=?, cve_product=?, cve_version=?, cve_cwe=?, 
        cve_cvss_score=?, cve_cvss_vector=?, cve_cvss_severity=?, 
        cve_impact=?, cve_poc=?, cve_remediation=?, 
        is_encrypted=?, encryption_salt=?, encryption_iv=?, attack_chain=?,
        folder_id=?, is_starred=?, checklist_state=?,
        updated_at=NOW()
       WHERE id = ? AND user_id = ?`,
      [
        title, platform || 'Custom', difficulty || 'Easy',
        Array.isArray(tags) ? tags.join(',') : tags, content || '', is_public ? 1 : 0,
        writeup_mode || 'journal', cve_id || null, cve_product || null, cve_version || null, cve_cwe || null,
        cve_cvss_score !== undefined ? cve_cvss_score : null, cve_cvss_vector || null, cve_cvss_severity || null,
        cve_impact || '', cve_poc || '', cve_remediation || '',
        is_encrypted ? 1 : 0, encryption_salt || null, encryption_iv || null, attack_chain || null,
        folder_id !== undefined ? folder_id : null, is_starred ? 1 : 0, checklist_state || null,
        Number(id), payload.id
      ]
    )

    // Trigger webhooks
    triggerWebhooks(payload.id, 'writeup_updated', { id: Number(id), title, difficulty })

    return NextResponse.json({ message: 'Writeup berhasil diupdate' })
  } catch (err) {
    console.error('[PUT WRITEUP]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const writeup = await getWriteup(Number(id), payload.id)
  if (!writeup) return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })

  await pool.query('DELETE FROM writeups WHERE id = ? AND user_id = ?', [Number(id), payload.id])
  return NextResponse.json({ message: 'Writeup berhasil dihapus' })
}
