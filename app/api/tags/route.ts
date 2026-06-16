import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Select tags from user's writeups
    const [rows]: any = await pool.query(
      'SELECT tags FROM writeups WHERE user_id = ? AND tags IS NOT NULL AND tags != ""',
      [user.id]
    )

    const tagCounts: Record<string, number> = {}
    rows.forEach((row: any) => {
      const list = row.tags.split(',')
      list.forEach((t: string) => {
        const clean = t.trim()
        if (clean) {
          tagCounts[clean] = (tagCounts[clean] || 0) + 1
        }
      })
    })

    const tagsArray = Object.entries(tagCounts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

    return NextResponse.json({ tags: tagsArray })
  } catch (err) {
    console.error('[TAGS_GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
