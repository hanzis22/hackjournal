import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { triggerWebhooks } from '@/lib/webhook'

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { status } = await req.json()
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const currentStatus = writeup.status || 'draft'
    const newStatus = status

    if (newStatus === currentStatus) {
      return NextResponse.json({ success: true, message: 'Status tidak berubah' })
    }

    // Validate role permissions for transition
    if (role === 'editor') {
      if (currentStatus !== 'draft' || newStatus !== 'in_review') {
        return NextResponse.json({ error: 'Forbidden: editor hanya dapat mengajukan review dari status draft' }, { status: 403 })
      }
    } else if (role === 'owner') {
      const allowedStatuses = ['draft', 'in_review', 'approved', 'completed']
      if (!allowedStatuses.includes(newStatus)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }
    }

    // Approval Guard: block approval if there are unresolved tasks
    if (role === 'owner' && newStatus === 'approved' && currentStatus !== 'approved') {
      const [taskRows]: any = await pool.query(
        'SELECT COUNT(*) as unresolvedCount FROM writeup_comments WHERE writeup_id = ? AND is_task = 1 AND is_resolved = 0',
        [writeup.id]
      )
      const unresolvedCount = taskRows[0]?.unresolvedCount || 0
      if (unresolvedCount > 0) {
        return NextResponse.json(
          { error: `Gagal menyetujui laporan. Terdapat ${unresolvedCount} tugas yang belum diselesaikan.` },
          { status: 409 }
        )
      }
    }

    let reviewer_id = writeup.reviewer_id
    if (role === 'owner' && currentStatus === 'in_review' && newStatus === 'approved') {
      reviewer_id = payload.id
    } else if (newStatus === 'draft') {
      reviewer_id = null
    }

    // Save previous version history before status update
    const previousSnapshot = JSON.stringify(writeup)
    await pool.query(
      `INSERT INTO writeup_versions (writeup_id, user_id, title, content, full_snapshot) VALUES (?, ?, ?, ?, ?)`,
      [writeup.id, payload.id, writeup.title, writeup.content, previousSnapshot]
    )

    // Perform only status and reviewer_id updates, strictly ignoring any content payloads
    await pool.query(
      `UPDATE writeups SET status = ?, reviewer_id = ?, updated_at = NOW() WHERE id = ?`,
      [newStatus, reviewer_id, writeup.id]
    )

    // Trigger webhooks for status updates
    triggerWebhooks(payload.id, 'writeup_updated', { id: writeup.id, title: writeup.title, difficulty: writeup.difficulty, status: newStatus })

    return NextResponse.json({ success: true, message: 'Status writeup berhasil diperbarui' })
  } catch (err: any) {
    console.error('[PATCH WRITEUP STATUS]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
