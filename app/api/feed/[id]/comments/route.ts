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
    const writeupId = (await params).id
    const [comments]: any = await pool.query(`
      SELECT i.id, i.content, i.created_at, u.username, u.avatar
      FROM interactions i
      JOIN users u ON i.user_id = u.id
      WHERE i.writeup_id = ? AND i.type = 'comment'
      ORDER BY i.created_at ASC
    `, [writeupId])

    return NextResponse.json({ comments })
  } catch (err: any) {
    console.error('[GET COMMENTS ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}
