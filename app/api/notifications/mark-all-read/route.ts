import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [payload.id]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[POST MARK ALL READ ERROR]', err)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
