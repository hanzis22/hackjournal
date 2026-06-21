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

    // Check if requester is owner/editor of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || (perm[0].role !== 'owner' && perm[0].role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    // Get pending invites
    const [invites]: any = await pool.query(
      `SELECT ti.id, ti.email, ti.role, ti.created_at, ti.expires_at, u.username as invited_by_username
       FROM team_invites ti
       JOIN users u ON ti.invited_by = u.id
       WHERE ti.team_id = ? AND ti.status = 'pending' AND ti.expires_at > NOW()`,
      [teamId]
    )

    return NextResponse.json({ invites })
  } catch (err: any) {
    console.error('[GET TEAM INVITES ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}
