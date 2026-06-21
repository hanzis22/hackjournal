import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { sanitizeHtml } from '@/lib/sanitize'
import { matchCommentAnchor } from '@/lib/commentAnchor'
import { createNotification } from '@/lib/notification'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number((await params).id)
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // 1. Fetch writeup details to verify access and get content
    const [writeupRows]: any = await pool.query(
      'SELECT id, user_id, team_id, content FROM writeups WHERE id = ?',
      [id]
    )

    if (writeupRows.length === 0) {
      return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
    }

    const writeup = writeupRows[0]

    // Access check
    if (writeup.team_id !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [writeup.team_id, payload.id]
      )
      if (memberRows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (writeup.user_id !== payload.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 2. Count total comments
    const [countRows]: any = await pool.query(
      'SELECT COUNT(*) as total FROM writeup_comments WHERE writeup_id = ?',
      [id]
    )
    const total = countRows[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    // 3. Fetch paginated comments
    const [comments]: any = await pool.query(
      `SELECT c.*, u.username, u.avatar 
       FROM writeup_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.writeup_id = ?
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    )

    // 4. Calculate is_orphaned dynamically
    const normalizedComments = comments.map((c: any) => {
      const match = matchCommentAnchor(
        writeup.content || '',
        c.anchor_quote,
        c.anchor_prefix,
        c.anchor_suffix
      )
      return {
        ...c,
        is_orphaned: match.is_orphaned
      }
    })

    // Fetch muted threads for the current user
    const [mutedRows]: any = await pool.query(
      'SELECT comment_id FROM muted_threads WHERE user_id = ?',
      [payload.id]
    )
    const mutedThreadIds = mutedRows.map((r: any) => r.comment_id)

    return NextResponse.json({
      comments: normalizedComments,
      mutedThreadIds,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (err: any) {
    console.error('[GET COMMENTS ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number((await params).id)
    const { content, parent_comment_id, anchor_quote, anchor_prefix, anchor_suffix, is_muted, is_task, task_assignee_id } = await req.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Komentar tidak boleh kosong' }, { status: 400 })
    }

    // 1. Fetch writeup details to verify access
    const [writeupRows]: any = await pool.query(
      'SELECT id, user_id, team_id, title FROM writeups WHERE id = ?',
      [id]
    )

    if (writeupRows.length === 0) {
      return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
    }

    const writeup = writeupRows[0]

    // Access check
    if (writeup.team_id !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [writeup.team_id, payload.id]
      )
      if (memberRows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (writeup.user_id !== payload.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 2. Validate parent comment if provided
    let parentCommentId: number | null = null
    if (parent_comment_id) {
      parentCommentId = Number(parent_comment_id)
      const [parentCheck]: any = await pool.query(
        'SELECT id, writeup_id FROM writeup_comments WHERE id = ?',
        [parentCommentId]
      )
      if (parentCheck.length === 0 || parentCheck[0].writeup_id !== id) {
        return NextResponse.json({ error: 'Komentar induk tidak valid' }, { status: 400 })
      }
    }

    // Sanitize input HTML content
    const sanitizedContent = sanitizeHtml(content)
    const sanitizedQuote = anchor_quote ? sanitizeHtml(anchor_quote) : null
    const sanitizedPrefix = anchor_prefix ? sanitizeHtml(anchor_prefix) : null
    const sanitizedSuffix = anchor_suffix ? sanitizeHtml(anchor_suffix) : null

    // 3. Save comment to database
    const [insertResult]: any = await pool.query(
      `INSERT INTO writeup_comments (writeup_id, user_id, parent_comment_id, content, anchor_quote, anchor_prefix, anchor_suffix, is_muted, is_task, task_assignee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.id,
        parentCommentId,
        sanitizedContent,
        sanitizedQuote,
        sanitizedPrefix,
        sanitizedSuffix,
        is_muted ? 1 : 0,
        is_task ? 1 : 0,
        task_assignee_id ? Number(task_assignee_id) : null
      ]
    )

    // 4. Trigger Notifications
    // Notify task assignee if it's a task
    if (is_task && task_assignee_id) {
      await createNotification(
        Number(task_assignee_id),
        'task_assignment',
        `Tugas baru di "${writeup.title}"`,
        `Anda telah diberikan tugas di laporan "${writeup.title}"`,
        `/dashboard/${writeup.id}`
      )
    }

    // Notify writeup owner
    if (writeup.user_id !== payload.id) {
      await createNotification(
        writeup.user_id,
        'comment',
        `Komentar baru di "${writeup.title}"`,
        `@${payload.username} mengomentari laporan Anda`,
        `/dashboard/${writeup.id}`
      )
    }

    // Notify parent comment author
    if (parentCommentId) {
      const [parentComment]: any = await pool.query(
        'SELECT user_id, is_muted FROM writeup_comments WHERE id = ?',
        [parentCommentId]
      )
      if (parentComment.length > 0) {
        const parentUser = parentComment[0].user_id
        if (parentUser !== payload.id && parentUser !== writeup.user_id && parentComment[0].is_muted === 0) {
          await createNotification(
            parentUser,
            'comment_reply',
            `Balasan komentar di "${writeup.title}"`,
            `@${payload.username} membalas komentar Anda`,
            `/dashboard/${writeup.id}`,
            parentCommentId
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      commentId: insertResult.insertId,
      message: 'Komentar berhasil ditambahkan'
    }, { status: 201 })
  } catch (err: any) {
    console.error('[POST COMMENT ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
