import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

async function checkFolderOwner(folderId: number, userId: number) {
  const [rows]: any = await pool.query(
    'SELECT * FROM folders WHERE id = ? AND user_id = ?',
    [folderId, userId]
  )
  return (rows as any[])[0] || null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const folder = await checkFolderOwner(Number(id), user.id)
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const { name, parent_id, color, icon, sort_order } = await req.json()
    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    await pool.query(
      'UPDATE folders SET name = ?, parent_id = ?, color = ?, icon = ?, sort_order = ? WHERE id = ? AND user_id = ?',
      [
        name,
        parent_id !== undefined ? parent_id : folder.parent_id,
        color || folder.color,
        icon || folder.icon,
        sort_order !== undefined ? sort_order : folder.sort_order,
        Number(id),
        user.id
      ]
    )

    return NextResponse.json({ message: 'Folder updated successfully' })
  } catch (err) {
    console.error('[FOLDER_PUT]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const folder = await checkFolderOwner(Number(id), user.id)
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Safe delete: Nullify folder_id for all writeups in this folder
    await pool.query(
      'UPDATE writeups SET folder_id = NULL WHERE folder_id = ? AND user_id = ?',
      [Number(id), user.id]
    )

    // Delete the folder itself
    await pool.query(
      'DELETE FROM folders WHERE id = ? AND user_id = ?',
      [Number(id), user.id]
    )

    return NextResponse.json({ message: 'Folder deleted successfully' })
  } catch (err) {
    console.error('[FOLDER_DELETE]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
