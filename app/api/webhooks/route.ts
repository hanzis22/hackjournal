import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC',
      [payload.id]
    )
    return NextResponse.json({ webhooks: rows })
  } catch (err) {
    console.error('[GET WEBHOOKS]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, url, platform, events, is_active } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const [res]: any = await pool.query(
      'INSERT INTO webhooks (user_id, name, url, platform, events, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [payload.id, name || 'My Webhook', url, platform || 'custom', events || 'writeup_created,writeup_updated', is_active !== false ? 1 : 0]
    )
    return NextResponse.json({ id: res.insertId, message: 'Webhook created' }, { status: 201 })
  } catch (err) {
    console.error('[POST WEBHOOK]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
