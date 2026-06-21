import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    const [notifs]: any = await pool.query(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [payload.id, limit, offset]
    )

    const [countRow]: any = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [payload.id]
    )
    const total = countRow[0]?.total || 0

    // Also get the total unread count for badge display
    const [unreadRow]: any = await pool.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [payload.id]
    )
    const unreadCount = unreadRow[0]?.unread || 0

    return NextResponse.json({
      notifications: notifs,
      total,
      unreadCount,
      page,
      limit,
    })
  } catch (err: any) {
    console.error('[GET NOTIFICATIONS ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
