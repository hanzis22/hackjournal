import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope')
    const teamIdStr = searchParams.get('team_id')

    let query = `SELECT id, label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_at, created_at, team_id, engagement_id FROM vault_entries `
    let queryParams: any[] = []

    if (scope === 'team') {
      if (!teamIdStr) {
        return NextResponse.json({ error: 'team_id wajib disertakan untuk scope team' }, { status: 400 })
      }
      const teamId = Number(teamIdStr)
      // Validate requester is a member of the team
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [teamId, payload.id]
      )
      if (memberRows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      query += `WHERE team_id = ? ORDER BY created_at DESC`
      queryParams.push(teamId)
    } else {
      // Personal vault
      query += `WHERE user_id = ? AND team_id IS NULL ORDER BY created_at DESC`
      queryParams.push(payload.id)
    }

    const [vaultEntries]: any = await pool.query(query, queryParams)

    // filter out expired entries
    const now = new Date()
    const activeEntries = vaultEntries.filter((entry: any) => {
      if (!entry.expires_at) return true
      return new Date(entry.expires_at) > now
    })

    return NextResponse.json({ vault: activeEntries })
  } catch (err: any) {
    console.error('[GET VAULT ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch vault entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_in_hours, team_id, engagement_id } = await req.json()
    if (!label || !encrypted_data || !encryption_iv || !encryption_salt) {
      return NextResponse.json({ error: 'Missing required encrypted fields' }, { status: 400 })
    }

    let targetTeamId = team_id !== undefined && team_id !== null ? Number(team_id) : null
    let targetEngagementId = engagement_id !== undefined && engagement_id !== null ? Number(engagement_id) : null

    // Validate that the user is an owner/editor of the team before creating a shared vault item
    if (targetTeamId !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [targetTeamId, payload.id]
      )
      if (memberRows.length === 0 || (memberRows[0].role !== 'owner' && memberRows[0].role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden: hanya Owner atau Editor yang dapat membuat item vault tim' }, { status: 403 })
      }
    }

    let expiresAt = null
    if (expires_in_hours) {
      expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + Number(expires_in_hours))
    }

    const [result]: any = await pool.query(
      `INSERT INTO vault_entries (user_id, label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_at, team_id, engagement_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        label,
        category || 'credential',
        encrypted_data,
        encryption_iv,
        encryption_salt,
        notes || '',
        expiresAt,
        targetTeamId,
        targetEngagementId
      ]
    )

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 })
  } catch (err: any) {
    console.error('[POST VAULT ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to save vault entry' }, { status: 500 })
  }
}
