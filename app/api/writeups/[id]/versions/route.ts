import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const [rows]: any = await pool.query(
      'SELECT id, created_at, title FROM writeup_versions WHERE writeup_id = ? AND user_id = ? ORDER BY created_at DESC',
      [Number(id), payload.id]
    )

    return NextResponse.json({ versions: rows })
  } catch (err) {
    console.error('[GET VERSIONS]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
