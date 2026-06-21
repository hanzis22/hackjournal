import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

import { triggerWebhooks } from '@/lib/webhook'
import { addXP, awardAchievement } from '@/lib/gamification'
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search     = searchParams.get('search')     || ''
  const difficulty = searchParams.get('difficulty') || ''
  const folderId   = searchParams.get('folder_id')
  const isStarred  = searchParams.get('is_starred')
  const startDate  = searchParams.get('start_date')
  const endDate    = searchParams.get('end_date')
  const tagsParam  = searchParams.get('tags') // comma-separated tags
  const isRegex    = searchParams.get('regex') === 'true'
  const sortBy     = searchParams.get('sort_by')    || 'created_at'
  const sortOrder  = searchParams.get('sort_order') || 'DESC'
  
  const limit      = parseInt(searchParams.get('limit') || '10')
  const page       = parseInt(searchParams.get('page') || '1')
  const offset     = (page - 1) * limit

  const scope = searchParams.get('scope') || 'personal'
  const teamIdStr = searchParams.get('team_id')

  try {
    let baseWhere = ''
    const params: any[] = []

    if (scope === 'team') {
      if (!teamIdStr) {
        return NextResponse.json({ error: 'team_id wajib disertakan untuk scope team' }, { status: 400 })
      }
      const teamId = Number(teamIdStr)
      // Wajib validasi requester adalah anggota team X sebelum query
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [teamId, payload.id]
      )
      if (memberRows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      baseWhere = ' FROM writeups WHERE team_id = ?'
      params.push(teamId)
    } else {
      baseWhere = ' FROM writeups WHERE team_id IS NULL AND user_id = ?'
      params.push(payload.id)
    }

    // 1. Difficulty filter
    if (difficulty) {
      baseWhere += ' AND difficulty = ?'
      params.push(difficulty)
    }

    // 2. Folder filter (only relevant for personal scope)
    if (scope !== 'team') {
      if (folderId === 'null') {
        baseWhere += ' AND folder_id IS NULL'
      } else if (folderId) {
        baseWhere += ' AND folder_id = ?'
        params.push(Number(folderId))
      }
    }

    // 3. Starred filter
    if (isStarred === 'true') {
      baseWhere += ' AND is_starred = 1'
    }

    // 4. Date range filter
    if (startDate && endDate) {
      baseWhere += ' AND created_at BETWEEN ? AND ?'
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`)
    }

    // 5. Multi-tag filter (match ALL tags)
    if (tagsParam) {
      const tagList = tagsParam.split(',').map(t => t.trim()).filter(Boolean)
      for (const tag of tagList) {
        baseWhere += ' AND FIND_IN_SET(?, REPLACE(tags, " ", "")) > 0'
        params.push(tag)
      }
    }

    // 6. Advanced Text Search (Support Regex or basic LIKE)
    if (search) {
      if (isRegex) {
        baseWhere += ' AND (title REGEXP ? OR tags REGEXP ? OR platform REGEXP ? OR content REGEXP ?)'
        params.push(search, search, search, search)
      } else {
        baseWhere += ' AND (title LIKE ? OR tags LIKE ? OR platform LIKE ? OR cve_id LIKE ? OR content LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total ${baseWhere}`
    const [countRows]: any = await pool.query(countQuery, params)
    const total = countRows[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    // 7. Sort options
    const allowedSortColumns = ['created_at', 'updated_at', 'title', 'difficulty', 'cve_cvss_score']
    const finalSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at'
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    const selectQuery = `SELECT id, title, platform, difficulty, tags, is_public, created_at, updated_at, writeup_mode, cve_id, cve_cvss_score, cve_cvss_severity, folder_id, is_starred, team_id, cloned_from_id, engagement_id, global_severity ${baseWhere} ORDER BY ${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`
    const selectParams = [...params, limit, offset]

    const [rows] = await pool.query(selectQuery, selectParams)
    
    return NextResponse.json({
      writeups: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (err: any) {
    console.error('[GET WRITEUPS ERROR]', err)
    return NextResponse.json({ error: err.message || 'Database query failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    
    if (!body.title)
      return NextResponse.json({ error: 'Title wajib diisi' }, { status: 400 })

    const team_id = body.team_id !== undefined && body.team_id !== null ? Number(body.team_id) : null
    const engagement_id = body.engagement_id !== undefined && body.engagement_id !== null ? Number(body.engagement_id) : null
    const global_severity = body.global_severity || 'None'

    // Validate global_severity enum values
    const allowedSeverities = ['Critical', 'High', 'Medium', 'Low', 'Info', 'None']
    if (!allowedSeverities.includes(global_severity)) {
      return NextResponse.json({ error: 'Severity rating tidak valid' }, { status: 400 })
    }

    // If team_id is provided, validate requester's role
    if (team_id !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [team_id, payload.id]
      )
      if (memberRows.length === 0 || (memberRows[0].role !== 'owner' && memberRows[0].role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Validate engagement_id ownership / team matching
    if (engagement_id !== null) {
      const [engRows]: any = await pool.query(
        'SELECT team_id, user_id FROM engagements WHERE id = ?',
        [engagement_id]
      )
      if (engRows.length === 0) {
        return NextResponse.json({ error: 'Engagement tidak ditemukan' }, { status: 404 })
      }
      const engagement = engRows[0]
      if (team_id !== null) {
        if (engagement.team_id !== team_id) {
          return NextResponse.json({ error: 'Engagement tidak cocok dengan tim' }, { status: 400 })
        }
      } else {
        if (engagement.team_id !== null || engagement.user_id !== payload.id) {
          return NextResponse.json({ error: 'Forbidden: engagement bukan milik Anda' }, { status: 403 })
        }
      }
    }

    // SEC-02: Server-side sanitization
    const title = sanitizeText(body.title)
    const platform = sanitizeText(body.platform || 'Custom')
    const difficulty = sanitizeText(body.difficulty || 'Easy')
    const tags = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitizeText(t)).join(',') : sanitizeText(body.tags || '')
    const content = sanitizeHtml(body.content || '')
    
    // Set is_public = 0 by default for team writeups
    const is_public = team_id !== null ? 0 : (body.is_public ? 1 : 0)
    
    const writeup_mode = body.writeup_mode || 'journal'
    const cve_id = sanitizeText(body.cve_id || '') || null
    const cve_product = sanitizeText(body.cve_product || '') || null
    const cve_version = sanitizeText(body.cve_version || '') || null
    const cve_cwe = sanitizeText(body.cve_cwe || '') || null
    const cve_cvss_score = body.cve_cvss_score !== undefined ? body.cve_cvss_score : null
    const cve_cvss_vector = sanitizeText(body.cve_cvss_vector || '') || null
    const cve_cvss_severity = sanitizeText(body.cve_cvss_severity || '') || null
    const cve_impact = sanitizeHtml(body.cve_impact || '')
    const cve_poc = sanitizeHtml(body.cve_poc || '')
    const cve_remediation = sanitizeHtml(body.cve_remediation || '')
    const is_encrypted = body.is_encrypted ? 1 : 0
    const encryption_salt = body.encryption_salt || null
    const encryption_iv = body.encryption_iv || null
    const attack_chain = body.attack_chain || null
    const folder_id = body.folder_id !== undefined ? body.folder_id : null
    const is_starred = body.is_starred ? 1 : 0
    const checklist_state = body.checklist_state || null

    const [result]: any = await pool.query(
      `INSERT INTO writeups (
        user_id, title, platform, difficulty, tags, content, is_public,
        writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
        cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
        cve_impact, cve_poc, cve_remediation,
        is_encrypted, encryption_salt, encryption_iv, attack_chain,
        folder_id, is_starred, checklist_state, team_id, engagement_id, global_severity
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id, title, platform, difficulty,
        tags, content, is_public,
        writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
        cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
        cve_impact, cve_poc, cve_remediation,
        is_encrypted, encryption_salt, encryption_iv, attack_chain,
        folder_id, is_starred, checklist_state, team_id, engagement_id, global_severity
      ]
    )

    // Trigger webhooks
    triggerWebhooks(payload.id, 'writeup_created', { id: (result as any).insertId, title, difficulty })

    // Gamification
    await addXP(payload.id, 50)
    await awardAchievement(payload.id, 'first_writeup')

    return NextResponse.json({ id: (result as any).insertId, message: 'Writeup berhasil disimpan' }, { status: 201 })
  } catch (err) {
    console.error('[POST WRITEUP]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
