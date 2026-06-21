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
    
    // Check if requester is a member of the team
    const [perm]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, payload.id]
    )
    if (perm.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // Rate Limit: 20 invites per hour per team
    const { checkRateLimit } = await import('@/lib/rateLimit')
    const { limited } = await checkRateLimit(`team:${teamId}`, 'invite')
    if (limited) {
      return NextResponse.json({ error: 'Batas limit pengiriman undangan tercapai (maks 20/jam)' }, { status: 429 })
    }

    // Check if requester is owner/editor of the team
    const [teamRows]: any = await pool.query(
      "SELECT name, owner_id FROM teams WHERE id = ?",
      [teamId]
    )

    if (teamRows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const team = teamRows[0]

    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || (perm[0].role !== 'owner' && perm[0].role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    const ALLOWED_INVITE_ROLES = ['editor', 'viewer']
    const safeRole = ALLOWED_INVITE_ROLES.includes(role) ? role : 'viewer'

    // Determine target email
    let targetEmail = usernameOrEmail.trim()
    let targetUser: any = null

    // If usernameOrEmail doesn't contain '@', treat as username to search email
    if (!targetEmail.includes('@')) {
      const [uRows]: any = await pool.query(
        "SELECT id, email, username FROM users WHERE username = ?",
        [targetEmail]
      )
      if (uRows.length > 0) {
        targetUser = uRows[0]
        targetEmail = targetUser.email
      } else {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      }
    } else {
      // Find user by email
      const [uRows]: any = await pool.query(
        "SELECT id, email, username FROM users WHERE email = ?",
        [targetEmail]
      )
      if (uRows.length > 0) {
        targetUser = uRows[0]
      }
    }

    // Check if already in team
    if (targetUser) {
      const [existing]: any = await pool.query(
        "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, targetUser.id]
      )
      if (existing.length > 0) {
        return NextResponse.json({ error: 'User sudah menjadi anggota tim ini' }, { status: 400 })
      }
    }

    // Generate secure token and expiry (7 days)
    const crypto = await import('crypto')
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Check if pending invite already exists
    const [existingInvite]: any = await pool.query(
      "SELECT id FROM team_invites WHERE team_id = ? AND LOWER(email) = LOWER(?) AND status = 'pending'",
      [teamId, targetEmail]
    )

    if (existingInvite.length > 0) {
      // Update existing invite
      await pool.query(
        "UPDATE team_invites SET token = ?, expires_at = ?, role = ?, invited_by = ? WHERE id = ?",
        [token, expiresAt, safeRole, payload.id, existingInvite[0].id]
      )
    } else {
      // Insert new invite
      await pool.query(
        "INSERT INTO team_invites (team_id, email, role, invited_by, token, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        [teamId, targetEmail, safeRole, payload.id, token, expiresAt]
      )
    }

    // Send email
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const inviteUrl = `${origin}/invite/accept?token=${token}`
    const { sendInviteEmail } = await import('@/lib/email')
    await sendInviteEmail(targetEmail, {
      teamName: team.name,
      inviteUrl
    })

    // If user is registered, send in-app notification
    if (targetUser) {
      const { createNotification } = await import('@/lib/notification')
      await createNotification(
        targetUser.id,
        'team_invite_received',
        'Undangan Tim Baru',
        `Anda diundang untuk bergabung dengan tim ${team.name} as ${safeRole}.`,
        `/dashboard/teams`
      )
    }

    // Trigger webhook team_invite_sent for owner
    const { triggerWebhooks } = await import('@/lib/webhook')
    await triggerWebhooks(team.owner_id, 'team_invite_sent', {
      email: targetEmail,
      teamName: team.name,
    })

    return NextResponse.json({ success: true, status: 'pending', message: 'Undangan terkirim' })
  } catch (err: any) {
    console.error('[POST MEMBER ERROR]', err)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
