import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const id = (await params).id

    const [existing]: any = await pool.query(
      'SELECT id FROM vault_entries WHERE id = ? AND user_id = ?',
      [id, payload.id]
    )

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Vault entry not found or unauthorized' }, { status: 404 })
    }

    await pool.query('DELETE FROM vault_entries WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: 'Vault entry deleted successfully' })
  } catch (err: any) {
    console.error('[DELETE VAULT ERROR]', err)
    return NextResponse.json({ error: 'Failed to delete vault entry' }, { status: 500 })
  }
}
