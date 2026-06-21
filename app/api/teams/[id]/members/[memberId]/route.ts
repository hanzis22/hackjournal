import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { createNotification } from '@/lib/notification'
import { triggerWebhooks } from '@/lib/webhook'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: teamId, memberId } = await params

    // Check if requester is owner of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || perm[0].role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owner can remove members' }, { status: 403 })
    }

    // Validate that memberId belongs to teamId
    const [memberRows]: any = await pool.query(
      "SELECT tm.id, tm.user_id, tm.role, u.username, t.name as team_name, t.owner_id FROM team_members tm JOIN users u ON tm.user_id = u.id JOIN teams t ON tm.team_id = t.id WHERE tm.id = ? AND tm.team_id = ?",
      [memberId, teamId]
    )

    if (memberRows.length === 0) {
      return NextResponse.json({ error: 'Member not found in this team' }, { status: 404 })
    }

    const member = memberRows[0]

    // Cannot remove self
    if (member.user_id === payload.id) {
      return NextResponse.json({ error: 'Cannot remove yourself. Use Leave Team or Transfer Ownership.' }, { status: 400 })
    }

    // Cannot remove other owner
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove another owner' }, { status: 400 })
    }

    // Delete from team_members
    await pool.query(
      "DELETE FROM team_members WHERE id = ?",
      [memberId]
    )

    // Emit kill-switch event to force disconnect the user's WebSocket session
    try {
      const { killSwitchEmitter } = await import('@/lib/kill-switch')
      killSwitchEmitter.emit('force_disconnect', { userId: member.user_id })
    } catch (e) {
      console.error('Failed to emit force_disconnect event:', e)
    }

    // Notify the removed member
    await createNotification(
      member.user_id,
      'team_member_removed',
      'Dikeluarkan dari Tim',
      `Anda telah dikeluarkan dari tim ${member.team_name}.`,
      `/dashboard?tab=tim`
    )

    // Trigger webhook for owner
    await triggerWebhooks(member.owner_id, 'team_member_removed', {
      username: member.username,
      teamName: member.team_name,
    })

    return NextResponse.json({ success: true, message: 'Anggota berhasil dihapus' })
  } catch (err: any) {
    console.error('[DELETE MEMBER ERROR]', err)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: teamId, memberId } = await params
    const { role } = await req.json()

    const ALLOWED_ROLES = ['editor', 'viewer']
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 })
    }

    // Check if requester is owner of the team
    const [perm]: any = await pool.query(
      "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, payload.id]
    )

    if (perm.length === 0 || perm[0].role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owner can change roles' }, { status: 403 })
    }

    // Validate that memberId belongs to teamId
    const [memberRows]: any = await pool.query(
      "SELECT tm.id, tm.user_id, tm.role, t.name as team_name FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE tm.id = ? AND tm.team_id = ?",
      [memberId, teamId]
    )

    if (memberRows.length === 0) {
      return NextResponse.json({ error: 'Member not found in this team' }, { status: 404 })
    }

    const member = memberRows[0]

    // Update role
    await pool.query(
      "UPDATE team_members SET role = ? WHERE id = ?",
      [role, memberId]
    )

    // Notify the updated user
    await createNotification(
      member.user_id,
      'team_member_role_changed',
      'Peran Tim Diubah',
      `Peran Anda di tim ${member.team_name} telah diubah menjadi ${role}.`,
      `/dashboard?tab=tim`
    )

    return NextResponse.json({ success: true, message: 'Role berhasil diubah' })
  } catch (err: any) {
    console.error('[PATCH MEMBER ERROR]', err)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}
