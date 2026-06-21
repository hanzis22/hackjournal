import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: teamId, inviteId } = await params

    // Check if requester is owner/editor of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || (perm[0].role !== 'owner' && perm[0].role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    // Validate that inviteId belongs to teamId
    const [invite]: any = await pool.query(
      'SELECT id, status FROM team_invites WHERE id = ? AND team_id = ?',
      [inviteId, teamId]
    )

    if (invite.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Revoke the invite
    await pool.query(
      "UPDATE team_invites SET status = 'revoked' WHERE id = ?",
      [inviteId]
    )

    return NextResponse.json({ success: true, message: 'Undangan dibatalkan' })
  } catch (err: any) {
    console.error('[DELETE INVITE ERROR]', err)
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
  }
}
