import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { addXP } from '@/lib/gamification'
import { sanitizeText, sanitizeHtml } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const teamIdStr = searchParams.get('team_id')

    let query = ''
    let queryParams: any[] = []

    if (teamIdStr) {
      const teamId = Number(teamIdStr)
      // Verify team membership
      const [teamCheck]: any = await pool.query(
        `SELECT tm.role, t.is_archived 
         FROM team_members tm 
         JOIN teams t ON tm.team_id = t.id 
         WHERE tm.team_id = ? AND tm.user_id = ?`,
        [teamId, payload.id]
      )
      if (teamCheck.length === 0 || teamCheck[0].is_archived === 1) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      query = `SELECT e.id, e.name, e.client, e.scope, e.status, e.start_date, e.end_date, e.created_at, e.team_id 
               FROM engagements e 
               JOIN teams t ON e.team_id = t.id
               WHERE e.team_id = ? AND t.is_archived = 0`
      queryParams.push(teamId)
    } else {
      query = `
        SELECT e.id, e.name, e.client, e.scope, e.status, e.start_date, e.end_date, e.created_at, e.team_id 
        FROM engagements e
        LEFT JOIN teams t ON e.team_id = t.id
        WHERE (e.team_id IS NULL AND e.user_id = ?)
           OR (e.team_id IS NOT NULL AND t.is_archived = 0 AND e.team_id IN (
             SELECT team_id FROM team_members WHERE user_id = ?
           ))
      `
      queryParams.push(payload.id, payload.id)
    }

    // Count query for pagination
    let countQuery = ''
    if (teamIdStr) {
      countQuery = `SELECT COUNT(*) as total FROM engagements e JOIN teams t ON e.team_id = t.id WHERE e.team_id = ? AND t.is_archived = 0`
    } else {
      countQuery = `
        SELECT COUNT(*) as total FROM engagements e
        LEFT JOIN teams t ON e.team_id = t.id
        WHERE (e.team_id IS NULL AND e.user_id = ?)
           OR (e.team_id IS NOT NULL AND t.is_archived = 0 AND e.team_id IN (
             SELECT team_id FROM team_members WHERE user_id = ?
           ))
      `
    }
    const [countRows]: any = await pool.query(countQuery, queryParams)
    const total = countRows[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    const selectParams = [...queryParams, limit, offset]

    const [rows]: any = await pool.query(query, selectParams)

    return NextResponse.json({ 
      engagements: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (err: any) {
    console.error('[GET ENGAGEMENTS ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch engagements' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, client, scope, status, start_date, end_date, team_id } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Engagement name is required' }, { status: 400 })
    }

    let targetTeamId: number | null = null
    if (team_id !== undefined && team_id !== null) {
      targetTeamId = Number(team_id)
      const [teamCheck]: any = await pool.query(
        `SELECT tm.role, t.is_archived 
         FROM team_members tm 
         JOIN teams t ON tm.team_id = t.id 
         WHERE tm.team_id = ? AND tm.user_id = ?`,
        [targetTeamId, payload.id]
      )
      if (teamCheck.length === 0 || teamCheck[0].is_archived === 1) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (teamCheck[0].role !== 'owner' && teamCheck[0].role !== 'editor') {
        return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
      }
    }

    const sanitizedName = sanitizeText(name.trim())
    const sanitizedClient = sanitizeText(client || '')
    const sanitizedScope = sanitizeHtml(scope || '')
    const sanitizedStatus = sanitizeText(status || 'scoping')

    const [result]: any = await pool.query(
      `INSERT INTO engagements (user_id, name, client, scope, status, start_date, end_date, team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        sanitizedName,
        sanitizedClient,
        sanitizedScope,
        sanitizedStatus,
        start_date || null,
        end_date || null,
        targetTeamId
      ]
    )

    await addXP(payload.id, 100) // 100 XP for launching/creating an engagement!

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 })
  } catch (err: any) {
    console.error('[POST ENGAGEMENTS ERROR]', err)
    return NextResponse.json({ error: 'Failed to create engagement' }, { status: 500 })
  }
}
