import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { sanitizeText } from '@/lib/sanitize'

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

    const sanitizedName = sanitizeText(name)
    const sanitizedColor = sanitizeText(color || '#7F77DD')
    const sanitizedIcon = sanitizeText(icon || '📁')

    const [result]: any = await pool.query(
      'INSERT INTO folders (user_id, name, parent_id, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user.id,
        sanitizedName,
        parent_id !== undefined ? parent_id : null,
        sanitizedColor,
        sanitizedIcon,
        sort_order || 0
      ]
    )

    return NextResponse.json({
      message: 'Folder created successfully',
      folder: {
        id: result.insertId,
        user_id: user.id,
        name: sanitizedName,
        parent_id: parent_id || null,
        color: sanitizedColor,
        icon: sanitizedIcon,
        sort_order: sort_order || 0
      }
    }, { status: 201 })
  } catch (err) {
    console.error('[FOLDERS_POST]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
