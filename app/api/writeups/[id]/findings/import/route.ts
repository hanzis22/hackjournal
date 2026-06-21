import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

async function getWriteupWithAccess(id: number, userId: number) {
  const [rows]: any = await pool.query('SELECT * FROM writeups WHERE id = ?', [id])
  const writeup = (rows as any[])[0] || null
  if (!writeup) return null

  if (writeup.team_id === null) {
    if (writeup.user_id !== userId) return null
    return { writeup, role: 'owner' }
  }

  const [memberRows]: any = await pool.query(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
    [writeup.team_id, userId]
  )
  if (memberRows.length === 0) {
    return null
  }
  return { writeup, role: memberRows[0].role }
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
    const writeupId = Number((await params).id)
    const access = await getWriteupWithAccess(writeupId, payload.id)
    if (!access) {
      return NextResponse.json({ error: 'Writeup not found or access denied' }, { status: 404 })
    }

    const { writeup, role } = access
    if (role !== 'owner' && role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 })
    }

    // Lock check: if writeup is locked (in review, approved, completed), prevent imports
    if (['in_review', 'approved', 'completed'].includes(writeup.status || 'draft')) {
      return NextResponse.json({ error: 'Cannot modify a writeup that is locked in review or completed' }, { status: 403 })
    }

    const { library_id } = await req.json()
    if (!library_id) {
      return NextResponse.json({ error: 'library_id is required' }, { status: 400 })
    }

    const [libRows]: any = await pool.query(
      'SELECT * FROM findings_library WHERE id = ?',
      [Number(library_id)]
    )
    if (libRows.length === 0) {
      return NextResponse.json({ error: 'Findings library entry not found' }, { status: 404 })
    }
    const findingTemplate = libRows[0]

    // Create a link in the mappings table
    await pool.query(
      'INSERT INTO writeups_findings_mapping (writeup_id, finding_library_id) VALUES (?, ?)',
      [writeupId, findingTemplate.id]
    )

    if (writeup.writeup_mode === 'cve') {
      // In CVE mode, map fields directly to cve_ columns
      const updatedImpact = (writeup.cve_impact || '') + 
        (writeup.cve_impact ? '<br/><br/>' : '') + 
        `<h4>${findingTemplate.title}</h4>\n${findingTemplate.description}`

      const updatedRemediation = (writeup.cve_remediation || '') + 
        (writeup.cve_remediation ? '<br/><br/>' : '') + 
        `${findingTemplate.remediation}`

      // Update writeup severity to match the imported finding severity if higher
      const severityMap: { [key: string]: number } = { 'None': 0, 'Info': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Critical': 5 }
      const templateSevVal = severityMap[findingTemplate.severity] || 0
      const currentSevVal = severityMap[writeup.global_severity] || 0
      const newSeverity = templateSevVal > currentSevVal ? findingTemplate.severity : writeup.global_severity

      await pool.query(
        `UPDATE writeups SET 
          cve_impact = ?, 
          cve_remediation = ?, 
          global_severity = ?, 
          cve_cvss_severity = ?,
          updated_at = NOW() 
         WHERE id = ?`,
        [updatedImpact, updatedRemediation, newSeverity, newSeverity, writeupId]
      )
    } else {
      // In Journal mode, append to the main html content column
      const appendedHtml = `${writeup.content || ''}
        <div class="imported-finding" style="border-left: 3px solid #7F77DD; padding-left: 12px; margin: 16px 0;">
          <h3>🔍 ${findingTemplate.title} (${findingTemplate.severity})</h3>
          <p><strong>Description:</strong></p>
          <div>${findingTemplate.description}</div>
          <p><strong>Remediation:</strong></p>
          <div>${findingTemplate.remediation}</div>
        </div>`

      await pool.query(
        'UPDATE writeups SET content = ?, updated_at = NOW() WHERE id = ?',
        [appendedHtml, writeupId]
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported finding: "${findingTemplate.title}"`
    })
  } catch (err: any) {
    console.error('[IMPORT TO WRITEUP ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to import finding template' }, { status: 500 })
  }
}
