import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { addXP } from '@/lib/gamification'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [engagements]: any = await pool.query(
      'SELECT id, name, client, scope, status, start_date, end_date, created_at FROM engagements WHERE user_id = ? ORDER BY created_at DESC',
      [payload.id]
    )

    return NextResponse.json({ engagements })
  } catch (err: any) {
    console.error('[GET ENGAGEMENTS ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch engagements' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, client, scope, status, start_date, end_date } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Engagement name is required' }, { status: 400 })
    }

    const [result]: any = await pool.query(
      `INSERT INTO engagements (user_id, name, client, scope, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        name.trim(),
        client || '',
        scope || '',
        status || 'scoping',
        start_date || null,
        end_date || null
      ]
    )

    await addXP(payload.id, 100) // 100 XP for launching/creating an engagement!

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 })
  } catch (err: any) {
    console.error('[POST ENGAGEMENTS ERROR]', err)
    return NextResponse.json({ error: 'Failed to create engagement' }, { status: 500 })
  }
}
