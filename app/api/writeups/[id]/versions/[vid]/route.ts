import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string, vid: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, vid } = await params

  try {
    const [rows]: any = await pool.query(
      'SELECT full_snapshot FROM writeup_versions WHERE id = ? AND writeup_id = ? AND user_id = ?',
      [Number(vid), Number(id), payload.id]
    )

    if (!rows[0]) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json({ snapshot: JSON.parse(rows[0].full_snapshot) })
  } catch (err) {
    console.error('[GET VERSION DETAILS]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
