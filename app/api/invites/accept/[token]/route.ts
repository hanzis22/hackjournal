import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { createNotification } from '@/lib/notification'
import { triggerWebhooks } from '@/lib/webhook'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const token = (await params).token

    // Fetch the invite details
    const [inviteRows]: any = await pool.query(
      `SELECT ti.*, t.name as team_name, t.owner_id
       FROM team_invites ti
       JOIN teams t ON ti.team_id = t.id
       WHERE ti.token = ?`,
      [token]
    )

    if (inviteRows.length === 0) {
      return NextResponse.json({ error: 'Undangan tidak ditemukan' }, { status: 404 })
    }

    const invite = inviteRows[0]

    // Fetch current user details
    const [userRows]: any = await pool.query(
      'SELECT email, username FROM users WHERE id = ?',
      [payload.id]
    )
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    const currentUser = userRows[0]

    // Check email match (case-insensitive)
    if (currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: 'Email akun tidak cocok dengan undangan' }, { status: 403 })
    }

    // Check status
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Undangan sudah ${invite.status}` }, { status: 400 })
    }

    // Check expiry
    if (new Date(invite.expires_at) <= new Date()) {
      // Update status to expired
      await pool.query(
        "UPDATE team_invites SET status = 'expired' WHERE id = ?",
        [invite.id]
      )
      return NextResponse.json({ error: 'Undangan sudah kedaluwarsa' }, { status: 400 })
    }

    // Check if already a member
    const [existingMember]: any = await pool.query(
      'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?',
      [invite.team_id, payload.id]
    )

    if (existingMember.length > 0) {
      // Auto accept since already a member
      await pool.query(
        "UPDATE team_invites SET status = 'accepted' WHERE id = ?",
        [invite.id]
      )
      return NextResponse.json({ success: true, message: 'Anda sudah bergabung ke tim ini' })
    }

    // Wrap joining in transaction
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Insert into team_members
      await connection.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
        [invite.team_id, payload.id, invite.role]
      )

      // Update invite status
      await connection.query(
        "UPDATE team_invites SET status = 'accepted' WHERE id = ?",
        [invite.id]
      )

      await connection.commit()
    } catch (txErr) {
      await connection.rollback()
      throw txErr
    } finally {
      connection.release()
    }

    // Send in-app notification to team owner
    await createNotification(
      invite.owner_id,
      'team_member_joined',
      'Anggota Tim Baru',
      `User ${currentUser.username} telah menerima undangan dan bergabung ke tim ${invite.team_name}.`,
      `/dashboard?tab=tim`
    )

    // Trigger webhook for owner
    await triggerWebhooks(invite.owner_id, 'team_member_joined', {
      username: currentUser.username,
      teamName: invite.team_name,
    })

    return NextResponse.json({ success: true, message: 'Berhasil bergabung ke tim!' })
  } catch (err: any) {
    console.error('[ACCEPT INVITE ERROR]', err)
    return NextResponse.json({ error: 'Gagal menerima undangan' }, { status: 500 })
  }
}
