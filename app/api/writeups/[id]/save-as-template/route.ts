import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getTokenFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const writeupId = Number((await params).id)
    const { name, description, team_id } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama template wajib diisi' }, { status: 400 })
    }

    // 1. Fetch writeup
    const [writeupRows]: any = await pool.query(
      'SELECT * FROM writeups WHERE id = ?',
      [writeupId]
    )

    if (writeupRows.length === 0) {
      return NextResponse.json({ error: 'Writeup tidak ditemukan' }, { status: 404 })
    }

    const writeup = writeupRows[0]

    // 2. Validate read access to writeup
    if (writeup.team_id !== null) {
      // Team writeup: check if user is a member of the team
      const [teamMember]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [writeup.team_id, user.id]
      )
      if (teamMember.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // Personal writeup: user must be the owner
      if (writeup.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 3. Validate destination team role if team_id is supplied
    let targetTeamId: number | null = null
    if (team_id) {
      targetTeamId = Number(team_id)

      const [teamCheck]: any = await pool.query(
        `SELECT t.is_archived, tm.role 
         FROM teams t 
         JOIN team_members tm ON t.id = tm.team_id 
         WHERE t.id = ? AND tm.user_id = ?`,
        [targetTeamId, user.id]
      )

      if (teamCheck.length === 0 || (teamCheck[0].role !== 'owner' && teamCheck[0].role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden: insufficient privileges to create team templates' }, { status: 403 })
      }

      if (teamCheck[0].is_archived === 1) {
        return NextResponse.json({ error: 'Team is archived' }, { status: 400 })
      }
    }

    // 4. Construct template data JSON
    const templateData = {
      title: writeup.title,
      platform: writeup.platform,
      difficulty: writeup.difficulty,
      tags: writeup.tags,
      content: writeup.content || '',
      writeup_mode: writeup.writeup_mode,
      cve_id: writeup.cve_id,
      cve_product: writeup.cve_product,
      cve_version: writeup.cve_version,
      cve_cwe: writeup.cve_cwe,
      cve_cvss_score: writeup.cve_cvss_score,
      cve_cvss_vector: writeup.cve_cvss_vector,
      cve_cvss_severity: writeup.cve_cvss_severity,
      cve_impact: writeup.cve_impact,
      cve_poc: writeup.cve_poc,
      cve_remediation: writeup.cve_remediation,
      attack_chain: writeup.attack_chain,
      checklist_state: writeup.checklist_state,
      network_diagram: writeup.network_diagram,
      global_severity: writeup.global_severity
    }

    // 5. Insert template
    const [result]: any = await pool.query(
      `INSERT INTO templates (user_id, name, description, writeup_mode, template_data, is_builtin, team_id) 
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        user.id,
        name.trim(),
        description || '',
        writeup.writeup_mode || 'journal',
        JSON.stringify(templateData),
        targetTeamId
      ]
    )

    return NextResponse.json({ success: true, id: result.insertId, message: 'Template berhasil disimpan!' }, { status: 201 })
  } catch (err: any) {
    console.error('[SAVE AS TEMPLATE ERROR]', err)
    return NextResponse.json({ error: 'Failed to save writeup as template' }, { status: 500 })
  }
}
