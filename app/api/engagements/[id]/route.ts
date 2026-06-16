import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { addXP, awardAchievement } from '@/lib/gamification'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const id = (await params).id
    const { status, name, client, scope, start_date, end_date } = await req.json()

    // Verify ownership
    const [existing]: any = await pool.query(
      'SELECT id, status FROM engagements WHERE id = ? AND user_id = ?',
      [id, payload.id]
    )

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Engagement not found or unauthorized' }, { status: 404 })
    }

    const currentStatus = existing[0].status

    await pool.query(
      `UPDATE engagements 
       SET name = ?, client = ?, scope = ?, status = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [name, client, scope, status, start_date || null, end_date || null, id]
    )

    // Gamification: completing an engagement gives 200 XP and unlocks 'engagement_master' achievement!
    if (status === 'complete' && currentStatus !== 'complete') {
      await addXP(payload.id, 200)
      await awardAchievement(payload.id, 'engagement_master')
    }

    return NextResponse.json({ success: true, message: 'Engagement updated successfully' })
  } catch (err: any) {
    console.error('[PUT ENGAGEMENT ERROR]', err)
    return NextResponse.json({ error: 'Failed to update engagement' }, { status: 500 })
  }
}
