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

    // Check if requester is a member of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0) {
      return NextResponse.json({ error: 'Forbidden: you are not a member of this team' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Fetch paginated activities
    const [activities]: any = await pool.query(
      `SELECT wv.id, wv.created_at, wv.title, w.id as writeup_id, w.title as current_title, u.username
       FROM writeup_versions wv
       JOIN writeups w ON wv.writeup_id = w.id
       JOIN users u ON wv.user_id = u.id
       WHERE w.team_id = ?
       ORDER BY wv.created_at DESC
       LIMIT ? OFFSET ?`,
      [teamId, limit, offset]
    )

    // Count total activities
    const [countRow]: any = await pool.query(
      `SELECT COUNT(*) as total
       FROM writeup_versions wv
       JOIN writeups w ON wv.writeup_id = w.id
       WHERE w.team_id = ?`,
      [teamId]
    )
    const total = countRow[0]?.total || 0

    return NextResponse.json({
      activities,
      total,
      page,
      limit,
    })
  } catch (err: any) {
    console.error('[GET TEAM ACTIVITY ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch team activity' }, { status: 500 })
  }
}
