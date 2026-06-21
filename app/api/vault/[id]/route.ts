import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

async function checkVaultAccess(id: number, userId: number) {
  const [rows]: any = await pool.query(
    'SELECT user_id, team_id FROM vault_entries WHERE id = ?',
    [id]
  )
  if (rows.length === 0) return null

  const entry = rows[0]
  if (entry.team_id !== null) {
    // If it belongs to a team, any owner/editor of that team can update/delete
    const [memberRows]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [entry.team_id, userId]
    )
    if (memberRows.length > 0 && (memberRows[0].role === 'owner' || memberRows[0].role === 'editor')) {
      return { allowed: true }
    }
  }

  // Fallback to original owner
  if (entry.user_id === userId) {
    return { allowed: true }
  }

  return { allowed: false }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const id = Number((await params).id)
    const access = await checkVaultAccess(id, payload.id)
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Vault entry not found or unauthorized' }, { status: 404 })
    }

    await pool.query('DELETE FROM vault_entries WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: 'Vault entry deleted successfully' })
  } catch (err: any) {
    console.error('[DELETE VAULT ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete vault entry' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const id = Number((await params).id)
    const access = await checkVaultAccess(id, payload.id)
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Vault entry not found or unauthorized' }, { status: 404 })
    }

    const { label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_in_hours, team_id, engagement_id } = await req.json()
    if (!label || !encrypted_data || !encryption_iv || !encryption_salt) {
      return NextResponse.json({ error: 'Missing required encrypted fields' }, { status: 400 })
    }

    let targetTeamId = team_id !== undefined && team_id !== null ? Number(team_id) : null
    let targetEngagementId = engagement_id !== undefined && engagement_id !== null ? Number(engagement_id) : null

    // If changing team context, validate roles
    if (targetTeamId !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [targetTeamId, payload.id]
      )
      if (memberRows.length === 0 || (memberRows[0].role !== 'owner' && memberRows[0].role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden: hanya Owner atau Editor yang dapat mengelola item vault tim' }, { status: 403 })
      }
    }

    let expiresAt = null
    if (expires_in_hours) {
      expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + Number(expires_in_hours))
    }

    await pool.query(
      `UPDATE vault_entries SET 
        label = ?, category = ?, encrypted_data = ?, encryption_iv = ?, encryption_salt = ?, 
        notes = ?, expires_at = ?, team_id = ?, engagement_id = ?
       WHERE id = ?`,
      [
        label,
        category || 'credential',
        encrypted_data,
        encryption_iv,
        encryption_salt,
        notes || '',
        expiresAt,
        targetTeamId,
        targetEngagementId,
        id
      ]
    )

    return NextResponse.json({ success: true, message: 'Vault entry updated successfully' })
  } catch (err: any) {
    console.error('[PUT VAULT ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to update vault entry' }, { status: 500 })
  }
}
