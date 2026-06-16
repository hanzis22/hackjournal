import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const teamId = (await params).id
    const [members]: any = await pool.query(`
      SELECT tm.id, tm.role, tm.joined_at, u.id as user_id, u.username, u.email, u.avatar
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `, [teamId])

    return NextResponse.json({ members })
  } catch (err: any) {
    console.error('[GET MEMBERS ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const teamId = (await params).id
    const { usernameOrEmail, role } = await req.json()

    if (!usernameOrEmail) {
      return NextResponse.json({ error: 'Username or Email is required' }, { status: 400 })
    }

    // Check if requester is owner/editor of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || (perm[0].role !== 'owner' && perm[0].role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    // Find the target user
    const [userRows]: any = await pool.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [usernameOrEmail.trim(), usernameOrEmail.trim()]
    )

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetUserId = userRows[0].id

    // Check if already in team
    const [existing]: any = await pool.query(
      "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, targetUserId]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 })
    }

    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
      [teamId, targetUserId, role || 'viewer']
    )

    return NextResponse.json({ success: true, message: 'Member added successfully' })
  } catch (err: any) {
    console.error('[POST MEMBER ERROR]', err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}
