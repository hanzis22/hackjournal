import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

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
      'SELECT id, email, status FROM team_invites WHERE token = ?',
      [token]
    )

    if (inviteRows.length === 0) {
      return NextResponse.json({ error: 'Undangan tidak ditemukan' }, { status: 404 })
    }

    const invite = inviteRows[0]

    // Fetch current user details
    const [userRows]: any = await pool.query(
      'SELECT email FROM users WHERE id = ?',
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

    // Revoke the invite
    await pool.query(
      "UPDATE team_invites SET status = 'revoked' WHERE id = ?",
      [invite.id]
    )

    return NextResponse.json({ success: true, message: 'Undangan ditolak' })
  } catch (err: any) {
    console.error('[DECLINE INVITE ERROR]', err)
    return NextResponse.json({ error: 'Gagal menolak undangan' }, { status: 500 })
  }
}
