import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

import { sanitizeText } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [teams]: any = await pool.query(`
      SELECT t.id, t.name, t.owner_id, tm.role, u.username as owner_name,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as members_count
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      JOIN users u ON t.owner_id = u.id
      WHERE tm.user_id = ?
    `, [payload.id])

    return NextResponse.json({ teams })
  } catch (err: any) {
    console.error('[GET TEAMS ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await pool.getConnection()
  try {
    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const sanitizedName = sanitizeText(name.trim())

    await conn.beginTransaction()

    const [result]: any = await conn.query(
      'INSERT INTO teams (name, owner_id) VALUES (?, ?)',
      [sanitizedName, payload.id]
    )
    const teamId = result.insertId

    // Add creator as owner member
    await conn.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'owner')",
      [teamId, payload.id]
    )

    await conn.commit()

    return NextResponse.json({ success: true, teamId }, { status: 201 })
  } catch (err: any) {
    await conn.rollback()
    console.error('[POST TEAMS ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to create team' }, { status: 500 })
  } finally {
    conn.release()
  }
}
