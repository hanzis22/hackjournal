import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // Basic stats
    const [totalWriteups]: any = await pool.query('SELECT COUNT(*) as count FROM writeups')
    const totalCount = totalWriteups[0]?.count || 0

    // Difficulty breakdown
    const [diffStats]: any = await pool.query(`
      SELECT difficulty, COUNT(*) as count 
      FROM writeups 
      WHERE difficulty IS NOT NULL 
      GROUP BY difficulty
    `)
    
    // Mode breakdown
    const [modeStats]: any = await pool.query(`
      SELECT writeup_mode, COUNT(*) as count 
      FROM writeups 
      GROUP BY writeup_mode
    `)

    // Top platforms
    const [platformStats]: any = await pool.query(`
      SELECT platform, COUNT(*) as count 
      FROM writeups 
      WHERE platform != '' 
      GROUP BY platform 
      ORDER BY count DESC 
      LIMIT 5
    `)

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const [recentActivity]: any = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM writeups
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [thirtyDaysAgo])

    // Top Tags
    // We'll need to split comma separated tags, so let's just fetch all tags and do it in JS since MySQL doesn't natively split well
    const [allTagsRows]: any = await pool.query('SELECT tags FROM writeups WHERE tags IS NOT NULL AND tags != ""')
    const tagCounts: Record<string, number> = {}
    allTagsRows.forEach((row: { tags: string }) => {
      row.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      success: true,
      data: {
        totalWriteups: totalCount,
        difficulty: diffStats,
        modes: modeStats,
        platforms: platformStats,
        activity: recentActivity,
        topTags
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
