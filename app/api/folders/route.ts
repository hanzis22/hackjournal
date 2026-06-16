import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [rows]: any = await pool.query(
      'SELECT * FROM folders WHERE user_id = ? ORDER BY sort_order ASC, name ASC',
      [user.id]
    )

    return NextResponse.json({ folders: rows })
  } catch (err) {
    console.error('[FOLDERS_GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, parent_id, color, icon, sort_order } = await req.json()
    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const [result]: any = await pool.query(
      'INSERT INTO folders (user_id, name, parent_id, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user.id,
        name,
        parent_id !== undefined ? parent_id : null,
        color || '#7F77DD',
        icon || '📁',
        sort_order || 0
      ]
    )

    return NextResponse.json({
      message: 'Folder created successfully',
      folder: {
        id: result.insertId,
        user_id: user.id,
        name,
        parent_id: parent_id || null,
        color: color || '#7F77DD',
        icon: icon || '📁',
        sort_order: sort_order || 0
      }
    }, { status: 201 })
  } catch (err) {
    console.error('[FOLDERS_POST]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
