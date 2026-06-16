import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { triggerWebhooks } from '@/lib/webhook'
import { addXP, awardAchievement } from '@/lib/gamification'

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

  try {
    let query = 'SELECT id, title, platform, difficulty, tags, is_public, created_at, updated_at, writeup_mode, cve_id, cve_cvss_score, cve_cvss_severity, folder_id, is_starred FROM writeups WHERE user_id = ?'
    const params: any[] = [payload.id]

    // 1. Difficulty filter
    if (difficulty) {
      query += ' AND difficulty = ?'
      params.push(difficulty)
    }

    // 2. Folder filter
    if (folderId === 'null') {
      query += ' AND folder_id IS NULL'
    } else if (folderId) {
      query += ' AND folder_id = ?'
      params.push(Number(folderId))
    }

    // 3. Starred filter
    if (isStarred === 'true') {
      query += ' AND is_starred = 1'
    }

    // 4. Date range filter
    if (startDate && endDate) {
      query += ' AND created_at BETWEEN ? AND ?'
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`)
    }

    // 5. Multi-tag filter (match ALL tags)
    if (tagsParam) {
      const tagList = tagsParam.split(',').map(t => t.trim()).filter(Boolean)
      for (const tag of tagList) {
        query += ' AND FIND_IN_SET(?, REPLACE(tags, " ", "")) > 0'
        params.push(tag)
      }
    }

    // 6. Advanced Text Search (Support Regex or basic LIKE)
    if (search) {
      if (isRegex) {
        query += ' AND (title REGEXP ? OR tags REGEXP ? OR platform REGEXP ? OR content REGEXP ?)'
        params.push(search, search, search, search)
      } else {
        query += ' AND (title LIKE ? OR tags LIKE ? OR platform LIKE ? OR cve_id LIKE ? OR content LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }
    }

    // 7. Sort options
    const allowedSortColumns = ['created_at', 'updated_at', 'title', 'difficulty', 'cve_cvss_score']
    const finalSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at'
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    query += ` ORDER BY ${finalSortBy} ${finalSortOrder}`

    const [rows] = await pool.query(query, params)
    return NextResponse.json({ writeups: rows })
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
    const {
      title, platform, difficulty, tags, content, is_public,
      writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
      cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
      cve_impact, cve_poc, cve_remediation,
      is_encrypted, encryption_salt, encryption_iv, attack_chain,
      folder_id, is_starred, checklist_state
    } = await req.json()
    
    if (!title)
      return NextResponse.json({ error: 'Title wajib diisi' }, { status: 400 })

    const [result]: any = await pool.query(
      `INSERT INTO writeups (
        user_id, title, platform, difficulty, tags, content, is_public,
        writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
        cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
        cve_impact, cve_poc, cve_remediation,
        is_encrypted, encryption_salt, encryption_iv, attack_chain,
        folder_id, is_starred, checklist_state
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id, title, platform || 'Custom', difficulty || 'Easy',
        Array.isArray(tags) ? tags.join(',') : tags, content || '', is_public ? 1 : 0,
        writeup_mode || 'journal', cve_id || null, cve_product || null, cve_version || null, cve_cwe || null,
        cve_cvss_score !== undefined ? cve_cvss_score : null, cve_cvss_vector || null, cve_cvss_severity || null,
        cve_impact || '', cve_poc || '', cve_remediation || '',
        is_encrypted ? 1 : 0, encryption_salt || null, encryption_iv || null, attack_chain || null,
        folder_id !== undefined ? folder_id : null, is_starred ? 1 : 0, checklist_state || null
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
