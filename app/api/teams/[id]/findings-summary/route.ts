import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

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

    // 1. Validate team membership
    const [memberRows]: any = await pool.query(
      'SELECT role, team_id FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, payload.id]
    )
    if (memberRows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch team writeups
    const [writeups]: any = await pool.query(
      'SELECT global_severity, writeup_mode, cve_cvss_severity FROM writeups WHERE team_id = ?',
      [teamId]
    )

    // 3. Aggregate severities
    const counts: Record<string, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
      None: 0
    }

    for (const w of writeups) {
      let sev = w.global_severity
      // Fallback: If global_severity is 'None' or empty, use cve_cvss_severity for CVE entries
      if ((!sev || sev === 'None') && w.writeup_mode === 'cve' && w.cve_cvss_severity) {
        // Normalize titlecase mapping
        let cvssSev = w.cve_cvss_severity.trim()
        cvssSev = cvssSev.charAt(0).toUpperCase() + cvssSev.slice(1).toLowerCase()
        if (['Critical', 'High', 'Medium', 'Low', 'Info'].includes(cvssSev)) {
          sev = cvssSev
        }
      }
      const normalized = sev || 'None'
      if (counts.hasOwnProperty(normalized)) {
        counts[normalized]++
      } else {
        counts['None']++
      }
    }

    return NextResponse.json({ counts })
  } catch (err: any) {
    console.error('[GET TEAM FINDINGS SUMMARY ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
