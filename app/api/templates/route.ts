import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

// GET /api/templates - Get templates based on scope (personal or team)
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope') || 'personal'
    const teamIdStr = searchParams.get('team_id')

    if (scope === 'team') {
      if (!teamIdStr) {
        return NextResponse.json({ error: 'team_id is required for team scope' }, { status: 400 })
      }
      const teamId = Number(teamIdStr)

      // Verify membership and team is not archived
      const [teamCheck]: any = await pool.query(
        `SELECT t.is_archived, tm.role 
         FROM teams t 
         JOIN team_members tm ON t.id = tm.team_id 
         WHERE t.id = ? AND tm.user_id = ?`,
        [teamId, user.id]
      )

      if (teamCheck.length === 0) {
        return NextResponse.json({ error: 'Forbidden: not a team member' }, { status: 403 })
      }

      if (teamCheck[0].is_archived === 1) {
        return NextResponse.json({ error: 'Team is archived' }, { status: 400 })
      }

      // Fetch team templates
      const [rows]: any = await pool.query(
        'SELECT * FROM templates WHERE team_id = ? ORDER BY created_at DESC',
        [teamId]
      )
      return NextResponse.json({ templates: rows })
    } else {
      // Personal scope: builtin templates (is_builtin = 1) or user's personal templates (user_id = user.id AND team_id IS NULL)
      const [rows]: any = await pool.query(
        'SELECT * FROM templates WHERE is_builtin = 1 OR (user_id = ? AND team_id IS NULL) ORDER BY created_at DESC',
        [user.id]
      )
      return NextResponse.json({ templates: rows })
    }
  } catch (err) {
    console.error('[TEMPLATES_GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/templates - Create a new user or team template
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, description, writeup_mode, template_data, team_id } = await req.json()
    if (!name || !template_data) {
      return NextResponse.json({ error: 'Name and template data are required' }, { status: 400 })
    }

    let targetTeamId: number | null = null

    if (team_id) {
      targetTeamId = Number(team_id)

      // Verify requester has owner/editor role and team not archived
      const [teamCheck]: any = await pool.query(
        `SELECT t.is_archived, tm.role 
         FROM teams t 
         JOIN team_members tm ON t.id = tm.team_id 
         WHERE t.id = ? AND tm.user_id = ?`,
        [targetTeamId, user.id]
      )

      if (teamCheck.length === 0 || (teamCheck[0].role !== 'owner' && teamCheck[0].role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden: insufficient privileges to create team templates' }, { status: 403 })
      }

      if (teamCheck[0].is_archived === 1) {
        return NextResponse.json({ error: 'Team is archived' }, { status: 400 })
      }
    }

    const [result]: any = await pool.query(
      `INSERT INTO templates (user_id, name, description, writeup_mode, template_data, is_builtin, team_id) 
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        user.id,
        name,
        description || '',
        writeup_mode || 'journal',
        typeof template_data === 'string' ? template_data : JSON.stringify(template_data),
        targetTeamId
      ]
    )

    return NextResponse.json({
      message: 'Template created successfully',
      id: result.insertId
    }, { status: 201 })
  } catch (err) {
    console.error('[TEMPLATES_POST]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
