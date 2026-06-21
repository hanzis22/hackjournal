import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(
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
      return NextResponse.json({ error: 'Forbidden: only owner can export team data' }, { status: 403 })
    }

    // Query all writeups for the team
    const [writeups]: any = await pool.query(
      "SELECT * FROM writeups WHERE team_id = ? ORDER BY created_at DESC",
      [teamId]
    )

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `team-${teamId}-export-${dateStr}.json`

    return new NextResponse(JSON.stringify(writeups, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('[EXPORT TEAM ERROR]', err)
    return NextResponse.json({ error: 'Gagal mengekspor data tim' }, { status: 500 })
  }
}
