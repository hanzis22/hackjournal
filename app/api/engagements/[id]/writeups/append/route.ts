import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { sanitizeHtml } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

async function checkEngagementAccess(engagementId: number, userId: number) {
  const [rows]: any = await pool.query('SELECT * FROM engagements WHERE id = ?', [engagementId])
  if (rows.length === 0) return null

  const engagement = rows[0]
  if (engagement.team_id !== null) {
    const [memberRows]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [engagement.team_id, userId]
    )
    if (memberRows.length > 0) {
      return { allowed: true, engagement, role: memberRows[0].role }
    }
  } else {
    if (engagement.user_id === userId) {
      return { allowed: true, engagement, role: 'owner' }
    }
  }

  return { allowed: false }
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
    const engagementId = Number((await params).id)
    const access = await checkEngagementAccess(engagementId, payload.id)
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Engagement not found or access denied' }, { status: 404 })
    }

    const { text } = await req.json()
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text payload is required' }, { status: 400 })
    }

    const cleanAppendContent = sanitizeHtml(text)

    // Check if there is an active draft writeup for this engagement
    const [writeupRows]: any = await pool.query(
      "SELECT id, content FROM writeups WHERE engagement_id = ? AND status = 'draft' ORDER BY created_at DESC LIMIT 1",
      [engagementId]
    )

    let writeupId: number
    let currentContent = ''

    if (writeupRows.length > 0) {
      writeupId = writeupRows[0].id
      currentContent = writeupRows[0].content || ''
    } else {
      // Automatically create a new draft writeup for this engagement
      const defaultTitle = `Draft Writeup - ${access.engagement.name || 'Engagement'}`
      const [insertResult]: any = await pool.query(
        `INSERT INTO writeups (title, user_id, team_id, engagement_id, content, status, platform, difficulty, tags)
         VALUES (?, ?, ?, ?, '', 'draft', 'Custom', 'Easy', '')`,
        [defaultTitle, payload.id, access.engagement.team_id, engagementId]
      )
      writeupId = insertResult.insertId
    }

    // Append the formatted command log to the content (adding spacing)
    const spacer = currentContent ? '<br/><br/>' : ''
    const updatedContent = currentContent + spacer + cleanAppendContent

    await pool.query(
      "UPDATE writeups SET content = ? WHERE id = ?",
      [updatedContent, writeupId]
    )

    return NextResponse.json({
      success: true,
      message: 'Content successfully appended to writeup draft',
      writeupId
    })
  } catch (err: any) {
    console.error('[APPEND WRITEUP ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to append to writeup draft' }, { status: 500 })
  }
}
