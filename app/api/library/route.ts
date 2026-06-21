import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { generateAndStoreEmbedding, semanticSearchLibrary } from '@/lib/ai-engine'
import { sanitizeText, sanitizeHtml } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low', 'Info', 'None']

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const searchQuery = searchParams.get('query')
    const teamIdStr = searchParams.get('team_id')

    if (!teamIdStr) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    const teamId = Number(teamIdStr)
    if (isNaN(teamId) || teamId <= 0) {
      return NextResponse.json({ error: 'Invalid team_id' }, { status: 400 })
    }

    // Verify user is a member of the requested team
    const [membership]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, payload.id]
    )
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this team' }, { status: 403 })
    }

    if (searchQuery && searchQuery.trim()) {
      const matchedIds = await semanticSearchLibrary(searchQuery.trim(), teamId)
      if (matchedIds.length === 0) {
        return NextResponse.json({ findings: [] })
      }

      // Query database keeping the order of matched IDs from vector DB and filtering by team access
      // Use ORDER BY FIELD to preserve Pinecone relevance ranking
      const [rows]: any = await pool.query(
        `SELECT id, title, severity, description, remediation, created_at, team_id, is_system_template 
         FROM findings_library 
         WHERE id IN (?) AND (team_id = ? OR (team_id IS NULL AND is_system_template = 1))
         ORDER BY FIELD(id, ${matchedIds.map(() => '?').join(', ')})`,
        [matchedIds, teamId, ...matchedIds]
      )

      return NextResponse.json({ findings: rows })
    }

    // Default: Return all library items sorted by creation matching the team or system templates
    const [rows]: any = await pool.query(
      `SELECT id, title, severity, description, remediation, created_at, team_id, is_system_template 
       FROM findings_library 
       WHERE (team_id = ? OR (team_id IS NULL AND is_system_template = 1)) 
       ORDER BY created_at DESC`,
      [teamId]
    )
    return NextResponse.json({ findings: rows })
  } catch (err: any) {
    console.error('[GET LIBRARY ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to query library' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { title, severity, description, remediation, team_id } = await req.json()

    if (!title || !severity || !description || !remediation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!SEVERITY_LEVELS.includes(severity)) {
      return NextResponse.json({ error: 'Invalid severity level' }, { status: 400 })
    }

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    const targetTeamId = Number(team_id)
    if (isNaN(targetTeamId) || targetTeamId <= 0) {
      return NextResponse.json({ error: 'Invalid team_id' }, { status: 400 })
    }

    // Verify user membership in the target team
    const [membership]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [targetTeamId, payload.id]
    )
    if (membership.length === 0) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this team' }, { status: 403 })
    }

    const cleanTitle = sanitizeText(title.trim())
    const cleanSeverity = severity
    const cleanDescription = sanitizeHtml(description.trim())
    const cleanRemediation = sanitizeHtml(remediation.trim())

    // 1. Insert into MySQL to obtain the relational record ID with team_id bound
    const [result]: any = await pool.query(
      `INSERT INTO findings_library (title, severity, description, remediation, team_id, is_system_template) 
       VALUES (?, ?, ?, ?, ?, 0)`,
      [cleanTitle, cleanSeverity, cleanDescription, cleanRemediation, targetTeamId]
    )
    const newId = result.insertId

    // 2. Generate embedding and store in Vector DB
    const contentToEmbed = `${cleanTitle}\n${cleanDescription}\n${cleanRemediation}`
    await generateAndStoreEmbedding(newId, contentToEmbed, targetTeamId, false)

    return NextResponse.json(
      {
        success: true,
        finding: {
          id: newId,
          title: cleanTitle,
          severity: cleanSeverity,
          description: cleanDescription,
          remediation: cleanRemediation,
          team_id: targetTeamId,
          is_system_template: 0
        }
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[POST LIBRARY ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to save finding' }, { status: 500 })
  }
}
