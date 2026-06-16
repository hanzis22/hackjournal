import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { addXP } from '@/lib/gamification'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Select public writeups (non-encrypted) and join user details
    const [writeups]: any = await pool.query(`
      SELECT w.id, w.title, w.platform, w.difficulty, w.tags, w.created_at, w.writeup_mode, w.cve_id, w.cve_cvss_score, w.cve_cvss_severity,
             u.username, w.content,
             (SELECT COUNT(*) FROM interactions WHERE writeup_id = w.id AND type = 'upvote') as upvotes,
             (SELECT COUNT(*) FROM interactions WHERE writeup_id = w.id AND type = 'comment') as comments_count,
             EXISTS(SELECT 1 FROM interactions WHERE writeup_id = w.id AND user_id = ? AND type = 'upvote') as has_upvoted
      FROM writeups w
      JOIN users u ON w.user_id = u.id
      WHERE w.is_public = 1 AND w.is_encrypted = 0
      ORDER BY w.created_at DESC
    `, [payload.id])

    return NextResponse.json({ writeups })
  } catch (err: any) {
    console.error('[GET FEED ERROR]', err)
    return NextResponse.json({ error: 'Failed to fetch public feed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { writeupId, type, content } = await req.json()
    if (!writeupId || !type) {
      return NextResponse.json({ error: 'Missing writeupId or type' }, { status: 400 })
    }

    if (type === 'upvote') {
      // Check if already upvoted
      const [existing]: any = await pool.query(
        "SELECT id FROM interactions WHERE user_id = ? AND writeup_id = ? AND type = 'upvote'",
        [payload.id, writeupId]
      )

      if (existing.length > 0) {
        // Toggle/remove upvote
        await pool.query(
          "DELETE FROM interactions WHERE user_id = ? AND writeup_id = ? AND type = 'upvote'",
          [payload.id, writeupId]
        )
        return NextResponse.json({ success: true, action: 'removed' })
      } else {
        await pool.query(
          "INSERT INTO interactions (user_id, writeup_id, type) VALUES (?, ?, 'upvote')",
          [payload.id, writeupId]
        )

        // Award XP to the author of the writeup
        const [authorRows]: any = await pool.query('SELECT user_id FROM writeups WHERE id = ?', [writeupId])
        if (authorRows.length > 0) {
          const authorId = authorRows[0].user_id
          if (authorId !== payload.id) {
            await addXP(authorId, 10) // 10 XP for getting upvoted
          }
        }

        return NextResponse.json({ success: true, action: 'added' })
      }
    } else if (type === 'comment') {
      if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 })
      }

      await pool.query(
        "INSERT INTO interactions (user_id, writeup_id, type, content) VALUES (?, ?, 'comment', ?)",
        [payload.id, writeupId, content.trim()]
      )

      // Award XP to commenter
      await addXP(payload.id, 15) // 15 XP for commenting/sharing feedback

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 })
  } catch (err: any) {
    console.error('[POST FEED INTERACTION ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
