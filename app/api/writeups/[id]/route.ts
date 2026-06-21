import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { triggerWebhooks } from '@/lib/webhook'
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize'

async function getWriteupWithAccess(id: number, userId: number) {
  const [rows]: any = await pool.query('SELECT * FROM writeups WHERE id = ?', [id])
  const writeup = (rows as any[])[0] || null
  if (!writeup) return null

  if (writeup.team_id === null) {
    if (writeup.user_id !== userId) return null
    return { writeup, role: 'owner' }
  }

  const [memberRows]: any = await pool.query(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
    [writeup.team_id, userId]
  )
  if (memberRows.length === 0) {
    return null
  }
  return { writeup, role: memberRows[0].role }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const access = await getWriteupWithAccess(Number(id), payload.id)
  if (!access) return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })

  return NextResponse.json({ writeup: access.writeup })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const access = await getWriteupWithAccess(Number(id), payload.id)
  if (!access) return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })

  const { writeup, role } = access
  if (role !== 'owner' && role !== 'editor') {
    return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
  }

  try {
    const body = await req.json()

    const currentStatus = writeup.status || 'draft'
    if (currentStatus !== 'draft') {
      return NextResponse.json({ error: 'Laporan terkunci. Hubungi Owner untuk mengembalikan status ke Draft sebelum mengedit.' }, { status: 400 })
    }

    // SEC-02: Server-side sanitization
    const title = sanitizeText(body.title || writeup.title)
    const platform = sanitizeText(body.platform || 'Custom')
    const difficulty = sanitizeText(body.difficulty || 'Easy')
    const tags = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitizeText(t)).join(',') : sanitizeText(body.tags || '')
    const content = sanitizeHtml(body.content || '')
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
    const attack_chain = body.attack_chain || null
    const folder_id = body.folder_id !== undefined ? body.folder_id : null
    const is_starred = body.is_starred ? 1 : 0
    const checklist_state = body.checklist_state || null

    const engagement_id = body.engagement_id !== undefined ? (body.engagement_id !== null ? Number(body.engagement_id) : null) : writeup.engagement_id
    const global_severity = body.global_severity || writeup.global_severity || 'None'

    // Validate global_severity enum values
    const allowedSeverities = ['Critical', 'High', 'Medium', 'Low', 'Info', 'None']
    if (!allowedSeverities.includes(global_severity)) {
      return NextResponse.json({ error: 'Severity rating tidak valid' }, { status: 400 })
    }

    // Validate engagement_id ownership / team matching
    if (engagement_id !== null && engagement_id !== writeup.engagement_id) {
      const [engRows]: any = await pool.query(
        'SELECT team_id, user_id FROM engagements WHERE id = ?',
        [engagement_id]
      )
      if (engRows.length === 0) {
        return NextResponse.json({ error: 'Engagement tidak ditemukan' }, { status: 404 })
      }
      const engagement = engRows[0]
      if (writeup.team_id !== null) {
        if (engagement.team_id !== writeup.team_id) {
          return NextResponse.json({ error: 'Engagement tidak cocok dengan tim' }, { status: 400 })
        }
      } else {
        if (engagement.team_id !== null || engagement.user_id !== payload.id) {
          return NextResponse.json({ error: 'Forbidden: engagement bukan milik Anda' }, { status: 403 })
        }
      }
    }

    let is_public = writeup.is_public
    let is_encrypted = writeup.is_encrypted
    let encryption_salt = writeup.encryption_salt
    let encryption_iv = writeup.encryption_iv

    // Editors cannot modify public and encryption settings
    if (role === 'owner') {
      is_public = body.is_public ? 1 : 0
      is_encrypted = body.is_encrypted ? 1 : 0
      encryption_salt = body.encryption_salt || null
      encryption_iv = body.encryption_iv || null
    }

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
        folder_id=?, is_starred=?, checklist_state=?, engagement_id=?, global_severity=?,
        updated_at=NOW()
       WHERE id = ?`,
      [
        title, platform, difficulty,
        tags, content, is_public,
        writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
        cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
        cve_impact, cve_poc, cve_remediation,
        is_encrypted, encryption_salt, encryption_iv, attack_chain,
        folder_id, is_starred, checklist_state, engagement_id, global_severity,
        Number(id)
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
  const access = await getWriteupWithAccess(Number(id), payload.id)
  if (!access) return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })

  const { role } = access
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
  }

  await pool.query('DELETE FROM writeups WHERE id = ?', [Number(id)])
  return NextResponse.json({ message: 'Writeup berhasil dihapus' })
}
