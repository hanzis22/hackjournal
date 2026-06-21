import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { sanitizeText } from '@/lib/sanitize'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const teamId = (await params).id
    const { name } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama tim tidak boleh kosong' }, { status: 400 })
    }

    const cleanName = sanitizeText(name.trim())

    // Check if requester is owner of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || perm[0].role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owner can rename team' }, { status: 403 })
    }

    // Update team name
    await pool.query(
      "UPDATE teams SET name = ? WHERE id = ?",
      [cleanName, teamId]
    )

    return NextResponse.json({ success: true, message: 'Nama tim berhasil diubah' })
  } catch (err: any) {
    console.error('[RENAME TEAM ERROR]', err)
    return NextResponse.json({ error: 'Gagal mengubah nama tim' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const teamId = (await params).id

    // Check if requester is owner of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || perm[0].role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owner can delete team' }, { status: 403 })
    }

    // Check writeups count
    const [writeupsCountRow]: any = await pool.query(
      "SELECT COUNT(*) as total FROM writeups WHERE team_id = ?",
      [teamId]
    )
    const totalWriteups = writeupsCountRow[0]?.total || 0

    if (totalWriteups > 0) {
      return NextResponse.json({
        error: `Gagal menghapus tim: masih terdapat ${totalWriteups} laporan terikat dengan tim ini. Silakan ekspor data lalu hapus semua laporan terlebih dahulu.`,
        writeupsCount: totalWriteups
      }, { status: 409 })
    }

    // Delete the team (FK cascade will handle team_members and team_invites)
    await pool.query(
      "DELETE FROM teams WHERE id = ?",
      [teamId]
    )

    return NextResponse.json({ success: true, message: 'Tim berhasil dihapus' })
  } catch (err: any) {
    console.error('[DELETE TEAM ERROR]', err)
    return NextResponse.json({ error: 'Gagal menghapus tim' }, { status: 500 })
  }
}
