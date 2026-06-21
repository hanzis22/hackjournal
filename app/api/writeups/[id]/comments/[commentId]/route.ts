import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { sanitizeHtml } from '@/lib/sanitize'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number((await params).id)
    const commentId = Number((await params).commentId)

    // 1. Fetch target comment
    const [commentRows]: any = await pool.query(
      'SELECT * FROM writeup_comments WHERE id = ?',
      [commentId]
    )

    if (commentRows.length === 0) {
      return NextResponse.json({ error: 'Komentar tidak ditemukan' }, { status: 404 })
    }

    const comment = commentRows[0]

    // BOLA validation: Ensure comment belongs to the specified writeup in URL
    if (comment.writeup_id !== id) {
      return NextResponse.json({ error: 'ID komentar tidak cocok dengan ID writeup' }, { status: 404 })
    }

    // 2. Fetch writeup for permission checking
    const [writeupRows]: any = await pool.query(
      'SELECT id, user_id, team_id FROM writeups WHERE id = ?',
      [id]
    )

    if (writeupRows.length === 0) {
      return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
    }

    const writeup = writeupRows[0]

    let isTeamMember = false
    if (writeup.team_id !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [writeup.team_id, payload.id]
      )
      if (memberRows.length > 0) {
        isTeamMember = true
      }
    } else {
      isTeamMember = writeup.user_id === payload.id
    }

    if (!isTeamMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Process fields
    const body = await req.json()
    const { content, is_resolved, is_muted } = body

    const updateFields: string[] = []
    const updateParams: any[] = []

    if (content !== undefined) {
      // Content edit is author-only
      if (comment.user_id !== payload.id) {
        return NextResponse.json({ error: 'Hanya pembuat komentar yang dapat mengedit isi komentar' }, { status: 403 })
      }
      if (!content.trim()) {
        return NextResponse.json({ error: 'Isi komentar tidak boleh kosong' }, { status: 400 })
      }
      updateFields.push('content = ?')
      updateParams.push(sanitizeHtml(content))
    }

    if (is_resolved !== undefined) {
      updateFields.push('is_resolved = ?')
      updateParams.push(is_resolved ? 1 : 0)
    }

    if (is_muted !== undefined) {
      updateFields.push('is_muted = ?')
      updateParams.push(is_muted ? 1 : 0)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 })
    }

    updateParams.push(commentId)
    await pool.query(
      `UPDATE writeup_comments SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    return NextResponse.json({ success: true, message: 'Komentar berhasil diperbarui' })
  } catch (err: any) {
    console.error('[PATCH COMMENT ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number((await params).id)
    const commentId = Number((await params).commentId)

    // 1. Fetch target comment
    const [commentRows]: any = await pool.query(
      'SELECT * FROM writeup_comments WHERE id = ?',
      [commentId]
    )

    if (commentRows.length === 0) {
      return NextResponse.json({ error: 'Komentar tidak ditemukan' }, { status: 404 })
    }

    const comment = commentRows[0]

    // BOLA validation: Ensure comment belongs to the specified writeup in URL
    if (comment.writeup_id !== id) {
      return NextResponse.json({ error: 'ID komentar tidak cocok dengan ID writeup' }, { status: 404 })
    }

    // 2. Fetch writeup for permission checking
    const [writeupRows]: any = await pool.query(
      'SELECT id, user_id, team_id FROM writeups WHERE id = ?',
      [id]
    )

    if (writeupRows.length === 0) {
      return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
    }

    const writeup = writeupRows[0]

    let isTeamOwner = false
    let isAuthor = comment.user_id === payload.id

    if (writeup.team_id !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [writeup.team_id, payload.id]
      )
      if (memberRows.length > 0 && memberRows[0].role === 'owner') {
        isTeamOwner = true
      }
    } else {
      isTeamOwner = writeup.user_id === payload.id
    }

    // Author only or team owner
    if (!isAuthor && !isTeamOwner) {
      return NextResponse.json({ error: 'Forbidden: Anda tidak memiliki akses untuk menghapus komentar ini' }, { status: 403 })
    }

    await pool.query('DELETE FROM writeup_comments WHERE id = ?', [commentId])

    return NextResponse.json({ success: true, message: 'Komentar berhasil dihapus' })
  } catch (err: any) {
    console.error('[DELETE COMMENT ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
