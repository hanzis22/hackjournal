import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { triggerWebhooks } from '@/lib/webhook'
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize'

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
    const body = await req.json()

    // SEC-02: Server-side sanitization
    const title = sanitizeText(body.title || writeup.title)
    const platform = sanitizeText(body.platform || 'Custom')
    const difficulty = sanitizeText(body.difficulty || 'Easy')
    const tags = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitizeText(t)).join(',') : sanitizeText(body.tags || '')
    const content = sanitizeHtml(body.content || '')
    const is_public = body.is_public ? 1 : 0
    const writeup_mode = body.writeup_mode || 'journal'
    const cve_id = sanitizeText(body.cve_id || '') || null
    const cve_product = sanitizeText(body.cve_product || '') || null
    const cve_version = sanitizeText(body.cve_version || '') || null
    const cve_cwe = sanitizeText(body.cve_cwe || '') || null
    const cve_cvss_score = body.cve_cvss_score !== undefined ? body.cve_cvss_score : null
    const cve_cvss_vector = sanitizeText(body.cve_cvss_vector || '') || null
    const cve_cvss_severity = sanitizeText(body.cve_cvss_severity || '') || null
    const cve_impact = sanitizeHtml(body.cve_impact || '')
    const cve_poc = sanitizeHtml(body.cve_poc || '')
    const cve_remediation = sanitizeHtml(body.cve_remediation || '')
    const is_encrypted = body.is_encrypted ? 1 : 0
    const encryption_salt = body.encryption_salt || null
    const encryption_iv = body.encryption_iv || null
    const attack_chain = body.attack_chain || null
    const folder_id = body.folder_id !== undefined ? body.folder_id : null
    const is_starred = body.is_starred ? 1 : 0
    const checklist_state = body.checklist_state || null

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
        title, platform, difficulty,
        tags, content, is_public,
        writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
        cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
        cve_impact, cve_poc, cve_remediation,
        is_encrypted, encryption_salt, encryption_iv, attack_chain,
        folder_id, is_starred, checklist_state,
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
