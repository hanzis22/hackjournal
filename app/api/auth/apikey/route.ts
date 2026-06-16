import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [rows]: any = await pool.query('SELECT api_key FROM users WHERE id = ?', [payload.id])
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ api_key: rows[0].api_key })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Generate secure random string for API Key
    const newApiKey = `hj_live_${crypto.randomBytes(24).toString('hex')}`

    await pool.query('UPDATE users SET api_key = ? WHERE id = ?', [newApiKey, payload.id])
    return NextResponse.json({ success: true, api_key: newApiKey })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await pool.query('UPDATE users SET api_key = NULL WHERE id = ?', [payload.id])
    return NextResponse.json({ success: true, message: 'API Key revoked' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
