import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const notifId = (await params).id

    // Check if notification exists and belongs to the user
    const [notif]: any = await pool.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notifId, payload.id]
    )

    if (notif.length === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [notifId]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[POST READ NOTIFICATION ERROR]', err)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
