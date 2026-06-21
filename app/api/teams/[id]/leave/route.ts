import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const teamId = (await params).id

    // Check membership and role
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0) {
      return NextResponse.json({ error: 'Anda bukan anggota tim ini' }, { status: 400 })
    }

    if (perm[0].role === 'owner') {
      return NextResponse.json({ error: 'Owner tidak bisa keluar dari tim. Silakan transfer kepemilikan terlebih dahulu.' }, { status: 400 })
    }

    // Delete membership
    await pool.query(
      "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    return NextResponse.json({ success: true, message: 'Berhasil keluar dari tim' })
  } catch (err: any) {
    console.error('[LEAVE TEAM ERROR]', err)
    return NextResponse.json({ error: 'Gagal keluar dari tim' }, { status: 500 })
  }
}
