import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [rows]: any = await pool.query(
    'SELECT id, username, email, avatar, xp, ai_provider, ai_endpoint, language, created_at FROM users WHERE id = ?', [payload.id]
  )
  const user = (rows as any[])[0]
  if (!user)
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  // Get user achievements
  const [achievements]: any = await pool.query('SELECT achievement_key FROM user_achievements WHERE user_id = ?', [payload.id])
  user.achievements = achievements.map((a: any) => a.achievement_key)

  return NextResponse.json({ user })
}

export async function PUT(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { language, ai_provider, ai_endpoint } = await req.json()

    await pool.query(
      `UPDATE users 
       SET language = ?, ai_provider = ?, ai_endpoint = ?
       WHERE id = ?`,
      [language || 'id', ai_provider || null, ai_endpoint || null, payload.id]
    )

    return NextResponse.json({ success: true, message: 'Settings updated successfully' })
  } catch (err: any) {
    console.error('[PUT ME ERROR]', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
