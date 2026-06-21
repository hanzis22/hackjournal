import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's email
    const [userRow]: any = await pool.query(
      'SELECT email FROM users WHERE id = ?',
      [payload.id]
    )

    if (userRow.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email = userRow[0].email

    // Find pending, unexpired invites
    const [invites]: any = await pool.query(
      `SELECT ti.id, ti.team_id, ti.role, ti.token, ti.created_at, t.name as team_name, u.username as invited_by_username
       FROM team_invites ti
       JOIN teams t ON ti.team_id = t.id
       JOIN users u ON ti.invited_by = u.id
       WHERE LOWER(ti.email) = LOWER(?) AND ti.status = 'pending' AND ti.expires_at > NOW()`,
      [email]
    )

    return NextResponse.json({ invites })
  } catch (err: any) {
    console.error('[GET MY INVITES ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}
