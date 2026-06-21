import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const commentId = Number((await params).commentId)
    const { mute } = await req.json()

    if (mute) {
      await pool.query(
        'INSERT IGNORE INTO muted_threads (user_id, comment_id) VALUES (?, ?)',
        [payload.id, commentId]
      )
    } else {
      await pool.query(
        'DELETE FROM muted_threads WHERE user_id = ? AND comment_id = ?',
        [payload.id, commentId]
      )
    }

    return NextResponse.json({ success: true, muted: mute })
  } catch (err: any) {
    console.error('[COMMENT MUTE ERROR]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
