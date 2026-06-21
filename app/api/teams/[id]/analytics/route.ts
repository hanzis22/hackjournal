import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const teamId = Number((await params).id)

    // 1. Verify membership
    const [memberCheck]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, payload.id]
    )
    if (memberCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch all team members
    const [members]: any = await pool.query(
      `SELECT tm.user_id, tm.role, u.username, u.email 
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [teamId]
    )

    // 3. Fetch all writeups and resolving comment counts associated with the team
    const [writeups]: any = await pool.query(
      `SELECT id, user_id, global_severity, reviewer_id, tags, writeup_mode, cve_cwe 
       FROM writeups 
       WHERE team_id = ?`,
      [teamId]
    )

    // Fetch comment/tasks data
    const [comments]: any = await pool.query(
      `SELECT wc.user_id, wc.task_assignee_id, wc.is_task, wc.is_resolved 
       FROM writeup_comments wc
       JOIN writeups w ON wc.writeup_id = w.id
       WHERE w.team_id = ?`,
      [teamId]
    )

    // 4. Compute Weighted Performance Scores & Skill vectors per member
    // Score weights:
    // - Critical Finding = 10 pts
    // - High = 7 pts
    // - Medium = 4 pts
    // - Low = 2 pts
    // - Assigned Task Resolved = +3 pts (to the task assignee)
    // - QA Review Approved = +2 pts (to the reviewer/owner)
    
    const scores: Record<number, number> = {}
    const skills: Record<number, { web: number; infra: number; cloud: number; api: number }> = {}

    // Initialize mappings
    members.forEach((m: any) => {
      scores[m.user_id] = 0
      skills[m.user_id] = { web: 0, infra: 0, cloud: 0, api: 0 }
    })

    // Process writeups for findings scores and skill classification
    writeups.forEach((w: any) => {
      const creator = w.user_id
      const reviewer = w.reviewer_id

      // Base severity scores
      let findingPoints = 0
      if (w.global_severity === 'Critical') findingPoints = 10
      else if (w.global_severity === 'High') findingPoints = 7
      else if (w.global_severity === 'Medium') findingPoints = 4
      else if (w.global_severity === 'Low') findingPoints = 2

      if (scores[creator] !== undefined) {
        scores[creator] += findingPoints
      }

      // Reviewer QA approval points (+2)
      if (reviewer && scores[reviewer] !== undefined) {
        scores[reviewer] += 2
      }

      // Map tags/CWEs to skill vectors
      if (scores[creator] !== undefined) {
        const textToAnalyze = `${w.tags || ''} ${w.cve_cwe || ''} ${w.writeup_mode || ''}`.toLowerCase()
        const skillVector = skills[creator]

        if (textToAnalyze.includes('web') || textToAnalyze.includes('http') || textToAnalyze.includes('csrf') || textToAnalyze.includes('xss') || textToAnalyze.includes('sqli') || textToAnalyze.includes('owasp')) {
          skillVector.web += findingPoints > 0 ? findingPoints : 1
        }
        if (textToAnalyze.includes('infra') || textToAnalyze.includes('network') || textToAnalyze.includes('port') || textToAnalyze.includes('ssh') || textToAnalyze.includes('active directory') || textToAnalyze.includes('smb')) {
          skillVector.infra += findingPoints > 0 ? findingPoints : 1
        }
        if (textToAnalyze.includes('cloud') || textToAnalyze.includes('aws') || textToAnalyze.includes('azure') || textToAnalyze.includes('kubernetes') || textToAnalyze.includes('docker') || textToAnalyze.includes('s3')) {
          skillVector.cloud += findingPoints > 0 ? findingPoints : 1
        }
        if (textToAnalyze.includes('api') || textToAnalyze.includes('graphql') || textToAnalyze.includes('rest') || textToAnalyze.includes('json') || textToAnalyze.includes('token')) {
          skillVector.api += findingPoints > 0 ? findingPoints : 1
        }
      }
    })

    // Process comments for Resolved Task scores (+3 pts to assignee)
    comments.forEach((c: any) => {
      if (c.is_task === 1 && c.is_resolved === 1 && c.task_assignee_id) {
        const assignee = c.task_assignee_id
        if (scores[assignee] !== undefined) {
          scores[assignee] += 3
        }
      }
    })

    // Format output payload
    const memberStats = members.map((m: any) => ({
      user_id: m.user_id,
      username: m.username,
      email: m.email,
      role: m.role,
      score: scores[m.user_id] || 0,
      skills: skills[m.user_id] || { web: 0, infra: 0, cloud: 0, api: 0 }
    }))

    // Sort leaderboard by score descending
    memberStats.sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({
      success: true,
      analytics: {
        team_id: teamId,
        leaderboard: memberStats,
        totals: {
          writeups: writeups.length,
          comments: comments.length,
          tasks: comments.filter((c: any) => c.is_task === 1).length,
          resolved_tasks: comments.filter((c: any) => c.is_task === 1 && c.is_resolved === 1).length
        }
      }
    })
  } catch (err: any) {
    console.error('[TEAM ANALYTICS ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to process team analytics' }, { status: 500 })
  }
}
