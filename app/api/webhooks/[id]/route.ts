import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await pool.query('DELETE FROM webhooks WHERE id = ? AND user_id = ?', [Number(id), payload.id])
    return NextResponse.json({ message: 'Webhook deleted' })
  } catch (err) {
    console.error('[DELETE WEBHOOK]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
