import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { createNotification } from '@/lib/notification'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const teamId = (await params).id
    const { newOwnerUserId } = await req.json()

    if (!newOwnerUserId) {
      return NextResponse.json({ error: 'newOwnerUserId is required' }, { status: 400 })
    }

    // Check if requester is owner of the team
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

    if (perm.length === 0 || perm[0].role !== 'owner' || team.owner_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden: only team owner can transfer ownership' }, { status: 403 })
    }

    // Validate that newOwnerUserId is a member of the team
    const [memberRows]: any = await pool.query(
      "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, newOwnerUserId]
    )

    if (memberRows.length === 0) {
      return NextResponse.json({ error: 'Target user is not a member of this team' }, { status: 400 })
    }

    // Perform role swap and owner_id update in transaction
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Set old owner to editor in team_members
      await connection.query(
        "UPDATE team_members SET role = 'editor' WHERE team_id = ? AND user_id = ?",
        [teamId, payload.id]
      )

      // Set new owner to owner in team_members
      await connection.query(
        "UPDATE team_members SET role = 'owner' WHERE team_id = ? AND user_id = ?",
        [teamId, newOwnerUserId]
      )

      // Update owner_id in teams
      await connection.query(
        "UPDATE teams SET owner_id = ? WHERE id = ?",
        [newOwnerUserId, teamId]
      )

      await connection.commit()
    } catch (txErr) {
      await connection.rollback()
      throw txErr
    } finally {
      connection.release()
    }

    // Send in-app notification to new owner
    await createNotification(
      newOwnerUserId,
      'team_ownership_transferred',
      'Kepemilikan Tim Ditransfer',
      `Anda sekarang adalah pemilik dari tim ${team.name}.`,
      `/dashboard?tab=tim`
    )

    return NextResponse.json({ success: true, message: 'Kepemilikan berhasil ditransfer' })
  } catch (err: any) {
    console.error('[TRANSFER OWNERSHIP ERROR]', err)
    return NextResponse.json({ error: 'Gagal mentransfer kepemilikan tim' }, { status: 500 })
  }
}
