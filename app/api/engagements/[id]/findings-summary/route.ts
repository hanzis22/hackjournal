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
    const engId = Number((await params).id)

    // 1. Fetch engagement details
    const [engRows]: any = await pool.query(
      'SELECT id, team_id, user_id FROM engagements WHERE id = ?',
      [engId]
    )

    if (engRows.length === 0) {
      return NextResponse.json({ error: 'Engagement tidak ditemukan' }, { status: 404 })
    }

    const engagement = engRows[0]

    // Access check
    if (engagement.team_id !== null) {
      const [memberRows]: any = await pool.query(
        'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
        [engagement.team_id, payload.id]
      )
      if (memberRows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (engagement.user_id !== payload.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 2. Fetch linked writeups
    const [writeups]: any = await pool.query(
      'SELECT global_severity, writeup_mode, cve_cvss_severity FROM writeups WHERE engagement_id = ?',
      [engId]
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
    console.error('[GET ENGAGEMENT FINDINGS SUMMARY ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
