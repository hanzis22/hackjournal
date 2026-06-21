import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

async function checkVaultReadAccess(id: number, userId: number) {
  const [rows]: any = await pool.query(
    'SELECT user_id, team_id FROM vault_entries WHERE id = ?',
    [id]
  )
  if (rows.length === 0) return null

  const entry = rows[0]
  if (entry.team_id !== null) {
    // Check if user is a member of the team (any role can read)
    const [memberRows]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [entry.team_id, userId]
    )
    if (memberRows.length > 0) {
      return { allowed: true }
    }
  }

  // Fallback to original owner for personal vault entries
  if (entry.user_id === userId) {
    return { allowed: true }
  }

  return { allowed: false }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number((await params).id)
    const access = await checkVaultReadAccess(id, payload.id)
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Vault entry not found or unauthorized' }, { status: 404 })
    }

    const { action } = await req.json()
    if (!action || (action !== 'revealed' && action !== 'copied')) {
      return NextResponse.json({ error: "Invalid action. Must be 'revealed' or 'copied'" }, { status: 400 })
    }

    await pool.query(
      'INSERT INTO vault_audit_logs (vault_entry_id, user_id, action) VALUES (?, ?, ?)',
      [id, payload.id, action]
    )

    return NextResponse.json({ success: true, message: 'Event logged successfully' })
  } catch (err: any) {
    console.error('[POST VAULT AUDIT ERROR]', err)
    return NextResponse.json({ error: 'Failed to log vault action' }, { status: 500 })
  }
}
