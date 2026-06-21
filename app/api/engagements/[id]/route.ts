import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { addXP, awardAchievement } from '@/lib/gamification'
import { sanitizeText, sanitizeHtml } from '@/lib/sanitize'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getTokenFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = (await params).id

    const [rows]: any = await pool.query(
      'SELECT * FROM engagements WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const engagement = rows[0]

    // Authorization check
    if (engagement.team_id !== null) {
      // Team-linked engagement: must be member of the active team
      const [teamMember]: any = await pool.query(
        `SELECT tm.role, t.is_archived 
         FROM team_members tm 
         JOIN teams t ON tm.team_id = t.id 
         WHERE tm.team_id = ? AND tm.user_id = ?`,
        [engagement.team_id, user.id]
      )
      if (teamMember.length === 0 || teamMember[0].is_archived === 1) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // Personal engagement: must be owner
      if (engagement.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ engagement })
  } catch (err: any) {
    console.error('[GET ENGAGEMENT ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch engagement' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getTokenFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = (await params).id
    const { status, name, client, scope, start_date, end_date, team_id } = await req.json()

    // 1. Fetch existing engagement
    const [existing]: any = await pool.query(
      'SELECT * FROM engagements WHERE id = ?',
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const engagement = existing[0]

    // 2. Validate update permission on existing engagement
    let hasEditAccess = false
    if (engagement.user_id === user.id) {
      hasEditAccess = true
    } else if (engagement.team_id !== null) {
      const [teamMember]: any = await pool.query(
        `SELECT role FROM team_members WHERE team_id = ? AND user_id = ?`,
        [engagement.team_id, user.id]
      )
      if (teamMember.length > 0 && (teamMember[0].role === 'owner' || teamMember[0].role === 'editor')) {
        hasEditAccess = true
      }
    }

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    // 3. If re-assigning to/modifying a team_id, validate target team
    let targetTeamId: number | null = null
    if (team_id) {
      targetTeamId = Number(team_id)
      const [targetCheck]: any = await pool.query(
        `SELECT t.is_archived, tm.role 
         FROM teams t 
         JOIN team_members tm ON t.id = tm.team_id 
         WHERE t.id = ? AND tm.user_id = ?`,
        [targetTeamId, user.id]
      )

      if (targetCheck.length === 0 || (targetCheck[0].role !== 'owner' && targetCheck[0].role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden: cannot assign to a team you do not manage' }, { status: 403 })
      }
      if (targetCheck[0].is_archived === 1) {
        return NextResponse.json({ error: 'Team is archived' }, { status: 400 })
      }
    }

    const sanitizedName = sanitizeText(name || engagement.name)
    const sanitizedClient = sanitizeText(client || '')
    const sanitizedScope = sanitizeHtml(scope || '')
    const sanitizedStatus = sanitizeText(status || 'scoping')

    await pool.query(
      `UPDATE engagements 
       SET name = ?, client = ?, scope = ?, status = ?, start_date = ?, end_date = ?, team_id = ?
       WHERE id = ?`,
      [
        sanitizedName,
        sanitizedClient,
        sanitizedScope,
        sanitizedStatus,
        start_date || null,
        end_date || null,
        targetTeamId,
        id
      ]
    )

    // Gamification: completing an engagement gives 200 XP and unlocks 'engagement_master' achievement!
    if (sanitizedStatus === 'complete' && engagement.status !== 'complete') {
      await addXP(user.id, 200)
      await awardAchievement(user.id, 'engagement_master')
    }

    return NextResponse.json({ success: true, message: 'Engagement updated successfully' })
  } catch (err: any) {
    console.error('[PUT ENGAGEMENT ERROR]', err)
    return NextResponse.json({ error: 'Failed to update engagement' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getTokenFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = (await params).id

    const [rows]: any = await pool.query(
      'SELECT * FROM engagements WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const engagement = rows[0]

    // Validate delete permission
    let hasDeleteAccess = false
    if (engagement.user_id === user.id) {
      hasDeleteAccess = true
    } else if (engagement.team_id !== null) {
      const [teamMember]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [engagement.team_id, user.id]
      )
      if (teamMember.length > 0 && teamMember[0].role === 'owner') {
        hasDeleteAccess = true
      }
    }

    if (!hasDeleteAccess) {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    // Safety guard: check if any writeups are associated
    const [writeupsCountRow]: any = await pool.query(
      'SELECT COUNT(*) as total FROM writeups WHERE engagement_id = ?',
      [id]
    )
    const count = writeupsCountRow[0]?.total || 0

    if (count > 0) {
      return NextResponse.json({
        error: `Gagal menghapus: terdapat ${count} laporan yang terikat dengan engagement ini.`,
        writeupsCount: count
      }, { status: 409 })
    }

    await pool.query('DELETE FROM engagements WHERE id = ?', [id])
    return NextResponse.json({ success: true, message: 'Engagement deleted successfully' })
  } catch (err: any) {
    console.error('[DELETE ENGAGEMENT ERROR]', err)
    return NextResponse.json({ error: 'Failed to delete engagement' }, { status: 500 })
  }
}
