import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [vaultEntries]: any = await pool.query(
      `SELECT id, label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_at, created_at 
       FROM vault_entries 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [payload.id]
    )

    // filter out expired entries
    const now = new Date()
    const activeEntries = vaultEntries.filter((entry: any) => {
      if (!entry.expires_at) return true
      return new Date(entry.expires_at) > now
    })

    return NextResponse.json({ vault: activeEntries })
  } catch (err: any) {
    console.error('[GET VAULT ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch vault entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_in_hours } = await req.json()
    if (!label || !encrypted_data || !encryption_iv || !encryption_salt) {
      return NextResponse.json({ error: 'Missing required encrypted fields' }, { status: 400 })
    }

    let expiresAt = null
    if (expires_in_hours) {
      expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + Number(expires_in_hours))
    }

    const [result]: any = await pool.query(
      `INSERT INTO vault_entries (user_id, label, category, encrypted_data, encryption_iv, encryption_salt, notes, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        label,
        category || 'credential',
        encrypted_data,
        encryption_iv,
        encryption_salt,
        notes || '',
        expiresAt
      ]
    )

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 })
  } catch (err: any) {
    console.error('[POST VAULT ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to save vault entry' }, { status: 500 })
  }
}
